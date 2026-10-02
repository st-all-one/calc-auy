//! Racional híbrido Small/Large.
//!
//! A semântica é única; a representação é adaptativa.
//! Invariantes (válidos em AMBAS as variantes):
//! - `d > 0` (denominador estritamente positivo; zero é `0/1`)
//! - `gcd(n, d) == 1` (sempre irredutível)

use std::cmp::Ordering;
use std::fmt;
use std::hash::{Hash, Hasher};

use num_bigint::BigInt;
use num_traits::{One, Signed, ToPrimitive, Zero};

use crate::error::CalcAuyError;
use crate::limits::Limits;

use super::gcd::{gcd_bigint, gcd_u64, gcd_u128};

/// Racional exato. A semântica é única; a representação é adaptativa.
///
/// Invariantes (válidos em AMBAS as variantes):
/// - `d > 0` (denominador estritamente positivo; zero é `0/1`)
/// - `gcd(n, d) == 1` (sempre irredutível)
#[derive(Clone)]
pub struct Rational {
    repr: Repr,
}

#[derive(Clone)]
enum Repr {
    /// Caminho rápido. `n`, `d` cabem em u64 e a fração é canônica.
    Small { n: u64, d: u64 },
    /// Caminho de precisão arbitrária. Mesmos invariantes.
    Large { n: BigInt, d: BigInt },
}

/// Cria um `Repr` a partir de um par `u128` já canônico.
///
/// Rebaixa para `Small` quando ambos os componentes cabem em `u64`.
fn repr_from_u128(num: u128, den: u128) -> Repr {
    match (u64::try_from(num), u64::try_from(den)) {
        (Ok(n), Ok(d)) => Repr::Small { n, d },
        _ => Repr::Large {
            n: BigInt::from(num),
            d: BigInt::from(den),
        },
    }
}

/// Cria um `Repr` `Large` a partir de um par `BigInt` já canônico.
const fn repr_large(num: BigInt, den: BigInt) -> Repr {
    Repr::Large { n: num, d: den }
}

/// Reduz o par `u128` pelo seu GCD. O denominador é sempre positivo.
fn reduce_u128(num: u128, den: u128) -> Repr {
    let divisor = gcd_u128(num, den);
    match (num.checked_div(divisor), den.checked_div(divisor)) {
        (Some(n), Some(d)) => repr_from_u128(n, d),
        _ => Repr::Small { n: 0, d: 1 },
    }
}

/// Soma no caminho `Small`, promovendo para `Large` em overflow.
fn add_small(a_n: u64, a_d: u64, b_n: u64, b_d: u64) -> Repr {
    let a_d = u128::from(a_d);
    let b_d = u128::from(b_d);
    let left = u128::from(a_n).wrapping_mul(b_d);
    let right = u128::from(b_n).wrapping_mul(a_d);
    let den = a_d.wrapping_mul(b_d);

    if let Some(num) = left.checked_add(right) {
        return reduce_u128(num, den);
    }

    // Overflow em `u128`: promove para precisão arbitrária.
    let num = BigInt::from(a_n) * BigInt::from(b_d) + BigInt::from(b_n) * BigInt::from(a_d);
    let den = BigInt::from(a_d) * BigInt::from(b_d);
    let divisor = gcd_bigint(&num, &den);
    repr_large(&num / &divisor, &den / &divisor)
}

/// Multiplica no caminho `Small`, promovendo para `Large` se necessário.
fn mul_small(a_n: u64, a_d: u64, b_n: u64, b_d: u64) -> Repr {
    let num = u128::from(a_n).wrapping_mul(u128::from(b_n));
    let den = u128::from(a_d).wrapping_mul(u128::from(b_d));
    reduce_u128(num, den)
}

/// Trunca `n / d` em direção a zero.
fn trunc_u64(n: u64, d: u64) -> u64 {
    n.checked_div(d).unwrap_or(0)
}

/// Teto de `n / d` para valores não negativos.
fn ceil_u64(n: u64, d: u64) -> u64 {
    let quotient = trunc_u64(n, d);
    let remainder = n.checked_rem(d).unwrap_or(0);
    if remainder == 0 {
        quotient
    } else {
        quotient.saturating_add(1)
    }
}

/// Piso de `n / d` em `BigInt` (arredonda em direção a -infinito).
fn floor_bigint(n: &BigInt, d: &BigInt) -> BigInt {
    let quotient = n / d;
    let remainder = n % d;
    if !remainder.is_zero() && n.is_negative() {
        quotient - BigInt::one()
    } else {
        quotient
    }
}

