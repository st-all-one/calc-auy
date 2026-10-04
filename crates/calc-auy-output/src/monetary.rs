//! Formatação monetária com tabelas de locale (dados, não NLG).

use crate::options::CurrencyPosition;
use crate::output::Output;

/// Separa a parte inteira da fracionária (a string usa `.` internamente).
fn split_decimal(number: &str) -> (&str, &str) {
    number.split_once('.').unwrap_or((number, ""))
}

/// Agrupa a parte inteira em milhares.
fn group_thousands(int_part: &str, separator: &str) -> String {
    let (sign, digits) = int_part
        .strip_prefix('-')
        .map_or(("", int_part), |rest| ("-", rest));
    let length = digits.len();
    let mut result = String::with_capacity(digits.len());
    for (index, character) in digits.chars().enumerate() {
        if index > 0 && length.saturating_sub(index).checked_rem(3) == Some(0) {
            result.push_str(separator);
        }
        result.push(character);
    }
    format!("{sign}{result}")
}

impl Output<'_> {
    /// Formata o resultado como moeda localizada.
    ///
    /// # Examples
    ///
    /// ```
    /// use calc_auy_core::{
    ///     AstBuilder, CustodyVerifier, Limits, OperationType, Rational, RoundingStrategy, Salt,
    ///     commit,
    /// };
    /// use calc_auy_output::{Locale, Output, OutputOptions};
    ///
    /// struct AcceptAll;
    /// impl CustodyVerifier for AcceptAll {
    ///     fn verify_link(
    ///         &self,
    ///         _l: &str,
    ///         _s: &str,
    ///         _r: RoundingStrategy,
    ///     ) -> Result<(), calc_auy_core::CalcAuyError> {
    ///         Ok(())
    ///     }
    /// }
    ///
    /// let limits = Limits::default();
    /// let mut builder = AstBuilder::new(&limits);
    /// let a = builder.literal(Rational::from_i64(15109), "15109").unwrap();
    /// let b = builder
    ///     .literal(Rational::new_checked(78, 100, &limits).unwrap(), "0.78")
    ///     .unwrap();
    /// let sum = builder.operation(OperationType::Add, &[a, b]).unwrap();
    /// let ast = builder.finish(sum).unwrap();
    /// let verified = ast.verify_custody(&AcceptAll, &limits).unwrap();
    /// let committed =
    ///     commit(verified, RoundingStrategy::Nbr5891, 2, &Salt::new("demo"), &limits).unwrap();
    /// let output = Output::new(&committed, OutputOptions::new().with_locale(Locale::PtBr));
    /// assert_eq!(output.to_monetary(), "R$\u{00a0}15.109,78");
    /// ```
    #[must_use]
    pub fn to_monetary(&self) -> String {
        Self::cached(&self.monetary, || self.render_monetary())
    }

    /// Formata o resultado como moeda, sem cache.
    fn render_monetary(&self) -> String {
        let options = self.options();
        let data = options.locale().data();
        let currency = options.currency();
        let number = self.to_string_decimal_with(self.effective_decimals());
        let (int_part, frac_part) = split_decimal(&number);
        let grouped = group_thousands(int_part, data.thousand_separator);
        let formatted = if frac_part.is_empty() {
            grouped
        } else {
            format!("{grouped}{}{frac_part}", data.decimal_separator)
        };
        let symbol = currency.symbol();
        match data.currency_position {
            CurrencyPosition::Prefix => format!("{symbol}{formatted}"),
            CurrencyPosition::PrefixSpace => format!("{symbol}\u{00a0}{formatted}"),
            CurrencyPosition::Suffix => format!("{formatted}{symbol}"),
            CurrencyPosition::SuffixSpace => format!("{formatted}\u{00a0}{symbol}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn groups_thousands() {
        assert_eq!(group_thousands("15109", "."), "15.109");
        assert_eq!(group_thousands("-1000000", ","), "-1,000,000");
        assert_eq!(group_thousands("123", "."), "123");
    }

    #[test]
    fn splits_decimal() {
        assert_eq!(split_decimal("15109.78"), ("15109", "78"));
        assert_eq!(split_decimal("42"), ("42", ""));
    }
}
