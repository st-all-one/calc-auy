//! Backend numérico com trait selado.
//!
//! O trait [`Numeric`] é selado: apenas os tipos exatos definidos neste crate
//! podem implementá-lo. `f64`/`f32` **não** implementam (erro de compilação),
//! o que garante que nenhum ponto flutuante entre na aritmética exata.

use std::fmt::Debug;

use num_bigint::BigInt;
use num_traits::ToPrimitive;

/// Trait selado para tipos numéricos exatos.
///
/// As operações são verificadas: `checked_*` retorna `None` em overflow,
/// sinalizando promoção para o próximo tipo mais largo.
pub trait Numeric: private::Sealed + Sized + Clone + Debug + Eq {
    /// Tipo mais largo (ex.: `u64` → `u128`).
    type Wide: Numeric;

    /// Adição verificada. Retorna `None` em overflow.
    fn checked_add(self, other: Self) -> Option<Self>;

    /// Subtração verificada. Retorna `None` em underflow.
    fn checked_sub(self, other: Self) -> Option<Self>;

    /// Multiplicação verificada. Retorna `None` em overflow.
    fn checked_mul(self, other: Self) -> Option<Self>;

    /// Converte para `BigInt` (sem perda).
    fn to_bigint(&self) -> BigInt;

    /// Converte de `BigInt`, se couber no tipo.
    fn from_bigint(value: &BigInt) -> Option<Self>;
}

impl Numeric for u64 {
    type Wide = u128;

    fn checked_add(self, other: Self) -> Option<Self> {
        Self::checked_add(self, other)
    }

    fn checked_sub(self, other: Self) -> Option<Self> {
        Self::checked_sub(self, other)
    }

    fn checked_mul(self, other: Self) -> Option<Self> {
        Self::checked_mul(self, other)
    }

    fn to_bigint(&self) -> BigInt {
        BigInt::from(*self)
    }

    fn from_bigint(value: &BigInt) -> Option<Self> {
        value.to_u64()
    }
}

impl Numeric for u128 {
    type Wide = Self;

    fn checked_add(self, other: Self) -> Option<Self> {
        Self::checked_add(self, other)
    }

    fn checked_sub(self, other: Self) -> Option<Self> {
        Self::checked_sub(self, other)
    }

    fn checked_mul(self, other: Self) -> Option<Self> {
        Self::checked_mul(self, other)
    }

    fn to_bigint(&self) -> BigInt {
        BigInt::from(*self)
    }

    fn from_bigint(value: &BigInt) -> Option<Self> {
        value.to_u128()
    }
}

impl Numeric for BigInt {
    type Wide = Self;

    fn checked_add(self, other: Self) -> Option<Self> {
        Some(self + other)
    }

    fn checked_sub(self, other: Self) -> Option<Self> {
        Some(self - other)
    }

    fn checked_mul(self, other: Self) -> Option<Self> {
        Some(self * other)
    }

    fn to_bigint(&self) -> BigInt {
        self.clone()
    }

    fn from_bigint(value: &BigInt) -> Option<Self> {
        Some(value.clone())
    }
}

/// Módulo privado que sela o trait [`Numeric`].
mod private {
    /// Marca os tipos que podem implementar [`super::Numeric`].
    pub trait Sealed {}

    impl Sealed for u64 {}
    impl Sealed for u128 {}
    impl Sealed for num_bigint::BigInt {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn u64_overflow_returns_none() {
        assert_eq!(u64::checked_add(1, 2), Some(3));
        assert_eq!(u64::checked_add(u64::MAX, 1), None);
        assert_eq!(u64::checked_sub(1, 3), None);
        assert_eq!(u64::checked_mul(u64::MAX, 2), None);
    }

    #[test]
    fn u128_overflow_returns_none() {
        assert_eq!(u128::checked_add(1, 2), Some(3));
        assert_eq!(u128::checked_add(u128::MAX, 1), None);
        assert_eq!(u128::checked_mul(u128::MAX, 2), None);
    }

    #[test]
    fn bigint_never_overflows() {
        let value = BigInt::from(u64::MAX);
        assert_eq!(value.clone().checked_mul(value.clone()), Some(value.pow(2)));
    }

    #[test]
    fn conversions_round_trip() {
        let value = 42_u64;
        assert_eq!(u64::from_bigint(&value.to_bigint()), Some(value));
        assert_eq!(u64::from_bigint(&BigInt::from(u128::MAX)), None);
    }
}
