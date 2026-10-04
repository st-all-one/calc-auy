//! Formatação decimal exata (sem `f64`).

use num_bigint::BigInt;

use calc_auy_core::{Rational, RoundingStrategy};

/// Máximo de casas decimais aceitas na formatação (evita `DoS`).
pub const MAX_DECIMALS: u32 = 1_000;

/// Limita as casas decimais ao máximo seguro.
#[must_use]
pub const fn clamp_decimals(decimals: u32) -> u32 {
    if decimals > MAX_DECIMALS {
        MAX_DECIMALS
    } else {
        decimals
    }
}

/// Calcula `10^decimals` como [`BigInt`].
#[must_use]
pub fn pow10(decimals: u32) -> BigInt {
    BigInt::from(10_u8).pow(clamp_decimals(decimals))
}

/// Formata um inteiro (possivelmente negativo) com ponto decimal fixo.
#[must_use]
#[allow(
    clippy::arithmetic_side_effects,
    reason = "aritmética de tamanhos de string; saturating onde importa"
)]
pub fn format_fixed(integer: &str, decimals: u32) -> String {
    let decimals = clamp_decimals(decimals);
    if decimals == 0 {
        return integer.to_string();
    }
    let (sign, digits) = integer
        .strip_prefix('-')
        .map_or(("", integer), |rest| ("-", rest));
    let width = usize::try_from(decimals).unwrap_or(usize::MAX);
    let int_len = digits.len().saturating_sub(width);
    let frac_len = digits.len().saturating_sub(int_len);
    let mut out = String::with_capacity(sign.len().saturating_add(width).saturating_add(2));
    out.push_str(sign);
    if int_len == 0 {
        out.push('0');
    } else {
        out.push_str(digits.get(..int_len).unwrap_or(""));
    }
    out.push('.');
    for _ in frac_len..width {
        out.push('0');
    }
    out.push_str(digits.get(int_len..).unwrap_or(""));
    out
}

/// Formata um racional aplicando a estratégia de arredondamento.
///
/// O resultado é truncado em `decimals` casas após o arredondamento, de modo
/// que a string tenha sempre exatamente `decimals` dígitos fracionários.
#[must_use]
pub fn format_decimal(value: &Rational, strategy: RoundingStrategy, decimals: u32) -> String {
    let decimals = clamp_decimals(decimals);
    let rounded = strategy.apply(value, decimals);
    let scaled = rounded.mul(&Rational::from_bigint(pow10(decimals)));
    let truncated = scaled.trunc();
    format_fixed(&truncated.numerator(), decimals)
}

/// Formata um número inteiro de unidades como decimal fixo.
#[must_use]
pub fn format_units(units: &Rational, decimals: u32) -> String {
    format_fixed(&units.numerator(), decimals)
}

/// Retorna o valor escalado por `10^decimals` como inteiro.
#[must_use]
pub fn scaled_bigint(value: &Rational, strategy: RoundingStrategy, decimals: u32) -> BigInt {
    let decimals = clamp_decimals(decimals);
    let rounded = strategy.apply(value, decimals);
    let numerator = rounded
        .numerator()
        .parse::<BigInt>()
        .unwrap_or_else(|_| BigInt::from(0));
    let denominator = rounded
        .denominator()
        .parse::<BigInt>()
        .unwrap_or_else(|_| BigInt::from(1));
    (numerator * pow10(decimals)) / denominator
}

#[cfg(test)]
mod tests {
    use super::*;
    use calc_auy_core::Limits;

    fn rational(numerator: i64, denominator: i64) -> Rational {
        Rational::new_checked(numerator, denominator, &Limits::default()).expect("racional")
    }

    #[test]
    fn formats_fixed_point() {
        assert_eq!(format_fixed("1510900", 2), "15109.00");
        assert_eq!(format_fixed("78", 2), "0.78");
        assert_eq!(format_fixed("-5", 3), "-0.005");
        assert_eq!(format_fixed("0", 0), "0");
    }

    #[test]
    fn formats_decimal_with_rounding() {
        let value = rational(1, 3);
        assert_eq!(format_decimal(&value, RoundingStrategy::Nbr5891, 2), "0.33");
        assert_eq!(
            format_decimal(&rational(2, 3), RoundingStrategy::HalfUp, 2),
            "0.67"
        );
        assert_eq!(
            format_decimal(&rational(3, 2), RoundingStrategy::HalfEven, 0),
            "2"
        );
    }

    #[test]
    fn scaled_matches_decimal() {
        let value = rational(15109, 1);
        assert_eq!(
            scaled_bigint(&value, RoundingStrategy::None, 2),
            BigInt::from(1510900)
        );
    }
}