/// Teto de `n / d` em `BigInt` (arredonda em direção a +infinito).
fn ceil_bigint(n: &BigInt, d: &BigInt) -> BigInt {
    let quotient = n / d;
    let remainder = n % d;
    if !remainder.is_zero() && n.is_positive() {
        quotient + BigInt::one()
    } else {
        quotient
    }
}

/// Raiz `n`-ésima exata de um `BigInt`, se existir.
fn exact_nth_root(value: &BigInt, n: u32) -> Option<BigInt> {
    if value.is_negative() && n.is_multiple_of(2) {
        return None;
    }
    let magnitude = value.abs();
    let candidate = magnitude.nth_root(n);
    if candidate.pow(n) != magnitude {
        return None;
    }
    Some(if value.is_negative() {
        -candidate
    } else {
        candidate
    })
}

impl Rational {
    /// Zero como constante (`0/1`).
    pub const ZERO: Self = Self {
        repr: Repr::Small { n: 0, d: 1 },
    };

    /// Um como constante (`1/1`).
    pub const ONE: Self = Self {
        repr: Repr::Small { n: 1, d: 1 },
    };

    /// Um meio como constante (`1/2`).
    pub const HALF: Self = Self {
        repr: Repr::Small { n: 1, d: 2 },
    };

    /// Cria um racional a partir de um inteiro com sinal.
    #[must_use]
    pub fn from_i64(value: i64) -> Self {
        Self::from_bigint(BigInt::from(value))
    }

    /// Cria um racional a partir de um inteiro sem sinal.
    #[must_use]
    pub const fn from_u64(value: u64) -> Self {
        Self {
            repr: Repr::Small { n: value, d: 1 },
        }
    }

    /// Retorna os componentes `(n, d)` se ambos couberem em `u64`.
    #[must_use]
    pub const fn as_small(&self) -> Option<(u64, u64)> {
        match &self.repr {
            Repr::Small { n, d } => Some((*n, *d)),
            Repr::Large { .. } => None,
        }
    }

    /// Cria um racional a partir de um par `u64`, normalizando e validando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se `denominator` for zero e
    /// [`CalcAuyError::LimitExceeded`] se os limites forem excedidos.
    pub fn from_u64_pair(
        numerator: u64,
        denominator: u64,
        limits: &Limits,
    ) -> Result<Self, CalcAuyError> {
        if denominator == 0 {
            return Err(CalcAuyError::DivisionByZero);
        }
        if numerator == 0 {
            return Ok(Self::ZERO);
        }
        let divisor = gcd_u64(numerator, denominator);
        let n = numerator.checked_div(divisor).unwrap_or(numerator);
        let d = denominator.checked_div(divisor).unwrap_or(denominator);
        let numerator_bits = 64_u32.saturating_sub(n.leading_zeros());
        let denominator_bits = 64_u32.saturating_sub(d.leading_zeros());
        limits.check_bits(u64::from(numerator_bits.max(denominator_bits)))?;
        Ok(Self {
            repr: Repr::Small { n, d },
        })
    }

    /// Cria um racional a partir de um `BigInt`.
    #[must_use]
    pub fn from_bigint(value: BigInt) -> Self {
        match value.to_u64() {
            Some(0) => Self::ZERO,
            Some(1) => Self::ONE,
            Some(n) => Self {
                repr: Repr::Small { n, d: 1 },
            },
            None => Self {
                repr: Repr::Large {
                    n: value,
                    d: BigInt::one(),
                },
            },
        }
    }

    /// Cria um racional a partir de inteiros, validando os limites.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se `denominator` for zero e
    /// [`CalcAuyError::LimitExceeded`] se os limites forem excedidos.
    pub fn new_checked(
        numerator: i64,
        denominator: i64,
        limits: &Limits,
    ) -> Result<Self, CalcAuyError> {
        Self::new_bigint_checked(BigInt::from(numerator), BigInt::from(denominator), limits)
    }

    /// Cria um racional a partir de `BigInt`s, validando os limites.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se `denominator` for zero e
    /// [`CalcAuyError::LimitExceeded`] se os limites forem excedidos.
    pub fn new_bigint_checked(
        numerator: BigInt,
        denominator: BigInt,
        limits: &Limits,
    ) -> Result<Self, CalcAuyError> {
        if denominator.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }
        if numerator.is_zero() {
            return Ok(Self::ZERO);
        }

