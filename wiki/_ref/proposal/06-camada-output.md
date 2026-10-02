# 06 — Camada de Saída (Outputs)

## Objetivo

Fornecer **múltiplas representações** do resultado do cálculo, cada uma otimizada para um caso de uso específico:

| Formato | Uso | Exemplo |
|---------|-----|---------|
| **String Number** | Geral | `"15109.78"` |
| **Monetary** | Financeiro | `"R$ 15.109,78"` |
| **LaTeX** | Documentação | `\text{round}_{\text{NBR-5891}}(10000 \times ..., 2) = 15109.78` |
| **Unicode** | CLI/Terminal | `roundₙᵦᵣ₋₅₈₉₁(10000 × ..., 2) = 15109.78` |
| **Verbal A11y** | Acessibilidade | `"10000 multiplicado por ... é igual a 15109 vírgula 78"` |
| **Mermaid** | Visualização | Diagrama de sequência |
| **Slice** | Rateio | `["3.34", "3.33", "3.33"]` |
| **Audit Trace** | Auditoria | JSON assinado |

---

## Estrutura do Módulo

```
crates/calc-auy-output/
├── src/
│   ├── lib.rs           # Re-exports
│   ├── output.rs        # CalcAuyOutput struct
│   ├── monetary.rs      # to_monetary()
│   ├── latex.rs         # to_latex()
│   ├── unicode.rs       # to_unicode()
│   ├── verbal.rs        # to_verbal_a11y()
│   ├── mermaid.rs       # to_mermaid_graph()
│   ├── slicer.rs        # to_slice()
│   └── options.rs       # OutputOptions
```

---

## Definição do Output

```rust
// crates/calc-auy-output/src/output.rs

use calc_auy_core::{Ast, Rational, RoundingStrategy, Signature};
use serde::{Serialize, Deserialize};

/// Opções de saída.
#[derive(Debug, Clone, Default)]
pub struct OutputOptions {
    pub decimal_precision: Option<usize>,
    pub locale: Option<String>,
    pub currency: Option<String>,
}

/// Resultado do cálculo com múltiplas representações.
#[derive(Debug, Clone)]
pub struct CalcAuyOutput {
    result: Rational,
    ast: Ast,
    round_strategy: RoundingStrategy,
    signature: Signature,
    config: InstanceConfig,
    // Cache para resultados computados
    cache: RefCell<OutputCache>,
}

#[derive(Debug, Default)]
struct OutputCache {
    rounded: HashMap<usize, Rational>,
    string_number: Option<String>,
    monetary: Option<String>,
    latex: Option<String>,
    unicode: Option<String>,
    verbal: Option<String>,
    mermaid: Option<String>,
    audit_trace: Option<String>,
}

impl CalcAuyOutput {
    /// Cria um novo output a partir do commit.
    pub fn new(
        result: Rational,
        ast: Ast,
        round_strategy: RoundingStrategy,
        signature: Signature,
        config: InstanceConfig,
    ) -> Self {
        Self {
            result,
            ast,
            round_strategy,
            signature,
            config,
            cache: RefCell::new(OutputCache::default()),
        }
    }

    /// Retorna o resultado como string decimal.
    pub fn to_string_number(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let precision = self.effective_precision(&opts);

        if let Some(cached) = &self.cache.borrow().string_number {
            return cached.clone();
        }

        let result = if self.round_strategy == RoundingStrategy::None {
            self.result.to_decimal_string(precision).unwrap_or_default()
        } else {
            let rounded = self.get_rounded(precision);
            rounded.to_decimal_string(precision).unwrap_or_default()
        };

        self.cache.borrow_mut().string_number = Some(result.clone());
        result
    }

    /// Retorna o resultado como BigInt escalado.
    pub fn to_scaled_bigint(&self, options: Option<OutputOptions>) -> BigInt {
        let opts = options.unwrap_or_default();
        let precision = self.effective_precision(&opts);
        let scale = BigInt::from(10u32).pow(precision as u32);

        let rounded = self.get_rounded(precision);
        (rounded.numerator() * &scale) / rounded.denominator()
    }

    /// Retorna o resultado racional bruto.
    pub fn to_raw_internal_number(&self) -> (&BigInt, &BigInt) {
        (self.result.numerator(), self.result.denominator())
    }

    /// Retorna o rastro de auditoria como JSON.
    pub fn to_audit_trace(&self) -> String {
        if let Some(cached) = &self.cache.borrow().audit_trace {
            return cached.clone();
        }

        let trace = serde_json::json!({
            "ast": self.ast,
            "finalResult": {
                "n": self.result.numerator().to_string(),
                "d": self.result.denominator().to_string(),
            },
            "roundStrategy": self.round_strategy.id(),
            "signature": self.signature.value,
            "contextLabel": self.config.context_label,
        });

        let result = serde_json::to_string(&trace).unwrap_or_default();
        self.cache.borrow_mut().audit_trace = Some(result.clone());
        result
    }

    // Helpers privados
    fn effective_precision(&self, opts: &OutputOptions) -> usize {
        opts.decimal_precision.unwrap_or_else(|| {
            if self.round_strategy == RoundingStrategy::None {
                50
            } else {
                2
            }
        })
    }

    fn get_rounded(&self, precision: usize) -> Rational {
        let mut cache = self.cache.borrow_mut();
        if let Some(rounded) = cache.rounded.get(&precision) {
            return rounded.clone();
        }
        drop(cache);

        let rounded = apply_rounding(&self.result, &self.round_strategy, precision);

        self.cache.borrow_mut().rounded.insert(precision, rounded.clone());
        rounded
    }
}
```

