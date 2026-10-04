//! Diagrama Mermaid (sequência) de um cálculo selado.
//!
//! Porta fiel de `_REF/src/output_internal/mermaid_sequence_renderer.ts`:
//! percorre a AST em ordem cronológica, agrupa ingestões consecutivas, trata
//! nós de controle (transferência entre contextos), redige PII, formata
//! timestamps e localiza os rótulos via [`MermaidTerms`].

use std::cmp::Reverse;
use std::fmt::Write;

use calc_auy_core::{FlatAst, MetaValue, Metadata, NodeData, NodeId, OperationType};

use crate::options::MermaidTerms;
use crate::output::Output;

/// Política de privacidade aplicada a um nó.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Privacy {
    /// Literais e metadados são redigidos.
    Redacted,
    /// Valores são exibidos.
    Visible,
}

impl Privacy {
    /// Retorna `true` quando o valor deve ser redigido.
    const fn is_redacted(self) -> bool {
        matches!(self, Self::Redacted)
    }
}

/// Evento do diagrama.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Event {
    /// Nota sobre um participante.
    Note { context: String, message: String },
    /// Transferência de custódia entre contextos.
    Transition {
        from: String,
        context: String,
        message: String,
    },
    /// Auto-chamada de operação.
    Action {
        context: String,
        message: String,
        metadata: String,
    },
}

/// Literal aguardando *flush* (agrupamento de ingestões consecutivas).
#[derive(Debug, Clone)]
struct BufferedLiteral {
    /// Texto ingerido (já redigido, se PII).
    input: String,
    /// Timestamp formatado (vazio se ausente).
    timestamp: String,
    /// Linhas de metadados do usuário.
    user_meta: Vec<String>,
}

/// Contexto comum de um nó durante a varredura.
#[derive(Debug, Clone)]
struct NodeContext {
    /// Contexto (participante) corrente.
    context: String,
    /// Profundidade do nó.
    depth: usize,
    /// Timestamp formatado (vazio se ausente/raiz).
    timestamp: String,
    /// Linhas de metadados do usuário.
    user_meta: Vec<String>,
}

/// Sanitiza um rótulo para uso como identificador Mermaid.
fn get_alias(name: &str) -> String {
    let mut alias = String::with_capacity(name.len().saturating_add(4));
    alias.push_str("Ctx_");
    for character in name.chars() {
        if character.is_ascii_alphanumeric() {
            alias.push(character);
        } else {
            alias.push('_');
        }
    }
    alias
}

/// Trunca um texto longo no estilo da referência (`>25` → `22...`).
fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() > max {
        let head: String = text.chars().take(max.saturating_sub(3)).collect();
        format!("{head}...")
    } else {
        text.to_string()
    }
}

/// Lê uma string de metadata.
fn meta_str<'a>(metadata: &'a Metadata, key: &str) -> Option<&'a str> {
    match metadata.get(key)? {
        MetaValue::Str(value) => Some(value.as_str()),
        _ => None,
    }
}

/// Lê um booleano de metadata.
fn meta_bool(metadata: &Metadata, key: &str) -> Option<bool> {
    match metadata.get(key)? {
        MetaValue::Bool(value) => Some(*value),
        _ => None,
    }
}

/// Verifica se uma chave de metadata é de sistema.
fn is_system_key(key: &str) -> bool {
    matches!(
        key,
        "timestamp"
            | "pii"
            | "previousContextLabel"
            | "previousSignature"
            | "previousRoundStrategy"
    )
}

/// Formata um timestamp ISO-8601 como `yy-MM-dd HH:mm (UTC)`.
fn format_time(iso: &str) -> String {
    let Some((date, time)) = iso.split_once('T') else {
        return String::new();
    };
    let mut date_parts = date.split('-');
    let (Some(year), Some(month), Some(day)) =
        (date_parts.next(), date_parts.next(), date_parts.next())
    else {
        return String::new();
    };
    let mut time_parts = time.split(':');
    let (Some(hour), Some(minute)) = (time_parts.next(), time_parts.next()) else {
        return String::new();
    };
    if month.len() != 2 || day.len() != 2 || hour.len() != 2 || minute.len() != 2 {
        return String::new();
    }
    let Some(short_year) = year.get(2..) else {
        return String::new();
    };
    format!("{short_year}-{month}-{day} {hour}:{minute} (UTC)")
}

/// Serializa um valor de metadata para exibição.
fn stringify(value: &MetaValue) -> String {
    match value {
        MetaValue::Null => "null".to_string(),
        MetaValue::Bool(flag) => flag.to_string(),
        MetaValue::Int(number) => number.to_string(),
        MetaValue::Uint(number) => number.to_string(),
        MetaValue::Str(text) => text.clone(),
        MetaValue::Array(_) | MetaValue::Object(_) => String::new(),
    }
}