        // Normaliza o sinal: o denominador é sempre positivo.
        let (numerator, denominator) = if denominator.is_negative() {
            (-numerator, -denominator)
        } else {
            (numerator, denominator)
        };

        let divisor = gcd_bigint(&numerator, &denominator);
        let numerator = numerator / &divisor;
        let denominator = denominator / &divisor;

        let bits = numerator.bits().max(denominator.bits());
        limits.check_bits(bits)?;

        match (numerator.to_u64(), denominator.to_u64()) {
            (Some(n), Some(d)) => Ok(Self {
                repr: Repr::Small { n, d },
            }),
            _ => Ok(Self {
                repr: Repr::Large {
                    n: numerator,
                    d: denominator,
                },
            }),
        }
    }

    /// Retorna o numerador como string decimal.
    #[must_use]
    pub fn numerator(&self) -> String {
        match &self.repr {
            Repr::Small { n, .. } => n.to_string(),
            Repr::Large { n, .. } => n.to_string(),
        }
    }

    /// Retorna o denominador como string decimal.
    #[must_use]
    pub fn denominator(&self) -> String {
        match &self.repr {
            Repr::Small { d, .. } => d.to_string(),
            Repr::Large { d, .. } => d.to_string(),
        }
    }

    /// Constrói a partir de strings decimais `n`/`d`, validando os limites.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se as strings não forem inteiros
    /// decimais válidos, [`CalcAuyError::DivisionByZero`] se `d` for zero e
    /// [`CalcAuyError::MathOverflow`] se o resultado exceder `max_bits`.
    pub fn from_decimal_strings(
        numerator: &str,
        denominator: &str,
        limits: &Limits,
    ) -> Result<Self, CalcAuyError> {
        let parse = |text: &str| {
            text.parse::<BigInt>()
                .map_err(|_| CalcAuyError::InvalidInput {
                    message: format!("inteiro decimal inválido: {text}"),
                })
        };
        let numer = parse(numerator)?;
        let denom = parse(denominator)?;
        Self::new_bigint_checked(numer, denom, limits)
    }

    /// Retorna o número de bits do maior componente (`n` ou `d`).
    #[must_use]
    pub fn bits(&self) -> u64 {
        match &self.repr {
            Repr::Small { n, d } => {
                let numerator = u64::from(64_u32.saturating_sub(n.leading_zeros()));
                let denominator = u64::from(64_u32.saturating_sub(d.leading_zeros()));
                numerator.max(denominator)
            }
            Repr::Large { n, d } => n.bits().max(d.bits()),
        }
    }

    /// Retorna `true` se o valor é zero.
    #[must_use]
    pub fn is_zero(&self) -> bool {
        match &self.repr {
            Repr::Small { n, .. } => *n == 0,
            Repr::Large { n, .. } => n.is_zero(),
        }
    }

    /// Retorna `true` se o valor é positivo.
    #[must_use]
    pub fn is_positive(&self) -> bool {
        match &self.repr {
            Repr::Small { n, .. } => *n > 0,
            Repr::Large { n, .. } => n.is_positive(),
        }
    }

    /// Retorna `true` se o valor é negativo.
    #[must_use]
    pub fn is_negative(&self) -> bool {
        match &self.repr {
            Repr::Small { .. } => false,
            Repr::Large { n, .. } => n.is_negative(),
        }
    }

    /// Retorna o valor absoluto.
    #[must_use]
    pub fn abs(&self) -> Self {
        if self.is_negative() {
            self.neg()
        } else {
            self.clone()
        }
    }

    /// Soma infalível (promove em overflow).
    #[must_use]
    pub fn add(&self, other: &Self) -> Self {
        if let (Repr::Small { n: a_n, d: a_d }, Repr::Small { n: b_n, d: b_d }) =
            (&self.repr, &other.repr)
        {
            return Self {
                repr: add_small(*a_n, *a_d, *b_n, *b_d),
            };
        }
        let a_n = self.numerator_bigint();
        let a_d = self.denominator_bigint();
        let b_n = other.numerator_bigint();
        let b_d = other.denominator_bigint();
        let num = &a_n * &b_d + &b_n * &a_d;
        let den = &a_d * &b_d;
        let divisor = gcd_bigint(&num, &den);
        Self {
            repr: repr_large(&num / &divisor, &den / &divisor),
        }
    }

    /// Subtração infalível (promove em overflow).
    #[must_use]
    pub fn sub(&self, other: &Self) -> Self {
        let negated = other.neg();
        self.add(&negated)
    }

    /// Multiplicação infalível (promove em overflow).
    #[must_use]
    pub fn mul(&self, other: &Self) -> Self {
        if let (Repr::Small { n: a_n, d: a_d }, Repr::Small { n: b_n, d: b_d }) =
            (&self.repr, &other.repr)
        {
            return Self {
                repr: mul_small(*a_n, *a_d, *b_n, *b_d),
            };
        }
        let a_n = self.numerator_bigint();
        let a_d = self.denominator_bigint();
        let b_n = other.numerator_bigint();
        let b_d = other.denominator_bigint();
        let num = &a_n * &b_n;
        let den = &a_d * &b_d;
        let divisor = gcd_bigint(&num, &den);
        Self {
            repr: repr_large(&num / &divisor, &den / &divisor),
        }
    }

    /// Negação.
    #[must_use]
    pub fn neg(&self) -> Self {
        match &self.repr {
            Repr::Small { n, d } if *n == 0 => Self::ZERO,
            Repr::Small { n, d } => Self {
                repr: repr_large(-BigInt::from(*n), BigInt::from(*d)),
            },
            Repr::Large { n, d } => Self {
                repr: Repr::Large {
                    n: -n,
                    d: d.clone(),
                },
            },
        }
    }

    /// Divisão verificada.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se `other` for zero.
    pub fn checked_div(&self, other: &Self) -> Result<Self, CalcAuyError> {
        if other.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }
        let reciprocal = other.recip();
        Ok(self.mul(&reciprocal))
    }

    /// Resto verificado (divisão truncada em direção a zero).
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] se `other` for zero.
    pub fn checked_rem(&self, other: &Self) -> Result<Self, CalcAuyError> {
        if other.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }
        let quotient = self.checked_div(other)?;
        let product = quotient.trunc().mul(other);
        Ok(self.sub(&product))
    }

    /// Potenciação racional exata (ADR-004).
    ///
    /// `(n/d)^(p/q)` é racional somente se `n` e `d` forem potências `q`-ésimas
    /// perfeitas. Caso contrário retorna [`CalcAuyError::IrrationalResult`].
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] para `0` elevado a expoente
    /// negativo, [`CalcAuyError::MathOverflow`] se o orçamento de bits for
    /// excedido e [`CalcAuyError::IrrationalResult`] se a raiz não for exata.
    pub fn pow(&self, exponent: &Self, limits: &Limits) -> Result<Self, CalcAuyError> {
        let numerator = exponent.numerator_bigint();
        let denominator = exponent.denominator_bigint();

        if denominator.is_one() {
            return self.pow_int(&numerator, limits);
        }

        let root_exponent =
            u32::try_from(&denominator).map_err(|_| CalcAuyError::IrrationalResult {
                base: self.to_string(),
                exp: exponent.to_string(),
            })?;

        let root_num = exact_nth_root(&self.numerator_bigint(), root_exponent);
        let root_den = exact_nth_root(&self.denominator_bigint(), root_exponent);

        match (root_num, root_den) {
            (Some(num), Some(den)) => {
                let base = Self::new_bigint_checked(num, den, limits)?;
                base.pow_int(&numerator, limits)
            }
            _ => Err(CalcAuyError::IrrationalResult {
                base: self.to_string(),
                exp: exponent.to_string(),
            }),
        }
    }

    /// Potenciação por expoente inteiro, com orçamento de bits (ADR-004).
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::DivisionByZero`] para `0` elevado a expoente
    /// negativo e [`CalcAuyError::MathOverflow`] se o orçamento de bits for
    /// excedido.
    pub fn pow_int(&self, exponent: &BigInt, limits: &Limits) -> Result<Self, CalcAuyError> {
        if exponent.is_zero() {
            return Ok(Self::ONE);
        }
        if self.is_zero() && exponent.is_negative() {
            return Err(CalcAuyError::DivisionByZero);
        }
        if self.is_zero() {
            return Ok(Self::ZERO);
        }

        let magnitude = exponent.abs();
        let exp_u32 = u32::try_from(&magnitude).map_err(|_| CalcAuyError::MathOverflow {
            max_bits: limits.max_bits,
            actual: u64::MAX,
        })?;

        let base_bits = self
            .numerator_bigint()
            .bits()
            .max(self.denominator_bigint().bits());
        let required = base_bits.saturating_mul(u64::from(exp_u32));
        if required > limits.max_bits {
            return Err(CalcAuyError::MathOverflow {
                max_bits: limits.max_bits,
                actual: required,
            });
        }

        let numerator = self.numerator_bigint().pow(exp_u32);
        let denominator = self.denominator_bigint().pow(exp_u32);

        if exponent.is_negative() {
            Self::new_bigint_checked(denominator, numerator, limits)
        } else {
            Self::new_bigint_checked(numerator, denominator, limits)
        }
    }

    /// Recíproco. Zero mapeia para zero.
    #[must_use]
    pub fn recip(&self) -> Self {
        match &self.repr {
            Repr::Small { n: 0, .. } => Self::ZERO,
            Repr::Small { n, d } => Self {
                repr: Repr::Small { n: *d, d: *n },
            },
            Repr::Large { n, d } => Self {
                repr: Repr::Large {
                    n: d.clone(),
                    d: n.clone(),
                },
            },
        }
    }

    /// Trunca em direção a zero (parte inteira).
    #[must_use]
    pub fn trunc(&self) -> Self {
        match &self.repr {
            Repr::Small { n, d } => Self {
                repr: Repr::Small {
                    n: trunc_u64(*n, *d),
                    d: 1,
                },
            },
            Repr::Large { n, d } => Self {
                repr: repr_large(n / d, BigInt::one()),
            },
        }
    }

    /// Piso (arredonda para baixo, em direção a -infinito).
    #[must_use]
    pub fn floor(&self) -> Self {
        match &self.repr {
            Repr::Small { n, d } => Self {
                repr: Repr::Small {
                    n: trunc_u64(*n, *d),
                    d: 1,
                },
            },
            Repr::Large { n, d } => Self {
                repr: repr_large(floor_bigint(n, d), BigInt::one()),
            },
        }
    }

    /// Teto (arredonda para cima, em direção a +infinito).
    #[must_use]
    pub fn ceil(&self) -> Self {
        match &self.repr {
            Repr::Small { n, d } => Self {
                repr: Repr::Small {
                    n: ceil_u64(*n, *d),
                    d: 1,
                },
            },
            Repr::Large { n, d } => Self {
                repr: repr_large(ceil_bigint(n, d), BigInt::one()),
            },
        }
    }

    /// Converte o numerador para `BigInt`.
    fn numerator_bigint(&self) -> BigInt {
        match &self.repr {
            Repr::Small { n, .. } => BigInt::from(*n),
            Repr::Large { n, .. } => n.clone(),
        }
    }

    /// Converte o denominador para `BigInt`.
    fn denominator_bigint(&self) -> BigInt {
        match &self.repr {
            Repr::Small { d, .. } => BigInt::from(*d),
            Repr::Large { d, .. } => d.clone(),
        }
    }

    /// Força a representação `Large` (apenas para testes de equivalência).
    #[cfg(test)]
    fn force_large(&self) -> Self {
        Self {
            repr: repr_large(self.numerator_bigint(), self.denominator_bigint()),
        }
    }
}

impl fmt::Debug for Rational {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.repr {
            Repr::Small { n, d } => write!(f, "{n}/{d}"),
            Repr::Large { n, d } => write!(f, "{n}/{d}"),
        }
    }
}

impl fmt::Display for Rational {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.repr {
            Repr::Small { n, d: 1 } => write!(f, "{n}"),
            Repr::Small { n, d } => write!(f, "{n}/{d}"),
            Repr::Large { n, d } if *d == BigInt::one() => write!(f, "{n}"),
            Repr::Large { n, d } => write!(f, "{n}/{d}"),
        }
    }
}

impl serde::Serialize for Rational {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;

        let mut state = serializer.serialize_struct("Rational", 2)?;
        state.serialize_field("n", &self.numerator())?;
        state.serialize_field("d", &self.denominator())?;
        state.end()
    }
}

impl<'de> serde::Deserialize<'de> for Rational {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(serde::Deserialize)]
        struct Wire {
            n: String,
            d: String,
        }

        let wire = Wire::deserialize(deserializer)?;
        Self::from_decimal_strings(&wire.n, &wire.d, &Limits::default())
            .map_err(serde::de::Error::custom)
    }
}

impl PartialEq for Rational {
    fn eq(&self, other: &Self) -> bool {
        if let (Repr::Small { n: a_n, d: a_d }, Repr::Small { n: b_n, d: b_d }) =
            (&self.repr, &other.repr)
        {
            return a_n == b_n && a_d == b_d;
        }
        let a_n = self.numerator_bigint();
        let a_d = self.denominator_bigint();
        let b_n = other.numerator_bigint();
        let b_d = other.denominator_bigint();
        &a_n * &b_d == &b_n * &a_d
    }
}

impl Eq for Rational {}

impl Hash for Rational {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.numerator_bigint().hash(state);
        self.denominator_bigint().hash(state);
    }
}

impl PartialOrd for Rational {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Rational {
    fn cmp(&self, other: &Self) -> Ordering {
        if let (Repr::Small { n: a_n, d: a_d }, Repr::Small { n: b_n, d: b_d }) =
            (&self.repr, &other.repr)
        {
            let left = u128::from(*a_n).wrapping_mul(u128::from(*b_d));
            let right = u128::from(*b_n).wrapping_mul(u128::from(*a_d));
            return left.cmp(&right);
        }
        let a_n = self.numerator_bigint();
        let a_d = self.denominator_bigint();
        let b_n = other.numerator_bigint();
        let b_d = other.denominator_bigint();
        (&a_n * &b_d).cmp(&(&b_n * &a_d))
    }
}

impl std::ops::Add for Rational {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self::add(&self, &other)
    }
}

impl std::ops::Sub for Rational {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self::sub(&self, &other)
    }
}

impl std::ops::Mul for Rational {
    type Output = Self;

    fn mul(self, other: Self) -> Self {
        Self::mul(&self, &other)
    }
}

impl std::ops::Neg for Rational {
    type Output = Self;

    fn neg(self) -> Self {
        Self::neg(&self)
    }
}

impl Zero for Rational {
    fn zero() -> Self {
        Self::ZERO
    }

    fn is_zero(&self) -> bool {
        self.is_zero()
    }
}

impl One for Rational {
    fn one() -> Self {
        Self::ONE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rational_zero_and_one() {
        assert_eq!(Rational::ZERO, Rational::from_i64(0));
        assert_eq!(Rational::ONE, Rational::from_i64(1));
    }

    #[test]
    fn rational_from_i64() {
        assert_eq!(Rational::from_i64(5).numerator(), "5");
        assert_eq!(Rational::from_i64(5).denominator(), "1");
        assert_eq!(Rational::from_i64(-3).numerator(), "-3");
    }

    #[test]
    fn rational_add() {
        let left = Rational::from_i64(1);
        let right = Rational::from_i64(2);
        assert_eq!(left.add(&right), Rational::from_i64(3));
    }

    #[test]
    fn rational_mul() {
        let left = Rational::from_i64(2);
        let right = Rational::from_i64(3);
        assert_eq!(left.mul(&right), Rational::from_i64(6));
    }

    #[test]
    fn rational_div() {
        let left = Rational::from_i64(6);
        let right = Rational::from_i64(2);
        let result = left.checked_div(&right).expect("divisão válida");
        assert_eq!(result, Rational::from_i64(3));
    }

    #[test]
    fn rational_div_by_zero() {
        let left = Rational::from_i64(6);
        let right = Rational::from_i64(0);
        assert!(left.checked_div(&right).is_err());
    }

    #[test]
    fn rational_comparison() {
        let left = Rational::from_i64(1);
        let right = Rational::from_i64(2);
        assert!(left < right);
        assert!(right > left);
    }

    #[test]
    fn rational_eq() {
        let left = Rational::from_i64(2);
        let right = Rational::from_i64(4);
        let third = Rational::new_checked(1, 2, &Limits::default()).expect("válido");
        let fourth = Rational::new_checked(2, 4, &Limits::default()).expect("válido");
        assert_eq!(third, fourth);
        assert_ne!(left, right);
    }

    #[test]
    fn rational_floor_negative() {
        let value = Rational::new_checked(-7, 2, &Limits::default()).expect("válido");
        assert_eq!(value.floor(), Rational::from_i64(-4));
        assert_eq!(value.ceil(), Rational::from_i64(-3));
        assert_eq!(value.trunc(), Rational::from_i64(-3));
    }

    #[test]
    fn rational_neg() {
        let value = Rational::from_i64(5);
        assert_eq!(value.neg(), Rational::from_i64(-5));
    }

    #[test]
    fn pow_int_basic() {
        let limits = Limits::default();
        let base = Rational::new_checked(2, 3, &limits).expect("válido");
        let result = base
            .pow_int(&BigInt::from(3), &limits)
            .expect("potência válida");
        assert_eq!(
            result,
            Rational::new_checked(8, 27, &limits).expect("válido")
        );
    }

    #[test]
    fn pow_zero_exponent_is_one() {
        let limits = Limits::default();
        let base = Rational::new_checked(2, 3, &limits).expect("válido");
        assert_eq!(
            base.pow_int(&BigInt::from(0), &limits).expect("válido"),
            Rational::ONE
        );
    }

    #[test]
    fn pow_negative_exponent() {
        let limits = Limits::default();
        let base = Rational::from_i64(2);
        let result = base
            .pow_int(&BigInt::from(-2), &limits)
            .expect("potência válida");
        assert_eq!(
            result,
            Rational::new_checked(1, 4, &limits).expect("válido")
        );
    }

    #[test]
    fn pow_rational_exact_root() {
        let limits = Limits::default();
        let base = Rational::new_checked(4, 9, &limits).expect("válido");
        let exponent = Rational::new_checked(1, 2, &limits).expect("válido");
        let result = base.pow(&exponent, &limits).expect("raiz exata");
        assert_eq!(
            result,
            Rational::new_checked(2, 3, &limits).expect("válido")
        );
    }

    #[test]
    fn pow_rational_irrational() {
        let limits = Limits::default();
        let base = Rational::new_checked(2, 3, &limits).expect("válido");
        let exponent = Rational::new_checked(1, 2, &limits).expect("válido");
        assert!(base.pow(&exponent, &limits).is_err());
    }

    #[test]
    fn pow_zero_base_negative_exponent() {
        let limits = Limits::default();
        let base = Rational::ZERO;
        assert!(base.pow_int(&BigInt::from(-1), &limits).is_err());
        assert_eq!(
            base.pow_int(&BigInt::from(3), &limits).expect("válido"),
            Rational::ZERO
        );
    }
}

#[cfg(test)]
mod proptests {
    use super::*;
    use proptest::prelude::*;

    fn rational_strategy() -> impl Strategy<Value = Rational> {
        (
            any::<i64>(),
            any::<i64>().prop_filter("denominador não nulo", |value| *value != 0),
        )
            .prop_map(|(numerator, denominator)| {
                Rational::new_checked(numerator, denominator, &Limits::default())
                    .expect("racional válido")
            })
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(256))]

        #[test]
        fn small_and_large_agree(left in rational_strategy(), right in rational_strategy()) {
            let large_left = left.force_large();
            let large_right = right.force_large();
            prop_assert_eq!(left.add(&right), large_left.add(&large_right));
            prop_assert_eq!(left.sub(&right), large_left.sub(&large_right));
            prop_assert_eq!(left.mul(&right), large_left.mul(&large_right));
        }

        #[test]
        fn add_is_commutative(left in rational_strategy(), right in rational_strategy()) {
            prop_assert_eq!(left.add(&right), right.add(&left));
        }

        #[test]
        fn mul_is_commutative(left in rational_strategy(), right in rational_strategy()) {
            prop_assert_eq!(left.mul(&right), right.mul(&left));
        }

        #[test]
        fn add_is_associative(
            a in rational_strategy(),
            b in rational_strategy(),
            c in rational_strategy(),
        ) {
            prop_assert_eq!(a.add(&b).add(&c), a.add(&b.add(&c)));
        }

        #[test]
        fn mul_is_associative(
            a in rational_strategy(),
            b in rational_strategy(),
            c in rational_strategy(),
        ) {
            prop_assert_eq!(a.mul(&b).mul(&c), a.mul(&b.mul(&c)));
        }

        #[test]
        fn multiplication_distributes_over_addition(
            a in rational_strategy(),
            b in rational_strategy(),
            c in rational_strategy(),
        ) {
            prop_assert_eq!(a.mul(&b.add(&c)), a.mul(&b).add(&a.mul(&c)));
        }

        #[test]
        fn additive_inverse(value in rational_strategy()) {
            prop_assert!(value.add(&value.neg()).is_zero());
        }

        #[test]
        fn multiplicative_identity(value in rational_strategy()) {
            prop_assert_eq!(value.mul(&Rational::ONE), value.clone());
        }
    }
}
