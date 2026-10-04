//! Renderização LaTeX de um cálculo selado.

use calc_auy_core::{FlatAst, NodeData, NodeId, OperationType};

use crate::output::{Output, root_info};

/// Escapa um literal para LaTeX.
fn escape_literal(input: &str) -> String {
    if let Some((numerator, denominator)) = input.split_once('/') {
        return format!("\\frac{{{numerator}}}{{{denominator}}}");
    }
    input.replace('%', "\\%").replace('_', "\\_")
}

/// Renderiza um nó em LaTeX.
fn render(ast: &FlatAst, id: NodeId) -> String {
    match ast.node(id) {
        Some(NodeData::Literal { original_input, .. }) => escape_literal(original_input),
        Some(NodeData::Group { child }) => format!("\\left( {} \\right)", render(ast, *child)),
        Some(NodeData::Control { child, .. }) => render(ast, *child),
        Some(NodeData::Operation { op, operands }) => render_operation(ast, *op, operands),
        None => String::new(),
    }
}

/// Renderiza uma potência, preferindo a forma de raiz quando o expoente é
/// fracionário.
fn render_power(ast: &FlatAst, operands: &[NodeId], base: &str, exponent: &str) -> String {
    match operands.get(1).and_then(|id| root_info(ast, *id)) {
        Some((power, index)) => {
            let inner = if power == "1" {
                base.to_string()
            } else {
                format!("{{{base}}}^{{{power}}}")
            };
            if index == "2" {
                format!("\\sqrt{{{inner}}}")
            } else {
                format!("\\sqrt[{index}]{{{inner}}}")
            }
        }
        None => format!("{base}^{{{exponent}}}"),
    }
}

/// Renderiza uma operação em LaTeX.
fn render_operation(ast: &FlatAst, op: OperationType, operands: &[NodeId]) -> String {
    let parts: Vec<String> = operands.iter().map(|child| render(ast, *child)).collect();
    match (op, parts.as_slice()) {
        (OperationType::Div, [numerator, denominator]) => {
            format!("\\frac{{{numerator}}}{{{denominator}}}")
        }
        (OperationType::Pow, [base, exponent]) => render_power(ast, operands, base, exponent),
        _ => {
            let symbol = match op {
                OperationType::Sub => "-",
                OperationType::Mul => "\\times",
                OperationType::Div => "\\div",
                OperationType::Mod => "\\bmod",
                OperationType::DivInt => "//",
                _ => "+",
            };
            parts.join(&format!(" {symbol} "))
        }
    }
}

impl Output<'_> {
    /// Renderiza o cálculo em LaTeX.
    #[must_use]
    pub fn to_latex(&self) -> String {
        self.latex_ref().to_string()
    }

    /// Retorna o LaTeX memoizado por referência (sem cópia).
    pub(crate) fn latex_ref(&self) -> &str {
        self.latex.get_or_init(|| self.render_latex())
    }

    /// Renderiza o cálculo em LaTeX sem cache.
    fn render_latex(&self) -> String {
        let ast = &self.committed().payload().ast;
        let body = render(ast, ast.root());
        let strategy = self.strategy().as_display();
        let decimals = self.effective_decimals();
        let result = self.to_string_decimal();
        format!("\\text{{round}}_{{\\text{{{strategy}}}}}({body}, {decimals}) = {result}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_fractions_and_percent() {
        assert_eq!(escape_literal("1/2"), "\\frac{1}{2}");
        assert_eq!(escape_literal("14.75%"), "14.75\\%");
    }
}
