//! GCD (Máximo Divisor Comum) com Binary GCD branchless.
//!
//! O algoritmo Binary GCD (Stein) é mais eficiente que Euclides para
//! números grandes porque usa operações de shift em vez de divisão.

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

/// Binary GCD branchless para u64.
///
/// Este algoritmo usa operações de shift em vez de divisão,
/// o que o torna mais eficiente para números grandes.
#[must_use]
pub const fn gcd_u64(mut left: u64, mut right: u64) -> u64 {
    if left == 0 {
        return right;
    }
    if right == 0 {
        return left;
    }

    // Conta os zeros à direita comuns
    let shift = (left | right).trailing_zeros();
    left >>= left.trailing_zeros();

    loop {
        right >>= right.trailing_zeros();
        if left > right {
            core::mem::swap(&mut left, &mut right);
        }
        right = right.wrapping_sub(left);
        if right == 0 {
            break;
        }
    }

    left << shift
}

/// Binary GCD branchless para u128.
#[must_use]
pub const fn gcd_u128(mut left: u128, mut right: u128) -> u128 {
    if left == 0 {
        return right;
    }
    if right == 0 {
        return left;
    }

    let shift = (left | right).trailing_zeros();
    left >>= left.trailing_zeros();

    loop {
        right >>= right.trailing_zeros();
        if left > right {
            core::mem::swap(&mut left, &mut right);
        }
        right = right.wrapping_sub(left);
        if right == 0 {
            break;
        }
    }

    left << shift
}

/// GCD para BigInt usando o algoritmo de Euclides.
///
/// O resultado é sempre não negativo.
#[must_use]
pub fn gcd_bigint(left: &BigInt, right: &BigInt) -> BigInt {
    let mut current = left.clone();
    let mut divisor = right.clone();

    while !divisor.is_zero() {
        let remainder = &current % &divisor;
        current.clone_from(&divisor);
        divisor = remainder;
    }

    current.abs()
}

/// GCD para i64 (com sinal).
///
/// # Panics
///
/// Nunca deve panicar: o GCD de dois valores `i64` cabe em `i64`.
#[must_use]
pub fn gcd_i64(left: i64, right: i64) -> i64 {
    let result = gcd_u64(left.unsigned_abs(), right.unsigned_abs());
    i64::try_from(result).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gcd_u64_basic() {
        assert_eq!(gcd_u64(12, 8), 4);
        assert_eq!(gcd_u64(8, 12), 4);
        assert_eq!(gcd_u64(0, 5), 5);
        assert_eq!(gcd_u64(5, 0), 5);
        assert_eq!(gcd_u64(0, 0), 0);
        assert_eq!(gcd_u64(7, 7), 7);
        assert_eq!(gcd_u64(1, 1), 1);
    }

    #[test]
    fn gcd_u64_large() {
        assert_eq!(gcd_u64(u64::MAX, 1), 1);
        assert_eq!(gcd_u64(u64::MAX, u64::MAX), u64::MAX);
        assert_eq!(gcd_u64(1_000_000_000_000, 1_000_000), 1_000_000);
    }

    #[test]
    fn gcd_u128_basic() {
        assert_eq!(gcd_u128(12, 8), 4);
        assert_eq!(gcd_u128(0, 5), 5);
        assert_eq!(gcd_u128(5, 0), 5);
    }

    #[test]
    fn gcd_bigint_basic() {
        let left = BigInt::from(12);
        let right = BigInt::from(8);
        assert_eq!(gcd_bigint(&left, &right), BigInt::from(4));
    }

    #[test]
    fn gcd_bigint_large() {
        let left = BigInt::from(1_000_000_000_000u64);
        let right = BigInt::from(1_000_000u64);
        assert_eq!(gcd_bigint(&left, &right), BigInt::from(1_000_000u64));
    }

    #[test]
    fn gcd_i64_basic() {
        assert_eq!(gcd_i64(12, 8), 4);
        assert_eq!(gcd_i64(-12, 8), 4);
        assert_eq!(gcd_i64(12, -8), 4);
        assert_eq!(gcd_i64(-12, -8), 4);
    }
}