---

## Formato Monetário

```rust
// crates/calc-auy-output/src/monetary.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use calc_auy_i18n::Locale;

impl CalcAuyOutput {
    /// Formata o resultado como moeda localizada.
    ///
    /// # Examples
    /// ```
    /// // pt-BR: "R$ 15.109,78"
    /// // en-US: "$15,109.78"
    /// // fr-FR: "15 109,78 €"
    /// ```
    pub fn to_monetary(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let locale = Locale::from_code(opts.locale.as_deref().unwrap_or("pt-BR"));
        let currency = opts.currency.as_deref().unwrap_or(locale.currency());

        let number_str = self.to_string_number(Some(opts));
        let (int_part, frac_part) = split_decimal(&number_str);

        // Agrupa milhares
        let grouped = group_thousands(&int_part, locale.thousand_separator());

        // Monta string final
        let number = if frac_part.is_empty() {
            grouped
        } else {
            format!("{}{}{}", grouped, locale.decimal_separator(), frac_part)
        };

        // Aplica símbolo da moeda
        let fmt = currency_format(currency);
        if fmt.prefix {
            format!("{}{}{}", fmt.symbol, if fmt.space { "\u{00a0}" } else { "" }, number)
        } else {
            format!("{}{}{}", number, if fmt.space { "\u{00a0}" } else { "" }, fmt.symbol)
        }
    }
}

fn split_decimal(s: &str) -> (String, String) {
    match s.split_once('.') {
        Some((int, frac)) => (int.to_string(), frac.to_string()),
        None => (s.to_string(), String::new()),
    }
}

fn group_thousands(int_part: &str, separator: &str) -> String {
    let mut result = String::new();
    let len = int_part.len();
    let negative = int_part.starts_with('-');
    let digits = if negative { &int_part[1..] } else { int_part };

    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            result.push_str(separator);
        }
        result.push(c);
    }

    if negative {
        format!("-{}", result)
    } else {
        result
    }
}

struct CurrencyFormat {
    symbol: &'static str,
    prefix: bool,
    space: bool,
}

fn currency_format(code: &str) -> CurrencyFormat {
    match code {
        "BRL" => CurrencyFormat { symbol: "R$", prefix: true, space: true },
        "USD" => CurrencyFormat { symbol: "$", prefix: true, space: false },
        "EUR" => CurrencyFormat { symbol: "€", prefix: false, space: true },
        "RUB" => CurrencyFormat { symbol: "₽", prefix: false, space: true },
        "CNY" | "JPY" => CurrencyFormat { symbol: "¥", prefix: true, space: false },
        _ => CurrencyFormat { symbol: code, prefix: true, space: false },
    }
}
```

---

## Formato LaTeX

```rust
// crates/calc-auy-output/src/latex.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use calc_auy_core::ast::{Node, OperationType};

impl CalcAuyOutput {
    /// Renderiza o cálculo em formato LaTeX.
    ///
    /// # Example
    /// ```latex
    /// \text{round}_{\text{NBR-5891}}(10000 \times \left( 1 + 14.75\% \right)^{3}, 2) = 15109.78
    /// ```
    pub fn to_latex(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let base = render_ast_latex(&self.ast.root);
        let result = self.to_string_number(Some(opts));
        let strategy = self.round_strategy.display_id();
        let precision = self.effective_precision(&opts);

        format!(
            "\\text{{round}}_{{\\text{{{}}}}}({}, {}) = {}",
            strategy, base, precision, result
        )
    }
}

