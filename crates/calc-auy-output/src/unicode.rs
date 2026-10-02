//! Renderização Unicode (CLI/terminal) de um cálculo selado.

use calc_auy_core::{FlatAst, NodeData, NodeId, OperationType};

use crate::output::Output;

/// Converte um texto em sobrescrito.
fn to_superscript(input: &str) -> String {
    input
        .chars()
        .map(|character| match character {
            '0' => '⁰',
            '1' => '¹',
            '2' => '²',
            '3' => '³',
            '4' => '⁴',
            '5' => '⁵',
            '6' => '⁶',
            '7' => '⁷',
            '8' => '⁸',
            '9' => '⁹',
            '+' => '⁺',
            '-' => '⁻',
            '=' => '⁼',
            '(' => '⁽',
            ')' => '⁾',
            'n' => 'ⁿ',
            'i' => 'ⁱ',
            other => other,
        })
        .collect()
}

/// Converte um texto em subscrito.
fn to_subscript(input: &str) -> String {
    input
        .chars()
        .map(|character| match character {
            '0' => '₀',
            '1' => '₁',
            '2' => '₂',
            '3' => '₃',
            '4' => '₄',
            '5' => '₅',
            '6' => '₆',
            '7' => '₇',
            '8' => '₈',
            '9' => '₉',
            'a' => 'ₐ',
            'e' => 'ₑ',
            'h' => 'ₕ',
            'i' => 'ᵢ',
            'j' => 'ⱼ',
            'k' => 'ₖ',
            'l' => 'ₗ',
            'm' => 'ₘ',
            'n' => 'ₙ',
            'o' => 'ₒ',
            'p' => 'ₚ',
            'r' => 'ᵣ',
            's' => 'ₛ',
            't' => 'ₜ',
            'u' => 'ᵤ',
            'v' => 'ᵥ',
            'x' => 'ₓ',
            'b' => 'ᵦ',
            other => other,
        })
        .collect()
}

/// Normaliza um literal (`.5` → `0.5`).
fn normalize(input: &str) -> String {
    if input.starts_with('.') {
        format!("0{input}")
    } else if let Some(rest) = input.strip_prefix("-.") {
        format!("-0.{rest}")
    } else {
        input.to_string()
    }
}

/// Renderiza um nó em Unicode.
fn render(ast: &FlatAst, id: NodeId) -> String {
    match ast.node(id) {
        Some(NodeData::Literal { original_input, .. }) => normalize(original_input),
        Some(NodeData::Group { child }) => format!("({})", render(ast, *child)),
        Some(NodeData::Control { child, .. }) => render(ast, *child),
        Some(NodeData::Operation { op, operands }) => render_operation(ast, *op, operands),
        None => String::new(),
    }
}

/// Renderiza uma operação em Unicode.
fn render_operation(ast: &FlatAst, op: OperationType, operands: &[NodeId]) -> String {
    let parts: Vec<String> = operands.iter().map(|child| render(ast, *child)).collect();
    if op == OperationType::Pow
        && let [base, exponent] = parts.as_slice()
    {
        return format!("{base}{}", to_superscript(exponent));
    }
    let symbol = match op {
        OperationType::Sub => "-",
        OperationType::Mul => "×",
        OperationType::Div => "÷",
        OperationType::Mod => "%",
        OperationType::DivInt => "//",
        _ => "+",
    };
    parts.join(&format!(" {symbol} "))
}

impl Output<'_> {
    /// Renderiza o cálculo em Unicode (CLI-friendly).
    #[must_use]
    pub fn to_unicode(&self) -> String {
        let ast = &self.committed().payload().ast;
        let body = render(ast, ast.root());
        let strategy = to_subscript(self.strategy().as_str());
        let decimals = self.effective_decimals();
        let result = self.to_string_decimal();
        format!("round{strategy}({body}, {decimals}) = {result}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_super_and_subscripts() {
        assert_eq!(to_superscript("32"), "³²");
        assert_eq!(to_subscript("nbr5891"), "ₙᵦᵣ₅₈₉₁");
    }

    #[test]
    fn normalizes_leading_dot() {
        assert_eq!(normalize(".5"), "0.5");
        assert_eq!(normalize("-.5"), "-0.5");
    }
}