/// Prefixo de timestamp de uma nota/ação.
fn time_prefix(timestamp: &str) -> String {
    if timestamp.is_empty() {
        String::new()
    } else {
        format!("{timestamp}<br/>")
    }
}

/// Formata uma linha de literal agrupado.
fn literal_line(literal: &BufferedLiteral) -> String {
    let value = truncate(&literal.input, 25);
    if literal.user_meta.is_empty() {
        format!("• {value}")
    } else {
        format!("• {value} {}", literal.user_meta.join(" "))
    }
}

/// Monta uma mensagem com valor e metadados opcionais.
fn annotated(prefix: &str, label: &str, value: &str, user_meta: &[String]) -> String {
    let mut message = format!("{prefix}{label}: {value}");
    if !user_meta.is_empty() {
        message.push_str("<br/>");
        message.push_str(&user_meta.join("<br/>"));
    }
    message
}

/// Renderizador com estado acumulado.
struct MermaidRenderer<'a> {
    ast: &'a FlatAst,
    terms: MermaidTerms,
    default_privacy: Privacy,
    events: Vec<Event>,
    depths: Vec<(String, usize)>,
    literals: Vec<BufferedLiteral>,
}

impl<'a> MermaidRenderer<'a> {
    /// Cria o renderizador.
    const fn new(ast: &'a FlatAst, terms: &MermaidTerms, default_privacy: Privacy) -> Self {
        Self {
            ast,
            terms: *terms,
            default_privacy,
            events: Vec::new(),
            depths: Vec::new(),
            literals: Vec::new(),
        }
    }

    /// Atualiza a profundidade máxima de um participante.
    fn update_depth(&mut self, context: &str, depth: usize) {
        if let Some(entry) = self.depths.iter_mut().find(|(name, _)| name == context) {
            entry.1 = entry.1.max(depth);
        } else {
            self.depths.push((context.to_string(), depth));
        }
    }

    /// Determina a política de privacidade de um nó.
    fn node_privacy(&self, metadata: Option<&Metadata>) -> Privacy {
        match metadata.and_then(|meta| meta_bool(meta, "pii")) {
            Some(true) => Privacy::Redacted,
            Some(false) => Privacy::Visible,
            None => self.default_privacy,
        }
    }

    /// Determina o timestamp formatado de um nó (ignorado na raiz).
    fn node_timestamp(&self, id: NodeId, metadata: Option<&Metadata>) -> String {
        if id == self.ast.root() {
            return String::new();
        }
        metadata
            .and_then(|meta| meta_str(meta, "timestamp"))
            .map(format_time)
            .unwrap_or_default()
    }

    /// Formata um valor de metadata para exibição.
    fn display_value(&self, value: &MetaValue, privacy: Privacy) -> String {
        if privacy.is_redacted() {
            return "[PII]".to_string();
        }
        match value {
            MetaValue::Array(items) => self
                .terms
                .list_template
                .replace("{n}", &items.len().to_string()),
            MetaValue::Object(_) => self.terms.object_label.to_string(),
            other => truncate(&stringify(other), 25),
        }
    }

    /// Extrai as linhas de metadados do usuário (excluindo chaves de sistema).
    fn user_metadata(&self, metadata: &Metadata, privacy: Privacy) -> Vec<String> {
        metadata
            .iter()
            .filter_map(|(key, value)| self.metadata_line(key, value, privacy))
            .collect()
    }

    /// Formata uma linha de metadado, omitindo chaves de sistema.
    fn metadata_line(&self, key: &str, value: &MetaValue, privacy: Privacy) -> Option<String> {
        if is_system_key(key) {
            return None;
        }
        Some(format!("[{key}: {}]", self.display_value(value, privacy)))
    }

    /// Descarrega o buffer de literais em uma nota (agrupando consecutivos).
    fn flush_literals(&mut self, context: &str) {
        if self.literals.is_empty() {
            return;
        }
        let message = if self.literals.len() == 1 {
            self.single_literal_message()
        } else {
            self.grouped_literals_message()
        };
        self.events.push(Event::Note {
            context: context.to_string(),
            message,
        });
        self.literals.clear();
    }

    /// Mensagem de uma ingestão única.
    fn single_literal_message(&self) -> String {
        let Some(literal) = self.literals.first() else {
            return String::new();
        };
        let prefix = time_prefix(&literal.timestamp);
        let ingestion = self.terms.ingestion;
        let mut message = format!("{prefix}{ingestion}: {}", literal.input);
        if !literal.user_meta.is_empty() {
            message.push_str("<br/>");
            message.push_str(&literal.user_meta.join("<br/>"));
        }
        message
    }

