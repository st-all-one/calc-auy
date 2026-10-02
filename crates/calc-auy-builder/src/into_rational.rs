//! Ingestão de valores para racionais, sem `f64` (trait selado).

use num_bigint::BigInt;

use calc_auy_core::numeric::parse::parse_rational;
use calc_auy_core::{CalcAuyError, Limits, Rational};

/// Módulo de selagem: só tipos deste crate implementam [`IntoRational`].
mod sealed {
    /// Trait de selagem.
    pub trait Sealed {}
}

/// Conversão infalível-para-o-chamador de valores em [`Rational`].
///
/// O trait é **selado** (ADR-007): crates externos não podem implementá-lo, o
/// que impede a entrada de `f64` e de tipos arbitrários no domínio assinado.
pub trait IntoRational: sealed::Sealed {
    /// Converte o valor em racional, respeitando os limites.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar (texto inválido) ou se o
    /// valor exceder `max_bits`.
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError>;
}

/// Verifica o orçamento de bits de um racional pronto.
///
/// # Errors
///
/// Retorna [`CalcAuyError::LimitExceeded`] se o valor exceder `max_bits`.
fn check(value: Rational, limits: &Limits) -> Result<Rational, CalcAuyError> {
    limits.check_bits(value.bits())?;
    Ok(value)
}

/// Constrói um racional inteiro a partir de um [`BigInt`], validando bits.
///
/// # Errors
///
/// Retorna [`CalcAuyError::LimitExceeded`] se o valor exceder `max_bits`.
fn from_integer(value: BigInt, limits: &Limits) -> Result<Rational, CalcAuyError> {
    Rational::new_bigint_checked(value, BigInt::from(1_u8), limits)
}

macro_rules! impl_signed {
    ($($ty:ty),*) => {
        $(
            impl sealed::Sealed for $ty {}

            impl IntoRational for $ty {
                fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
                    check(Rational::from_i64(i64::from(self)), limits)
                }
            }
        )*
    };
}

impl_signed!(i8, i16, i32, i64);

impl sealed::Sealed for u64 {}

impl IntoRational for u64 {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        check(Rational::from_u64(self), limits)
    }
}

impl sealed::Sealed for i128 {}

impl IntoRational for i128 {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        from_integer(BigInt::from(self), limits)
    }
}

impl sealed::Sealed for u128 {}

impl IntoRational for u128 {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        from_integer(BigInt::from(self), limits)
    }
}

impl sealed::Sealed for BigInt {}

impl IntoRational for BigInt {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        from_integer(self, limits)
    }
}

impl sealed::Sealed for &str {}

impl IntoRational for &str {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        parse_rational(self, limits)
    }
}

impl sealed::Sealed for String {}

impl IntoRational for String {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        parse_rational(&self, limits)
    }
}

impl sealed::Sealed for Rational {}

impl IntoRational for Rational {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        check(self, limits)
    }
}

impl sealed::Sealed for &Rational {}

impl IntoRational for &Rational {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError> {
        check(self.clone(), limits)
    }
}
