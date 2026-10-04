//! Rateio por maior resto (Maior Resto) preservando a soma.
//!
//! A implementação opera em **aritmética inteira** (`BigInt`): os pesos são
//! convertidos para um denominador comum uma única vez e o rateio vira um
//! `div_rem`. Isso evita as ~5·N operações `Rational` (cada uma com GCD) que
//! dominavam `to_slice(N)`.

use std::collections::BTreeMap;

use calc_auy_core::numeric::gcd::gcd_bigint;
use calc_auy_core::{CalcAuyError, Rational};
use num_bigint::BigInt;
use num_integer::Integer;
use num_traits::{One, Signed, ToPrimitive, Zero};

use crate::decimal::{format_fixed, pow10};
use crate::output::Output;

/// Menor múltiplo comum de dois inteiros (zero se ambos forem zero).
fn lcm(left: &BigInt, right: &BigInt) -> BigInt {
    let divisor = gcd_bigint(left, right);
    if divisor.is_zero() {
        return BigInt::zero();
    }
    (left / &divisor) * right
}

/// Quociente (arredondado para baixo) e resto em `[0, divisor)`.
fn div_rem_floor(numerator: &BigInt, divisor: &BigInt) -> (BigInt, BigInt) {
    let (mut quotient, mut remainder) = numerator.div_rem(divisor);
    if !remainder.is_zero() && numerator.is_negative() {
        quotient -= 1;
        remainder += divisor;
    }
    (quotient, remainder)
}

/// Formata um inteiro de unidades com ponto decimal fixo.
fn format_int_units(units: &BigInt, decimals: u32) -> String {
    format_fixed(&units.to_string(), decimals)
}

/// Rateio de maior resto quando todos os pesos são iguais (caso `to_slice(N)`).
fn equal_slice(total: &BigInt, parts: usize, decimals: u32) -> Vec<String> {
    let divisor = BigInt::from(parts);
    let (floor, remainder) = div_rem_floor(total, &divisor);
    let extra = remainder.to_usize().unwrap_or(0);
    // Duas strings formatadas uma única vez; cada parcela é um clone.
    let base = format_int_units(&floor, decimals);
    let bumped = format_int_units(&(&floor + BigInt::one()), decimals);
    (0..parts)
        .map(|index| {
            if index < extra {
                bumped.clone()
            } else {
                base.clone()
            }
        })
        .collect()
}

impl Output<'_> {
    /// Divide o resultado em `parts` parcelas iguais (método do maior resto).
    ///
    /// A soma das parcelas é exatamente o total truncado em
    /// [`Self::effective_decimals`].
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se a soma dos pesos for zero.
    pub fn to_slice(&self, parts: usize) -> Result<Vec<String>, CalcAuyError> {
        let weights = vec![Rational::ONE; parts];
        self.slice_by_weights(&weights)
    }

    /// Divide o resultado proporcionalmente aos `ratios` (maior resto).
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se a soma dos pesos for zero.
    pub fn to_slice_by_ratio(&self, ratios: &[Rational]) -> Result<Vec<String>, CalcAuyError> {
        self.slice_by_weights(ratios)
    }

    /// Divide o resultado proporcionalmente a razões textuais (`"5%"`, `"0.7"`).
    ///
    /// Aceita os mesmos formatos que [`parse_rational`](calc_auy_core::numeric::parse::parse_rational):
    /// percentuais, decimais, frações e inteiros.
    ///
    /// # Errors
    ///
    /// Retorna erro se alguma razão for inválida ou se a soma dos pesos for zero.
    pub fn to_slice_by_ratio_text(&self, ratios: &[&str]) -> Result<Vec<String>, CalcAuyError> {
        let limits = calc_auy_core::Limits::default();
        let parsed = ratios
            .iter()
            .map(|text| calc_auy_core::numeric::parse::parse_rational(text, &limits))
            .collect::<Result<Vec<_>, _>>()?;
        self.slice_by_weights(&parsed)
    }

    /// Executa o rateio de maior resto sobre os pesos fornecidos.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se a soma dos pesos for zero.
    fn slice_by_weights(&self, weights: &[Rational]) -> Result<Vec<String>, CalcAuyError> {
        let Some(first) = weights.first() else {
            return Ok(Vec::new());
        };
        let decimals = self.effective_decimals();
        let total = self.strategy().apply(self.to_raw(), decimals);
        let total_units = total.mul(&Rational::from_bigint(pow10(decimals))).trunc();
        let total_int = total_units.numerator_bigint();

        if weights.iter().all(|weight| weight == first) {
            return Ok(equal_slice(&total_int, weights.len(), decimals));
        }

        // Denominador comum: `w_i = a_i/b_i = c_i/L`, com `L = lcm(b_i)`.
        let mut common = BigInt::one();
        for weight in weights {
            common = lcm(&common, &weight.denominator_bigint());
        }
        if common.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }
        let mut scaled: Vec<BigInt> = Vec::with_capacity(weights.len());
        let mut weight_sum = BigInt::zero();
        for weight in weights {
            let coefficient = weight.numerator_bigint() * (&common / &weight.denominator_bigint());
            weight_sum += &coefficient;
            scaled.push(coefficient);
        }
        if weight_sum.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }
        Ok(distribute_remainders(
            &total_int,
            &scaled,
            &weight_sum,
            decimals,
        ))
    }
}

/// Calcula pisos e restos (`share_i = total·c_i / C`) e distribui o resto.
fn distribute_remainders(
    total: &BigInt,
    scaled: &[BigInt],
    weight_sum: &BigInt,
    decimals: u32,
) -> Vec<String> {
    let mut cache: BTreeMap<BigInt, (BigInt, BigInt)> = BTreeMap::new();
    let mut floors: Vec<BigInt> = Vec::with_capacity(scaled.len());
    let mut remainders: Vec<(usize, BigInt)> = Vec::with_capacity(scaled.len());
    let mut assigned = BigInt::zero();
    for (index, coefficient) in scaled.iter().enumerate() {
        let (floor, remainder) = cache
            .entry(coefficient.clone())
            .or_insert_with(|| div_rem_floor(&(total * coefficient), weight_sum))
            .clone();
        assigned += &floor;
        floors.push(floor);
        remainders.push((index, remainder));
    }
    let remaining = total - &assigned;
    remainders.sort_by(|left, right| right.1.cmp(&left.1).then(left.0.cmp(&right.0)));
    let extra = remaining.to_usize().unwrap_or(0);
    for (index, _) in remainders.iter().take(extra) {
        if let Some(slot) = floors.get_mut(*index) {
            *slot += BigInt::one();
        }
    }
    floors
        .iter()
        .map(|units| format_int_units(units, decimals))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn div_rem_floor_handles_negatives() {
        let divisor = BigInt::from(3);
        let (quotient, remainder) = div_rem_floor(&BigInt::from(-7), &divisor);
        assert_eq!(quotient, BigInt::from(-3));
        assert_eq!(remainder, BigInt::from(2));
    }

    #[test]
    fn equal_slice_preserves_sum() {
        let total = BigInt::from(100);
        let parts = equal_slice(&total, 3, 0);
        assert_eq!(parts, vec!["34", "33", "33"]);
    }

    #[test]
    fn lcm_matches_definition() {
        assert_eq!(lcm(&BigInt::from(4), &BigInt::from(6)), BigInt::from(12));
        assert_eq!(lcm(&BigInt::from(0), &BigInt::from(0)), BigInt::from(0));
    }
}
