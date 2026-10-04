//! Renderização Unicode (CLI/terminal) de um cálculo selado.

use calc_auy_core::{FlatAst, NodeData, NodeId, OperationType};

use crate::output::{Output, root_info};

/// Converte um texto em sobrescrito.
fn to_superscript(input: &str) -> String {
    input
        .chars()
        .map(|character| match character.to_ascii_lowercase() {
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
            '/' => 'ᐟ',
            'n' => 'ⁿ',
            'i' => 'ⁱ',
            '^' => '^',
            other => other,
        })
        .collect()
}

/// Converte um texto em subscrito.
fn to_subscript(input: &str) -> String {
    input
        .chars()
        .map(|character| match character.to_ascii_lowercase() {
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
            '+' => '₊',
            '-' => '₋',
            '=' => '₌',
            '(' => '₍',
            ')' => '₎',
            'a' => 'ₐ',
            'b' => 'ᵦ',
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

/// Notação de potência (evita ambiguidade de sobrescritos aninhados).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Notation {
    /// Usa sobrescritos Unicode (`x²`).
    Superscript,
    /// Usa `^` explícito (`x^y`).
    Caret,
}

/// Renderiza um nó em Unicode.
///
/// `notation` evita ambiguidade de sobrescritos aninhados (`x^y^z`),
/// exatamente como o `forceCaret` da referência.
fn render(ast: &FlatAst, id: NodeId, notation: Notation) -> String {
    match ast.node(id) {
        Some(NodeData::Literal { original_input, .. }) => normalize(original_input),
        Some(NodeData::Group { child }) => format!("({})", render(ast, *child, notation)),
        Some(NodeData::Control { child, .. }) => render(ast, *child, notation),
        Some(NodeData::Operation { op, operands }) => {
            render_operation(ast, *op, operands, notation)
        }
        None => String::new(),
    }
}

/// Renderiza uma potência como raiz quando o expoente é fracionário.
fn render_root(
    ast: &FlatAst,
    operands: &[NodeId],
    base: &str,
    notation: Notation,
) -> Option<String> {
    let (power, index) = operands.get(1).and_then(|id| root_info(ast, *id))?;
    let base_with_pow = if power == "1" {
        base.to_string()
    } else if notation == Notation::Caret {
        format!("({base}^{power})")
    } else {
        format!("({base}{})", to_superscript(&power))
    };
    let rendered = match index.as_str() {
        "2" => format!("√{base_with_pow}"),
        "3" => format!("∛{base_with_pow}"),
        "4" => format!("∜{base_with_pow}"),
        _ => format!("{}√{base_with_pow}", to_superscript(&index)),
    };
    Some(rendered)
}

/// Renderiza uma operação em Unicode.
fn render_operation(
    ast: &FlatAst,
    op: OperationType,
    operands: &[NodeId],
    notation: Notation,
) -> String {
    let parts: Vec<String> = operands
        .iter()
        .enumerate()
        .map(|(index, child)| {
            let is_exponent = op == OperationType::Pow && index == 1;
            let child_notation = if is_exponent || notation == Notation::Caret {
                Notation::Caret
            } else {
                Notation::Superscript
            };
            render(ast, *child, child_notation)
        })
        .collect();

    if op == OperationType::Pow
        && let [base, exponent] = parts.as_slice()
    {
        if let Some(root) = render_root(ast, operands, base, notation) {
            return root;
        }
        if notation == Notation::Caret {
            return format!("({base}^{exponent})");
        }
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
        self.unicode_ref().to_string()
    }

    /// Retorna o Unicode memoizado por referência (sem cópia).
    pub(crate) fn unicode_ref(&self) -> &str {
        self.unicode.get_or_init(|| self.render_unicode())
    }

    /// Renderiza o cálculo em Unicode sem cache.
    fn render_unicode(&self) -> String {
        let ast = &self.committed().payload().ast;
        let body = render(ast, ast.root(), Notation::Superscript);
        let strategy = to_subscript(self.strategy().as_display());
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
        assert_eq!(to_subscript("NBR-5891"), "ₙᵦᵣ₋₅₈₉₁");
    }

    #[test]
    fn normalizes_leading_dot() {
        assert_eq!(normalize(".5"), "0.5");
        assert_eq!(normalize("-.5"), "-0.5");
    }
}
