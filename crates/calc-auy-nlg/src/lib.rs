//! NLG: representação semântica (SRL) e trait de realização linguística.
//!
//! A SRL é independente de idioma; os realizers ([`VerbalRealizer`]) fazem a
//! realização. A gramática é código, o léxico é dado (ADR-011). As
//! implementações linguísticas completas ficam em `calc-auy-i18n`; aqui moram o
//! *seam*, o léxico de números e os auxiliares de composição.

use calc_auy_core::OperationType;

pub mod number;

pub use number::{
    Gender, NumberWords, ScaleWord, decimal_text_to_words, digits_to_words, integer_to_words,
    literal_text_to_words, select_scale, split_groups, triple_to_words, two_digits_to_words,
};

/// Nó da representação semântica de uma expressão.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SrlNode {
    /// Valor literal com o texto original.
    Literal(String),
    /// Agrupamento lógico.
    Group(Box<Self>),
    /// Nó de controle (custódia).
    Control(Box<Self>),
    /// Operação com operandos.
    Operation {
        /// Tipo da operação.
        op: OperationType,
        /// Operandos.
        operands: Vec<Self>,
    },
}

/// Coleta literais dos operandos de uma operação.
fn collect_operand_literals<'a>(operands: &'a [SrlNode], out: &mut Vec<&'a str>) {
    for operand in operands {
        operand.collect_literals(out);
    }
}

/// Coleta operações dos operandos de uma operação.
fn collect_operand_operations(operands: &[SrlNode], out: &mut Vec<OperationType>) {
    for operand in operands {
        operand.collect_operations(out);
    }
}

impl SrlNode {
    /// Coleta os literais na ordem de leitura.
    #[must_use]
    pub fn literals(&self) -> Vec<&str> {
        let mut out = Vec::new();
        self.collect_literals(&mut out);
        out
    }

    /// Coleta os tipos de operação na ordem de leitura.
    #[must_use]
    pub fn operations(&self) -> Vec<OperationType> {
        let mut out = Vec::new();
        self.collect_operations(&mut out);
        out
    }

    /// Retorna `true` se algum literal contém `needle`.
    #[must_use]
    pub fn contains_literal(&self, needle: &str) -> bool {
        self.literals()
            .iter()
            .any(|literal| literal.contains(needle))
    }

    /// Acumula literais recursivamente.
    fn collect_literals<'a>(&'a self, out: &mut Vec<&'a str>) {
        match self {
            Self::Literal(text) => out.push(text),
            Self::Group(inner) | Self::Control(inner) => inner.collect_literals(out),
            Self::Operation { operands, .. } => collect_operand_literals(operands, out),
        }
    }

    /// Acumula operações recursivamente.
    fn collect_operations(&self, out: &mut Vec<OperationType>) {
        match self {
            Self::Literal(_) => {}
            Self::Group(inner) | Self::Control(inner) => inner.collect_operations(out),
            Self::Operation { op, operands } => {
                out.push(*op);
                collect_operand_operations(operands, out);
            }
        }
    }
}

/// Representação semântica completa de um cálculo selado.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Srl {
    /// Expressão.
    pub expression: SrlNode,
    /// Resultado já formatado (ponto canônico).
    pub result: String,
    /// Nome estável da estratégia de arredondamento.
    pub round_strategy: String,
    /// Número de casas decimais.
    pub decimals: u32,
}

/// Realizador linguístico: traduz uma [`Srl`] em texto.
pub trait VerbalRealizer {
    /// Realiza a SRL em linguagem natural.
    fn realize(&self, srl: &Srl) -> String;

    /// Retorna o código BCP-47 do idioma.
    fn language(&self) -> &'static str;
}

/// Conectivos de operação de uma língua.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Connectors {
    /// Adição.
    pub add: &'static str,
    /// Subtração.
    pub sub: &'static str,
    /// Multiplicação.
    pub mul: &'static str,
    /// Divisão.
    pub div: &'static str,
    /// Prefixo da potenciação.
    pub pow_prefix: &'static str,
    /// Sufixo da potenciação.
    pub pow_suffix: &'static str,
    /// Resto.
    pub modulo: &'static str,
    /// Divisão inteira.
    pub div_int: &'static str,
    /// Adição entre contextos.
    pub cross_context_add: &'static str,
}

impl Connectors {
    /// Retorna o conectivo de uma operação.
    #[must_use]
    pub const fn for_op(&self, op: OperationType) -> &'static str {
        match op {
            OperationType::Sub => self.sub,
            OperationType::Mul => self.mul,
            OperationType::Div => self.div,
            OperationType::Pow => self.pow_prefix,
            OperationType::Mod => self.modulo,
            OperationType::DivInt => self.div_int,
            OperationType::CrossContextAdd => self.cross_context_add,
            _ => self.add,
        }
    }
}

/// Gramática de realização: função de escrita numérica + conectivos +
/// delimitadores de grupo + frases de raiz.
#[derive(Debug, Clone, Copy)]
pub struct Grammar {
    /// Escreve um texto numérico (literal ou resultado) por extenso.
    pub number: fn(&str, Gender) -> String,
    /// Conectivos de operação.
    pub connectors: Connectors,
    /// Prefixo de agrupamento (`"abre parênteses "`, `"（"`).
    pub group_prefix: &'static str,
    /// Sufixo de agrupamento (`" fecha parênteses"`, `"）"`).
    pub group_suffix: &'static str,
    /// Prefixo da raiz quadrada (`"raiz quadrada de "`).
    pub root_square: &'static str,
    /// Prefixo da raiz cúbica (`"raiz cúbica de "`).
    pub root_cubic: &'static str,
    /// Template da raiz enésima, contendo `{den}` (`"raiz {den}-ésima de "`).
    pub root_n: &'static str,
}