fn render_ast_latex(node: &Node) -> String {
    match node {
        Node::Literal { original_input, .. } => {
            let input = original_input.replace('%', "\\%");
            if input.contains('/') {
                let (n, d) = input.split_once('/').unwrap();
                format!("\\frac{{{}}}{{{}}}", n, d)
            } else {
                input
            }
        }

        Node::Group { child, .. } => {
            format!("\\left( {} \\right)", render_ast_latex(child))
        }

        Node::Control { child, .. } => render_ast_latex(child),

        Node::Operation { op_type, operands, .. } => {
            let ops: Vec<String> = operands.iter().map(render_ast_latex).collect();

            match op_type {
                OperationType::Div => format!("\\frac{{{}}}{{{}}}", ops[0], ops[1]),
                OperationType::Pow => format!("{}^{{{}}}", ops[0], ops[1]),
                OperationType::Add => format!("{} + {}", ops[0], ops[1]),
                OperationType::Sub => format!("{} - {}", ops[0], ops[1]),
                OperationType::Mul => format!("{} \\times {}", ops[0], ops[1]),
                OperationType::Mod => format!("{} \\bmod {}", ops[0], ops[1]),
                OperationType::DivInt => format!("{} // {}", ops[0], ops[1]),
                OperationType::CrossContextAdd => format!("{} + {}", ops[0], ops[1]),
            }
        }
    }
}
```

---

## Formato Unicode

```rust
// crates/calc-auy-output/src/unicode.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use calc_auy_core::ast::{Node, OperationType};

impl CalcAuyOutput {
    /// Renderiza o cálculo em Unicode (CLI-friendly).
    ///
    /// # Example
    /// ```
    /// roundₙᵦᵣ₋₅₈₉₁(10000 × (1 + 14.75%)³, 2) = 15109.78
    /// ```
    pub fn to_unicode(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let base = render_ast_unicode(&self.ast.root);
        let strategy = self.round_strategy.display_id();
        let sub_strategy = to_subscript(&strategy);
        let precision = self.effective_precision(&opts);
        let result = self.to_string_number(Some(opts));

        format!("round{}({}, {}) = {}", sub_strategy, base, precision, result)
    }
}

fn render_ast_unicode(node: &Node) -> String {
    match node {
        Node::Literal { original_input, .. } => {
            normalize_input(original_input)
        }

        Node::Group { child, .. } => {
            format!("({})", render_ast_unicode(child))
        }

        Node::Control { child, .. } => render_ast_unicode(child),

        Node::Operation { op_type, operands, .. } => {
            let ops: Vec<String> = operands.iter().map(render_ast_unicode).collect();

            let symbol = match op_type {
                OperationType::Add | OperationType::CrossContextAdd => "+",
                OperationType::Sub => "-",
                OperationType::Mul => "×",
                OperationType::Div => "÷",
                OperationType::Pow => {
                    return format!("{}{}", ops[0], to_superscript(&ops[1]));
                }
                OperationType::Mod => "%",
                OperationType::DivInt => "//",
            };

            format!("{} {} {}", ops[0], symbol, ops[1])
        }
    }
}

fn normalize_input(input: &str) -> String {
    if input.starts_with('.') {
        format!("0{}", input)
    } else if input.starts_with("-.") {
        format!("-0{}", &input[1..])
    } else {
        input.to_string()
    }
}

fn to_superscript(s: &str) -> String {
    s.chars().map(|c| match c {
        '0' => '⁰', '1' => '¹', '2' => '²', '3' => '³', '4' => '⁴',
        '5' => '⁵', '6' => '⁶', '7' => '⁷', '8' => '⁸', '9' => '⁹',
        '+' => '⁺', '-' => '⁻', '=' => '⁼', '(' => '⁽', ')' => '⁾',
        'n' => 'ⁿ', 'i' => 'ⁱ',
        c => c,
    }).collect()
}