    /// Mensagem de ingestões agrupadas.
    fn grouped_literals_message(&self) -> String {
        let time_prefix = self
            .literals
            .first()
            .map(|literal| literal.timestamp.as_str())
            .filter(|timestamp| !timestamp.is_empty())
            .map_or_else(String::new, |timestamp| format!("{timestamp}<br/>"));
        let lines: Vec<String> = self.literals.iter().map(literal_line).collect();
        let operands = self.terms.ingestion_operands;
        format!("{time_prefix}{operands}:<br/>{}", lines.join("<br/>"))
    }

    /// Percorre a AST acumulando eventos.
    fn walk(&mut self, id: NodeId, context: &str, depth: usize) {
        self.update_depth(context, depth);
        let metadata = self.ast.metadata(id);
        let privacy = self.node_privacy(metadata);
        let node = NodeContext {
            context: context.to_string(),
            depth,
            timestamp: self.node_timestamp(id, metadata),
            user_meta: metadata
                .map(|meta| self.user_metadata(meta, privacy))
                .unwrap_or_default(),
        };

        let Some(data) = self.ast.node(id).cloned() else {
            return;
        };
        match data {
            NodeData::Control {
                child,
                previous_context_label,
                previous_signature,
                ..
            } => self.walk_control(&node, child, &previous_context_label, &previous_signature),
            NodeData::Operation { op, operands } => self.walk_operation(&node, op, &operands),
            NodeData::Group { child } => self.walk(child, context, depth),
            NodeData::Literal { original_input, .. } => {
                self.push_literal(&original_input, privacy, node.timestamp, node.user_meta);
            }
        }
    }

    /// Processa um nó de controle (transferência de contexto).
    fn walk_control(
        &mut self,
        node: &NodeContext,
        child: NodeId,
        previous_context_label: &str,
        previous_signature: &str,
    ) {
        self.flush_literals(&node.context);
        let previous_context = if previous_context_label.is_empty() {
            "Unknown".to_string()
        } else {
            previous_context_label.to_string()
        };
        let previous_signature = if previous_signature.is_empty() {
            "No Signature".to_string()
        } else {
            previous_signature.to_string()
        };
        self.walk(child, &previous_context, node.depth.saturating_add(1));
        self.flush_literals(&previous_context);
        let signature_prefix: String = previous_signature.chars().take(8).collect();
        let handover = self.terms.handover;
        self.events.push(Event::Transition {
            from: previous_context,
            context: node.context.clone(),
            message: format!("{handover} (Sig: {signature_prefix}...)"),
        });
        self.events.push(Event::Note {
            context: node.context.clone(),
            message: annotated(
                &time_prefix(&node.timestamp),
                self.terms.event,
                "reanimation_event",
                &node.user_meta,
            ),
        });
    }

    /// Processa um nó de operação.
    fn walk_operation(&mut self, node: &NodeContext, op: OperationType, operands: &[NodeId]) {
        for child in operands {
            self.walk(*child, &node.context, node.depth);
        }
        self.flush_literals(&node.context);
        let prefix = time_prefix(&node.timestamp);
        let operation = self.terms.operation;
        self.events.push(Event::Action {
            context: node.context.clone(),
            message: format!("{prefix}{operation}: {}", op.as_str()),
            metadata: node.user_meta.join("<br/>"),
        });
    }

    /// Adiciona um literal ao buffer.
    fn push_literal(
        &mut self,
        original_input: &str,
        privacy: Privacy,
        timestamp: String,
        user_meta: Vec<String>,
    ) {
        let input = if privacy.is_redacted() {
            "[REDACTED]".to_string()
        } else {
            original_input.to_string()
        };
        self.literals.push(BufferedLiteral {
            input,
            timestamp,
            user_meta,
        });
    }

    /// Serializa os eventos no DSL Mermaid.
    fn render(&self) -> String {
        let mut dsl = String::from("sequenceDiagram\n    autonumber\n");
        self.render_participants(&mut dsl);
        let mut active: Vec<String> = Vec::new();
        for event in &self.events {
            render_event(&mut dsl, &mut active, event);
        }
        for alias in &active {
            let _ = writeln!(dsl, "    deactivate {alias}");
        }
        dsl
    }

    /// Escreve a lista de participantes ordenada por profundidade.
    fn render_participants(&self, dsl: &mut String) {
        let mut participants: Vec<&(String, usize)> = self.depths.iter().collect();
        participants.sort_by_key(|(_, depth)| Reverse(*depth));
        let context = self.terms.context;
        for (name, _) in &participants {
            let alias = get_alias(name);
            let _ = writeln!(dsl, "    participant {alias} as {context}: {name}");
        }
        dsl.push('\n');
    }
}

