//! Diagrama Mermaid (sequência) de um cálculo selado.

use std::fmt::Write;

use calc_auy_core::{FlatAst, NodeData, NodeId};

use crate::output::Output;

/// Evento do diagrama.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Event {
    /// Ingestão de um literal.
    Ingest(String),
    /// Operação aplicada.
    Operation(String),
}

/// Sanitiza um rótulo para uso como identificador Mermaid.
fn sanitize(label: &str) -> String {
    label
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '_'
            }
        })
        .collect()
}

/// Percorre a AST coletando eventos em ordem pós-fixa.
fn walk(ast: &FlatAst, id: NodeId, events: &mut Vec<Event>) {
    match ast.node(id) {
        Some(NodeData::Literal { original_input, .. }) => {
            events.push(Event::Ingest(original_input.to_string()));
        }
        Some(NodeData::Group { child } | NodeData::Control { child, .. }) => {
            walk(ast, *child, events);
        }
        Some(NodeData::Operation { op, operands }) => {
            for child in operands {
                walk(ast, *child, events);
            }
            events.push(Event::Operation(op.as_str().to_string()));
        }
        None => {}
    }
}

/// Formata uma linha de evento.
fn event_line(participant: &str, event: &Event) -> String {
    match event {
        Event::Ingest(text) => format!("    Note over {participant}: Ingestão: {text}\n"),
        Event::Operation(op) => format!("    {participant}->>{participant}: Operação: {op}\n"),
    }
}

impl Output<'_> {
    /// Gera um diagrama de sequência Mermaid do cálculo.
    #[must_use]
    pub fn to_mermaid_graph(&self) -> String {
        let ast = &self.committed().payload().ast;
        let label = self
            .options()
            .context_label
            .clone()
            .unwrap_or_else(|| "default".to_string());
        let participant = format!("Ctx_{}", sanitize(&label));

        let mut events = Vec::new();
        walk(ast, ast.root(), &mut events);

        let mut out = String::new();
        let _ = writeln!(out, "sequenceDiagram");
        let _ = writeln!(out, "    autonumber");
        let _ = writeln!(out, "    participant {participant} as Contexto: {label}");
        let _ = writeln!(out, "    activate {participant}");
        for event in &events {
            out.push_str(&event_line(&participant, event));
        }
        let _ = writeln!(
            out,
            "    Note over {participant}: Fechamento e Assinatura Final"
        );
        let _ = writeln!(out, "    deactivate {participant}");
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_labels() {
        assert_eq!(sanitize("finance-v2"), "finance_v2");
        assert_eq!(sanitize("a b"), "a_b");
    }
}