fn to_subscript(s: &str) -> String {
    s.chars().map(|c| match c {
        '0' => '₀', '1' => '₁', '2' => '₂', '3' => '₃', '4' => '₄',
        '5' => '₅', '6' => '₆', '7' => '₇', '8' => '₈', '9' => '₉',
        'a' => 'ₐ', 'e' => 'ₑ', 'h' => 'ₕ', 'i' => 'ᵢ', 'j' => 'ⱼ',
        'k' => 'ₖ', 'l' => 'ₗ', 'm' => 'ₘ', 'n' => 'ₙ', 'o' => 'ₒ',
        'p' => 'ₚ', 'r' => 'ᵣ', 's' => 'ₛ', 't' => 'ₜ', 'u' => 'ᵤ',
        'v' => 'ᵥ', 'x' => 'ₓ',
        'b' => 'ᵦ', // Aproximação para beta
        c => c,
    }).collect()
}
```

---

## Formato Verbal (A11y)

```rust
// crates/calc-auy-output/src/verbal.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use calc_auy_core::ast::{Node, OperationType};
use calc_auy_i18n::Locale;

impl CalcAuyOutput {
    /// Gera descrição em linguagem natural do cálculo.
    ///
    /// # Examples
    /// ```
    /// // pt-BR: "10000 multiplicado por 14.75% é igual a 1475 vírgula 00 (Arredondamento: NBR-5891 para 2 casas decimais)."
    /// // en-US: "10000 multiplied by 14.75% is equal to 1475 point 00 (Rounding: NBR-5891 for 2 decimal places)."
    /// ```
    pub fn to_verbal_a11y(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let locale = Locale::from_code(opts.locale.as_deref().unwrap_or("pt-BR"));

        let base = render_ast_verbal(&self.ast.root, &locale);
        let result = self.to_string_number(Some(opts))
            .replace('.', locale.voiced_separator());
        let strategy = self.round_strategy.display_id();
        let precision = self.effective_precision(&opts);

        format!(
            "{}{} ({}: {} {} {} {}).",
            base,
            locale.phrases().is_equal(),
            locale.phrases().rounding(),
            strategy,
            locale.phrases().for(),
            precision,
            locale.phrases().decimal_places()
        )
    }
}

fn render_ast_verbal(node: &Node, locale: &Locale) -> String {
    match node {
        Node::Literal { original_input, .. } => {
            normalize_input(original_input)
        }

        Node::Group { child, .. } => {
            format!(
                "{} {} {}",
                locale.operators().group_start(),
                render_ast_verbal(child, locale),
                locale.operators().group_end()
            )
        }

        Node::Control { child, .. } => render_ast_verbal(child, locale),

        Node::Operation { op_type, operands, .. } => {
            let ops: Vec<String> = operands.iter()
                .map(|op| render_ast_verbal(op, locale))
                .collect();

            let op_str = match op_type {
                OperationType::Add | OperationType::CrossContextAdd => locale.operators().add(),
                OperationType::Sub => locale.operators().sub(),
                OperationType::Mul => locale.operators().mul(),
                OperationType::Div => locale.operators().div(),
                OperationType::Pow => locale.operators().pow(),
                OperationType::Mod => locale.operators().mod_(),
                OperationType::DivInt => locale.operators().div_int(),
            };

            format!("{} {} {}", ops[0], op_str, ops[1])
        }
    }
}
```

---

## Formato Mermaid

```rust
// crates/calc-auy-output/src/mermaid.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use calc_auy_core::ast::Node;
use calc_auy_i18n::Locale;

impl CalcAuyOutput {
    /// Gera diagrama de sequência Mermaid representando o fluxo do cálculo.
    ///
    /// # Example
    /// ```mermaid
    /// sequenceDiagram
    ///     autonumber
    ///     participant Ctx_finance as Contexto: finance
    ///     activate Ctx_finance
    ///     Note over Ctx_finance: Ingestão: 10000
    ///     Ctx_finance->>Ctx_finance: Operação: mul
    ///     Note over Ctx_finance: Fechamento e Assinatura Final
    ///     deactivate Ctx_finance
    /// ```
    pub fn to_mermaid_graph(&self, options: Option<OutputOptions>) -> String {
        let opts = options.unwrap_or_default();
        let locale = Locale::from_code(opts.locale.as_deref().unwrap_or("pt-BR"));

        let mut events = Vec::new();
        let mut participant_depths: HashMap<String, usize> = HashMap::new();

        let current_context = self.config.context_label.clone();
        participant_depths.insert(current_context.clone(), 0);

        // Buffer para agrupar ingestões consecutivas
        let mut literal_buffer: Vec<LiteralEvent> = Vec::new();

        // Varre a AST
        walk_ast(
            &self.ast.root,
            &current_context,
            0,
            &mut events,
            &mut participant_depths,
            &mut literal_buffer,
            &locale,
            &self.config,
        );

        // Descarrega buffer final
        flush_literals(&current_context, &mut literal_buffer, &mut events, &locale);

        // Adiciona evento de fechamento
        events.push(MermaidEvent::Note {
            context: current_context.clone(),
            message: format!(
                "{}<br/>{}: (Sig: {}...)",
                locale.mermaid().closing(),
                locale.mermaid().signature(),
                &self.signature.value[..8.min(self.signature.value.len())]
            ),
        });

        // Gera DSL
        render_mermaid_dsl(events, participant_depths, &locale)
    }
}