/// Escreve um evento.
fn render_event(dsl: &mut String, active: &mut Vec<String>, event: &Event) {
    match event {
        Event::Note { context, message } => note(dsl, active, context, message),
        Event::Action {
            context,
            message,
            metadata,
        } => action(dsl, active, context, message, metadata),
        Event::Transition {
            from,
            context,
            message,
        } => transition(dsl, active, from, context, message),
    }
}

/// Ativa um participante, se ainda não estiver ativo.
fn activate(dsl: &mut String, active: &mut Vec<String>, alias: &str) {
    if !active.iter().any(|name| name == alias) {
        let _ = writeln!(dsl, "    activate {alias}");
        active.push(alias.to_string());
    }
}

/// Escreve uma nota.
fn note(dsl: &mut String, active: &mut Vec<String>, context: &str, message: &str) {
    let alias = get_alias(context);
    activate(dsl, active, &alias);
    let _ = writeln!(dsl, "    Note over {alias}: {message}");
}

/// Escreve uma ação (auto-chamada).
fn action(
    dsl: &mut String,
    active: &mut Vec<String>,
    context: &str,
    message: &str,
    metadata: &str,
) {
    let alias = get_alias(context);
    activate(dsl, active, &alias);
    if metadata.is_empty() {
        let _ = writeln!(dsl, "    {alias}->>{alias}: {message}");
    } else {
        let _ = writeln!(dsl, "    {alias}->>{alias}: {message}<br/>{metadata}");
    }
}

/// Escreve uma transferência de contexto.
fn transition(
    dsl: &mut String,
    active: &mut Vec<String>,
    from: &str,
    context: &str,
    message: &str,
) {
    let alias = get_alias(context);
    let from_alias = get_alias(from);
    activate(dsl, active, &alias);
    activate(dsl, active, &from_alias);
    let _ = writeln!(dsl, "    {from_alias}->>+{alias}: {message}");
    let _ = writeln!(dsl, "    deactivate {from_alias}");
    active.retain(|name| name != &from_alias);
}

impl Output<'_> {
    /// Gera um diagrama de sequência Mermaid do cálculo.
    ///
    /// Usa a localidade e o rótulo de contexto das [`OutputOptions`] e a
    /// assinatura do *commit* para o nó de fechamento. PII é redigida quando
    /// [`OutputOptions::is_sensitive`](crate::OutputOptions::is_sensitive) é
    /// `true` (padrão) e o nó não declara `pii: false`.
    ///
    /// [`OutputOptions`]: crate::OutputOptions
    #[must_use]
    pub fn to_mermaid_graph(&self) -> String {
        Self::cached(&self.mermaid, || self.render_mermaid_graph())
    }

    /// Renderiza o diagrama sem cache.
    fn render_mermaid_graph(&self) -> String {
        let options = self.options();
        let terms = options.mermaid_terms();
        let context_label = options
            .context_label
            .clone()
            .unwrap_or_else(|| "default".to_string());
        let signature = self.committed().signature().hex();
        let ast = &self.committed().payload().ast;
        let privacy = if options.is_sensitive() {
            Privacy::Redacted
        } else {
            Privacy::Visible
        };

        let mut renderer = MermaidRenderer::new(ast, &terms, privacy);
        renderer.walk(ast.root(), &context_label, 0);
        renderer.flush_literals(&context_label);

        let root_time = ast
            .metadata(ast.root())
            .and_then(|meta| meta_str(meta, "timestamp"))
            .map(format_time)
            .unwrap_or_default();
        let signature_prefix: String = signature.chars().take(8).collect();
        let closing = terms.closing;
        let signature_label = terms.signature;
        renderer.events.push(Event::Note {
            context: context_label,
            message: format!(
                "{root_time}<br/>{closing}<br/>{signature_label}: (Sig: {signature_prefix}...)"
            ),
        });

        renderer.render()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_labels() {
        assert_eq!(get_alias("finance-v2"), "Ctx_finance_v2");
        assert_eq!(get_alias("a b"), "Ctx_a_b");
    }

    #[test]
    fn formats_iso_timestamp() {
        assert_eq!(
            format_time("2026-05-03T13:39:49.029Z"),
            "26-05-03 13:39 (UTC)"
        );
        assert_eq!(format_time("not-a-date"), "");
    }

    #[test]
    fn truncates_long_values() {
        assert_eq!(truncate("short", 25), "short");
        assert_eq!(truncate("123456789012345678901234567890", 25).len(), 25);
    }
}