/// Extrai `(potência, índice)` de um expoente fracionário na SRL.
///
/// Reconhece tanto um literal `"1/2"` quanto a operação `Div` de dois
/// literais (forma produzida pelo parser para frações).
fn root_info(node: &SrlNode) -> Option<(String, String)> {
    match node {
        SrlNode::Group(inner) | SrlNode::Control(inner) => root_info(inner),
        SrlNode::Literal(text) => split_fraction(text),
        SrlNode::Operation {
            op: OperationType::Div,
            operands,
        } => {
            if operands.len() != 2 {
                return None;
            }
            let power = literal_text(operands.first()?)?;
            let index = literal_text(operands.get(1)?)?;
            Some((power, index))
        }
        SrlNode::Operation { .. } => None,
    }
}

/// Divide um texto `"p/q"` em `(p, q)`.
fn split_fraction(text: &str) -> Option<(String, String)> {
    let mut parts = text.split('/');
    let power = parts.next()?;
    let index = parts.next()?;
    if parts.next().is_some() || power.is_empty() || index.is_empty() {
        return None;
    }
    Some((power.to_string(), index.to_string()))
}

/// Texto original de um literal (atravessando grupos/controles).
fn literal_text(node: &SrlNode) -> Option<String> {
    match node {
        SrlNode::Literal(text) => Some(text.clone()),
        SrlNode::Group(inner) | SrlNode::Control(inner) => literal_text(inner),
        SrlNode::Operation { .. } => None,
    }
}

impl Grammar {
    /// Renderiza um nó da SRL em linguagem natural.
    #[must_use]
    pub fn render_node(&self, node: &SrlNode, gender: Gender) -> String {
        match node {
            SrlNode::Literal(text) => (self.number)(text, gender),
            SrlNode::Group(inner) => format!(
                "{}{}{}",
                self.group_prefix,
                self.render_node(inner, gender),
                self.group_suffix
            ),
            SrlNode::Control(inner) => self.render_node(inner, gender),
            SrlNode::Operation { op, operands } => self.render_operation(*op, operands, gender),
        }
    }

    /// Renderiza o resultado formatado (ponto canônico) em linguagem natural.
    #[must_use]
    pub fn render_result(&self, text: &str, gender: Gender) -> String {
        (self.number)(text, gender)
    }

    /// Renderiza uma operação, tratando a potenciação (raiz ou prefixo/sufixo).
    fn render_operation(&self, op: OperationType, operands: &[SrlNode], gender: Gender) -> String {
        let rendered = self.render_operands(operands, gender);
        if op != OperationType::Pow {
            return self.join_operands(op, &rendered);
        }
        if let Some(root) = self.render_root(operands, &rendered) {
            return root;
        }
        self.render_pow(&rendered)
            .unwrap_or_else(|| self.join_operands(op, &rendered))
    }

    /// Renderiza uma potenciação fracionária como raiz, se aplicável.
    fn render_root(&self, operands: &[SrlNode], rendered: &[String]) -> Option<String> {
        let (power, index) = root_info(operands.get(1)?)?;
        let base = rendered.first()?;
        let base_verbal = if power == "1" {
            base.clone()
        } else {
            format!("{base}{}{power}", self.connectors.pow_prefix)
        };
        let phrase = match index.as_str() {
            "2" => self.root_square.to_string(),
            "3" => self.root_cubic.to_string(),
            _ => self.root_n.replace("{den}", &index),
        };
        Some(format!("{phrase}{base_verbal}"))
    }

    /// Renderiza os operandos de uma operação.
    fn render_operands(&self, operands: &[SrlNode], gender: Gender) -> Vec<String> {
        operands
            .iter()
            .map(|operand| self.render_node(operand, gender))
            .collect()
    }

    /// Renderiza uma potenciação de dois operandos, se aplicável.
    fn render_pow(&self, rendered: &[String]) -> Option<String> {
        if rendered.len() != 2 {
            return None;
        }
        let base = rendered.first()?;
        let exponent = rendered.get(1)?;
        let mut out = String::new();
        out.push_str(base);
        out.push_str(self.connectors.pow_prefix);
        out.push_str(exponent);
        out.push_str(self.connectors.pow_suffix);
        Some(out)
    }

    /// Junta operandos já renderizados com o conectivo da operação.
    fn join_operands(&self, op: OperationType, rendered: &[String]) -> String {
        let connector = self.connectors.for_op(op);
        rendered.join(&format!(" {connector} "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn srl_collects_literals_and_operations() {
        let node = SrlNode::Operation {
            op: OperationType::Add,
            operands: vec![
                SrlNode::Literal("1".to_string()),
                SrlNode::Group(Box::new(SrlNode::Operation {
                    op: OperationType::Mul,
                    operands: vec![
                        SrlNode::Literal("2".to_string()),
                        SrlNode::Literal("3".to_string()),
                    ],
                })),
            ],
        };
        assert_eq!(node.literals(), vec!["1", "2", "3"]);
        assert_eq!(
            node.operations(),
            vec![OperationType::Add, OperationType::Mul]
        );
        assert!(node.contains_literal("2"));
        assert!(!node.contains_literal("9"));
    }
}
