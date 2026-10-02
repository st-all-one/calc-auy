//! Rateio por maior resto (Maior Resto) preservando a soma.

use calc_auy_core::{CalcAuyError, Rational};

use crate::decimal::{format_units, pow10};
use crate::output::Output;

/// Soma uma unidade a uma parcela, se o índice existir.
fn assign_unit(floors: &mut [Rational], index: usize) {
    if let Some(slot) = floors.get_mut(index) {
        *slot = slot.add(&Rational::ONE);
    }
}

/// Distribui `count` unidades pelos maiores restos.
fn distribute(floors: &mut [Rational], order: &[(usize, Rational)], count: usize) {
    for (index, _) in order.iter().take(count) {
        assign_unit(floors, *index);
    }
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

    /// Executa o rateio de maior resto sobre os pesos fornecidos.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se a soma dos pesos for zero.
    fn slice_by_weights(&self, weights: &[Rational]) -> Result<Vec<String>, CalcAuyError> {
        if weights.is_empty() {
            return Ok(Vec::new());
        }
        let decimals = self.effective_decimals();
        let total = self.strategy().apply(self.to_raw(), decimals);
        let scale = Rational::from_bigint(pow10(decimals));
        let total_units = total.mul(&scale).trunc();

        let weight_sum = weights
            .iter()
            .fold(Rational::ZERO, |acc, weight| acc.add(weight));
        if weight_sum.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }

        let mut floors = Vec::with_capacity(weights.len());
        let mut remainders = Vec::with_capacity(weights.len());
        let mut assigned = Rational::ZERO;
        for (index, weight) in weights.iter().enumerate() {
            let share = total_units.mul(weight).checked_div(&weight_sum)?;
            let floor = share.floor();
            let remainder = share.sub(&floor);
            assigned = assigned.add(&floor);
            floors.push(floor);
            remainders.push((index, remainder));
        }

        let remaining = total_units.sub(&assigned).trunc();
        let remaining_units = remaining.numerator().parse::<usize>().unwrap_or(0);
        remainders.sort_by(|left, right| right.1.cmp(&left.1).then(left.0.cmp(&right.0)));
        distribute(&mut floors, &remainders, remaining_units);

        Ok(floors
            .iter()
            .map(|units| format_units(units, decimals))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distribute_prefers_largest_remainders() {
        let mut floors = vec![
            Rational::from_i64(33),
            Rational::from_i64(33),
            Rational::from_i64(33),
        ];
        let order = [
            (
                2,
                Rational::new_checked(1, 3, &calc_auy_core::Limits::default()).expect("r"),
            ),
            (
                0,
                Rational::new_checked(1, 3, &calc_auy_core::Limits::default()).expect("r"),
            ),
        ];
        distribute(&mut floors, &order, 1);
        assert_eq!(floors.get(2), Some(&Rational::from_i64(34)));
        assert_eq!(floors.get(0), Some(&Rational::from_i64(33)));
    }
}
