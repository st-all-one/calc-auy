//! Estratégias de arredondamento para racionais.
//!
//! Implementa as estratégias: `Nbr5891`, `HalfUp`, `HalfEven`, `Truncate`, `Ceil`, `None`.

use num_bigint::BigInt;
use serde::{Deserialize, Serialize};

use super::rational::Rational;

/// Estratégias de arredondamento.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[non_exhaustive]
pub enum RoundingStrategy {
    /// Arredondamento conforme NBR 5891 (metade para cima).
    Nbr5891,
    /// Arredondamento para cima em caso de metade.
    HalfUp,
    /// Arredondamento para o par mais próximo em caso de metade.
    HalfEven,
    /// Truncamento (remover decimais).
    Truncate,
    /// Teto (arredondar para cima).
    Ceil,
    /// Sem arredondamento.
    None,
}

impl RoundingStrategy {
    /// Retorna o nome estável em `snake_case`.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Nbr5891 => "nbr5891",
            Self::HalfUp => "half_up",
            Self::HalfEven => "half_even",
            Self::Truncate => "truncate",
            Self::Ceil => "ceil",
            Self::None => "none",
        }
    }

    /// Aplica a estratégia de arredondamento a um racional.
    #[must_use]
    pub fn apply(self, value: &Rational, decimals: u32) -> Rational {
        match self {
            Self::None => value.clone(),
            Self::Truncate => truncate(value, decimals),
            Self::Ceil => ceil(value, decimals),
            Self::HalfUp | Self::Nbr5891 => half_up(value, decimals),
            Self::HalfEven => half_even(value, decimals),
        }
    }
}

/// Calcula `10^exp`.
fn pow10(exp: u32) -> BigInt {
    BigInt::from(10u64).pow(exp)
}

/// Multiplica o valor por `10^decimals`.
fn scale(value: &Rational, decimals: u32) -> Rational {
    value.mul(&Rational::from_bigint(pow10(decimals)))
}

/// Divide o valor por `10^decimals`.
fn unscale(value: &Rational, decimals: u32) -> Rational {
    let factor = Rational::from_bigint(pow10(decimals));
    value.checked_div(&factor).unwrap_or_else(|_| value.clone())
}

/// Truncamento: remove os decimais sem arredondar.
fn truncate(value: &Rational, decimals: u32) -> Rational {
    let scaled = scale(value, decimals);
    unscale(&scaled.trunc(), decimals)
}

/// Teto: arredonda para cima.
fn ceil(value: &Rational, decimals: u32) -> Rational {
    let scaled = scale(value, decimals);
    unscale(&scaled.ceil(), decimals)
}

/// `HalfUp`: arredonda para cima em caso de metade.
fn half_up(value: &Rational, decimals: u32) -> Rational {
    let scaled = scale(value, decimals);
    let floor = scaled.floor();
    let diff = scaled.sub(&floor);

    let rounded = if diff >= Rational::HALF {
        floor.add(&Rational::ONE)
    } else {
        floor
    };

    unscale(&rounded, decimals)
}

/// `HalfEven`: arredonda para o par mais próximo em caso de metade.
fn half_even(value: &Rational, decimals: u32) -> Rational {
    let scaled = scale(value, decimals);
    let floor = scaled.floor();
    let diff = scaled.sub(&floor);

    let rounded = match diff.cmp(&Rational::HALF) {
        std::cmp::Ordering::Greater => floor.add(&Rational::ONE),
        std::cmp::Ordering::Equal => {
            let quotient = floor.trunc();
            let is_even = quotient
                .checked_rem(&Rational::from_i64(2))
                .is_ok_and(|remainder| remainder.is_zero());
            if is_even {
                floor
            } else {
                floor.add(&Rational::ONE)
            }
        }
        std::cmp::Ordering::Less => floor,
    };

    unscale(&rounded, decimals)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::limits::Limits;

    fn rational(numerator: i64, denominator: i64) -> Rational {
        Rational::new_checked(numerator, denominator, &Limits::default()).expect("racional válido")
    }

    #[test]
    fn rounding_none() {
        let value = rational(1, 3);
        assert_eq!(RoundingStrategy::None.apply(&value, 2), value);
    }

    #[test]
    fn rounding_truncate() {
        let value = rational(1, 3);
        assert_eq!(
            RoundingStrategy::Truncate.apply(&value, 2),
            rational(33, 100)
        );
    }

    #[test]
    fn rounding_half_up() {
        let value = rational(1, 2);
        assert_eq!(RoundingStrategy::HalfUp.apply(&value, 0), Rational::ONE);
    }

    #[test]
    fn rounding_half_even() {
        let value = rational(1, 2);
        assert_eq!(RoundingStrategy::HalfEven.apply(&value, 0), Rational::ZERO);
    }

    #[test]
    fn rounding_half_even_rounds_to_even() {
        let value = rational(3, 2);
        assert_eq!(
            RoundingStrategy::HalfEven.apply(&value, 0),
            Rational::from_i64(2)
        );
    }

    #[test]
    fn rounding_ceil() {
        let value = rational(1, 3);
        assert_eq!(RoundingStrategy::Ceil.apply(&value, 2), rational(34, 100));
    }
}