// ... implementação dos helpers ...
```

---

## Slicer (Rateio)

```rust
// crates/calc-auy-output/src/slicer.rs

use crate::output::{CalcAuyOutput, OutputOptions};
use num_bigint::BigInt;

impl CalcAuyOutput {
    /// Divide o resultado em partes iguais, distribuindo o restante.
    ///
    /// Usa o algoritmo de **Maior Resto** (Largest Remainder Method).
    ///
    /// # Example
    /// ```
    /// // 10.00 / 3 = ["3.34", "3.33", "3.33"]
    /// ```
    pub fn to_slice(&self, parts: usize, options: Option<OutputOptions>) -> Vec<String> {
        if parts == 0 {
            return vec![];
        }

        let opts = options.unwrap_or_default();
        let precision = self.effective_precision(&opts);
        let total_cents = self.to_scaled_bigint(Some(opts));

        let base = &total_cents / BigInt::from(parts);
        let remainder = &total_cents % BigInt::from(parts);

        (0..parts)
            .map(|i| {
                let mut cents = base.clone();
                if BigInt::from(i) < remainder {
                    cents += 1;
                }
                format_cents(&cents, precision)
            })
            .collect()
    }

    /// Divide o resultado proporcionalmente aos ratios fornecidos.
    ///
    /// # Example
    /// ```
    /// // 1000.00 com ratios ["5%", "70%", "3.64%", "21.36%"]
    /// // = ["50.19", "702.53", "36.53", "210.75"]
    /// ```
    pub fn to_slice_by_ratio(
        &self,
        ratios: &[f64],
        options: Option<OutputOptions>,
    ) -> Vec<String> {
        if ratios.is_empty() {
            return vec![];
        }

        let opts = options.unwrap_or_default();
        let precision = self.effective_precision(&opts);
        let total_cents = self.to_scaled_bigint(Some(opts));

        let ratio_sum: f64 = ratios.iter().sum();

        // Calcula alocações
        let mut allocations: Vec<BigInt> = ratios
            .iter()
            .map(|&r| {
                let scaled = (r / ratio_sum * 1_000_000.0) as u64;
                (&total_cents * BigInt::from(scaled)) / BigInt::from(1_000_000u64)
            })
            .collect();

        // Distribui restante
        let allocated: BigInt = allocations.iter().sum();
        let mut diff = &total_cents - &allocated;
        let mut i = 0;
        while diff > BigInt::zero() {
            allocations[i % allocations.len()] += 1;
            diff -= 1;
            i += 1;
        }

        allocations
            .iter()
            .map(|cents| format_cents(cents, precision))
            .collect()
    }
}

fn format_cents(cents: &BigInt, precision: usize) -> String {
    let negative = cents.is_negative();
    let abs = cents.abs();

    let divisor = BigInt::from(10u32).pow(precision as u32);
    let int_part = &abs / &divisor;
    let frac_part = &abs % &divisor;

    let result = if precision == 0 {
        int_part.to_string()
    } else {
        format!("{}.{:0>width$}", int_part, frac_part, width = precision)
    };

    if negative {
        format!("-{}", result)
    } else {
        result
    }
}
```

---

## Testes

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_string_number() {
        // ...
    }

    #[test]
    fn test_to_monetary_pt_br() {
        // ...
    }

    #[test]
    fn test_to_latex() {
        // ...
    }

    #[test]
    fn test_to_unicode() {
        // ...
    }

    #[test]
    fn test_to_verbal_a11y() {
        // ...
    }

    #[test]
    fn test_to_slice() {
        // 10.00 / 3 = ["3.34", "3.33", "3.33"]
    }

    #[test]
    fn test_to_slice_by_ratio() {
        // 1000.00 com ratios proporcionais
    }
}
```

---

## Conclusão

A camada de saída em Rust oferece:
- **Modularidade**: Cada formato em seu próprio módulo
- **Performance**: Cache de resultados computados
- **Extensibilidade**: Fácil adicionar novos formatos
- **Type safety**: Opções validadas em tempo de compilação

A próxima seção detalha a camada de processadores.
