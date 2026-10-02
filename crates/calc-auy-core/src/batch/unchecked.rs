//! Harness A/B: kernel `safe` e gêmea `unsafe` (T08.5).
//!
//! A adoção do caminho `unsafe` exige ganho comprovado e validação por Miri
//! (ADR-009). Miri não está disponível no toolchain pinado; por isso o caminho
//! padrão permanece o seguro e esta gêmea existe apenas para medição
//! diferencial.

/// Soma de produtos `n_i * d_i` com acumulador `u128` (versão segura).
#[must_use]
pub fn dot_products_safe(nums: &[u64], dens: &[u64]) -> u128 {
    let mut accumulator: u128 = 0;
    for (numerator, denominator) in nums.iter().zip(dens) {
        let product = u128::from(*numerator).wrapping_mul(u128::from(*denominator));
        accumulator = accumulator.wrapping_add(product);
    }
    accumulator
}

/// Versão `unsafe` com `get_unchecked` (mesma semântica da segura).
#[allow(unsafe_code, reason = "A/B controlado; mantido fora do caminho padrão")]
#[must_use]
pub fn dot_products_unchecked(nums: &[u64], dens: &[u64]) -> u128 {
    let length = nums.len().min(dens.len());
    let mut accumulator: u128 = 0;
    for index in 0..length {
        // SAFETY: `index < length <= nums.len()` e `index < length <= dens.len()`,
        // então ambos os acessos estão dentro dos limites.
        let numerator = unsafe { *nums.get_unchecked(index) };
        let denominator = unsafe { *dens.get_unchecked(index) };
        let product = u128::from(numerator).wrapping_mul(u128::from(denominator));
        accumulator = accumulator.wrapping_add(product);
    }
    accumulator
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_and_unsafe_agree() {
        let nums = [1_u64, 2, 3, 4, 5];
        let dens = [6_u64, 7, 8, 9, 10];
        assert_eq!(
            dot_products_safe(&nums, &dens),
            dot_products_unchecked(&nums, &dens)
        );
    }

    #[test]
    fn mismatched_lengths_agree() {
        let nums = [1_u64, 2, 3];
        let dens = [4_u64, 5];
        assert_eq!(
            dot_products_safe(&nums, &dens),
            dot_products_unchecked(&nums, &dens)
        );
    }

    #[test]
    fn empty_inputs_agree() {
        assert_eq!(dot_products_safe(&[], &[]), 0);
        assert_eq!(dot_products_unchecked(&[], &[]), 0);
    }
}
