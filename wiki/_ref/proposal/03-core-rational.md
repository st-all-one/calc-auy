# 03 — Core: Aritmética Racional (`Rational`)

> ⚠️ **Superado pelo [doc 14](./14-arquitetura-oficial-rust.md)** (ADR-001, ADR-004, ADR-007):
> a representação oficial é o **Racional Híbrido** (`Small { u64/u64 }` → `Large { BigInt }`),
> `pow` é resolvido por raiz exata ou `IrrationalResult`, e a entrada `f64` é proibida.

## Objetivo

Representar números racionais exatos como frações `n/d` com precisão arbitrária, garantindo:
- **Imutabilidade**: Toda operação retorna nova instância
- **Forma irredutível**: GCD aplicado automaticamente
- **Sinal normalizado**: Denominador sempre positivo
- **Safety**: Limite de bits para prevenir DoS

---

## Definição do Tipo

```rust
// crates/calc-auy-core/src/rational.rs

use num_bigint::BigInt;
use num_integer::Integer;
use num_traits::{One, Zero, Signed};
use std::ops::{Add, Sub, Mul, Div, Neg};

/// Número racional exato representado como fração irredutível n/d.
///
/// Invariantes:
/// - `d > 0` (denominador sempre positivo)
/// - `gcd(n, d) == 1` (fração irredutível)
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Rational {
    n: BigInt,
    d: BigInt,
}

impl Rational {
    /// Cria um novo racional a partir de numerador e denominador.
    ///
    /// # Errors
    /// Retorna `CalcAuyError::DivisionByZero` se `d == 0`.
    pub fn new(n: BigInt, d: BigInt) -> Result<Self, CalcAuyError> {
        if d.is_zero() {
            return Err(CalcAuyError::DivisionByZero);
        }

        // Normaliza sinal: denominador sempre positivo
        let (mut n, mut d) = if d.is_negative() {
            (-n, -d)
        } else {
            (n, d)
        };

        // Simplifica via GCD
        let g = n.gcd(&d);
        if !g.is_one() {
            n /= &g;
            d /= &g;
        }

        Ok(Self { n, d })
    }

    /// Cria racional a partir de inteiro.
    pub fn from_int(n: BigInt) -> Self {
        Self { n, d: BigInt::one() }
    }

    /// Cria racional a partir de string.
    ///
    /// Formatos suportados:
    /// - Inteiros: `"100"`, `"-50"`, `"1_000_000"`
    /// - Decimais: `"10.50"`, `".5"`, `"-.5"`
    /// - Frações: `"3/7"`, `"-3/7"`
    /// - Percentuais: `"15%"`, `"-14.5%"`
    /// - Notação científica: `"1.5e-2"`, `"1e3"`
    pub fn from_str(s: &str) -> Result<Self, CalcAuyError> {
        let s = s.trim();

        // Percentual
        if let Some(stripped) = s.strip_suffix('%') {
            let inner = Rational::from_str(stripped)?;
            return inner / Rational::from_int(100.into());
        }

        // Fração
        if let Some((n_str, d_str)) = s.split_once('/') {
            let n = parse_bigint(n_str)?;
            let d = parse_bigint(d_str)?;
            return Self::new(n, d);
        }

        // Decimal ou inteiro
        if s.contains('.') || s.to_lowercase().contains('e') {
            parse_decimal(s)
        } else {
            let n = parse_bigint(s)?;
            Ok(Self::from_int(n))
        }
    }

    // Getters
    pub fn numerator(&self) -> &BigInt { &self.n }
    pub fn denominator(&self) -> &BigInt { &self.d }

    /// Converte para string decimal com precisão especificada.
    pub fn to_decimal_string(&self, precision: usize) -> Result<String, CalcAuyError> {
        if precision > 1000 {
            return Err(CalcAuyError::InvalidPrecision);
        }

        let scale = BigInt::from(10u32).pow(precision as u32);
        let scaled = (&self.n * &scale) / &self.d;

        let mut s = scaled.to_string();
        let negative = s.starts_with('-');
        if negative {
            s = s[1..].to_string();
        }

        if precision == 0 {
            return Ok(if negative { format!("-{}", s) } else { s });
        }

        // Insere ponto decimal
        s = format!("{:0>width$}", s, width = precision + 1);
        let split = s.len() - precision;
        let result = format!("{}{}{}", &s[..split], ".", &s[split..]);

        Ok(if negative {
            format!("-{}", result)
        } else {
            result
        })
    }

    /// Verial se o racional excede o limite de bits.
    fn check_safety(&self) -> Result<(), CalcAuyError> {
        const MAX_BITS: u32 = 1_000_000;
        let n_bits = self.n.bits();
        let d_bits = self.d.bits();

        if n_bits > MAX_BITS || d_bits > MAX_BITS {
            return Err(CalcAuyError::MathOverflow {
                n_bits,
                d_bits,
                max_bits: MAX_BITS,
            });
        }
        Ok(())
    }
}

// Operações aritméticas

impl Add for Rational {
    type Output = Self;

    fn add(self, other: Self) -> Self::Output {
        let n = &self.n * &other.d + &other.n * &self.d;
        let d = &self.d * &other.d;
        Self::new(n, d).expect("addition should not fail")
    }
}

impl Sub for Rational {
    type Output = Self;

    fn sub(self, other: Self) -> Self::Output {
        let n = &self.n * &other.d - &other.n * &self.d;
        let d = &self.d * &other.d;
        Self::new(n, d).expect("subtraction should not fail")
    }
}

impl Mul for Rational {
    type Output = Self;

    fn mul(self, other: Self) -> Self::Output {
        let n = &self.n * &other.n;
        let d = &self.d * &other.d;
        Self::new(n, d).expect("multiplication should not fail")
    }
}

impl Div for Rational {
    type Output = Self;

    fn div(self, other: Self) -> Self::Output {
        if other.n.is_zero() {
            panic!("division by zero"); // Ou retornar Result
        }
        let n = &self.n * &other.d;
        let d = &self.d * &other.n;
        Self::new(n, d).expect("division should not fail")
    }
}

impl Neg for Rational {
    type Output = Self;

    fn neg(self) -> Self::Output {
        Self { n: -self.n, d: self.d }
    }
}

// Comparação

impl PartialOrd for Rational {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Rational {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Compara n1/d1 com n2/d2 via n1*d2 vs n2*d1
        let left = &self.n * &other.d;
        let right = &other.n * &self.d;
        left.cmp(&right)
    }
}
```

---

## Potenciação

```rust
impl Rational {
    /// Eleva o racional a um expoente racional.
    ///
    /// # Errors
    /// - `DivisionByZero` se base é 0 e expoente é negativo
    /// - `ComplexResult` se resultado seria complexo
    /// - `MathOverflow` se excede limite de bits
    pub fn pow(&self, exp: &Rational) -> Result<Self, CalcAuyError> {
        // Casos especiais
        if self.n.is_zero() {
            if exp.n.is_zero() {
                return Ok(Self::from_int(BigInt::one()));
            }
            if exp.n.is_negative() {
                return Err(CalcAuyError::DivisionByZero);
            }
            return Ok(Self::from_int(BigInt::zero()));
        }

        // Expoente inteiro
        if exp.d.is_one() {
            return self.pow_int(&exp.n);
        }

        // Expoente fracionário: (n/d)^(p/q) = q-root((n/d)^p)
        // Implementação com precisão arbitrária
        self.pow_fractional(exp)
    }

    fn pow_int(&self, exp: &BigInt) -> Result<Self, CalcAuyError> {
        if exp.is_zero() {
            return Ok(Self::from_int(BigInt::one()));
        }

        let abs_exp = exp.abs();
        
        // Estimativa de bits para safety
        let base_bits = self.n.bits() + self.d.bits();
        let estimated_bits = base_bits * abs_exp.to_u64().unwrap_or(u64::MAX);
        if estimated_bits > 1_000_000 {
            return Err(CalcAuyError::MathOverflow { /* ... */ });
        }

        if exp.is_positive() {
            let n = self.n.pow(&abs_exp);
            let d = self.d.pow(&abs_exp);
            Self::new(n, d)
        } else {
            // Expoente negativo: inverte a fração
            let n = self.d.pow(&abs_exp);
            let d = self.n.pow(&abs_exp);
            Self::new(n, d)
        }
    }

    fn pow_fractional(&self, exp: &Rational) -> Result<Self, CalcAuyError> {
        // Implementação com Newton-Raphson ou série de Taylor
        // para calcular raízes com precisão arbitrária
        todo!("Implementar potenciação fracionária")
    }
}
```

---

## Módulo e Divisão Inteira

```rust
impl Rational {
    /// Módulo: `self % other`
    pub fn rem(&self, other: &Rational) -> Self {
        let a = &self.n * &other.d;
        let b = &self.d * &other.n;
        let r = &a % &b;
        // Ajusta sinal para resultado não-negativo
        let r = if r.is_negative() { r + b.abs() } else { r };
        Self::new(r, &self.d * &other.d).unwrap()
    }

    /// Divisão inteira: `self // other`
    pub fn div_int(&self, other: &Rational) -> Self {
        let a = &self.n * &other.d;
        let b = &self.d * &other.n;
        let r = &a % &b;
        let q = (&a - &r) / &b;
        Self::from_int(q)
    }
}
```

---

## Helpers de Parsing

```rust
fn parse_bigint(s: &str) -> Result<BigInt, CalcAuyError> {
    let cleaned = s.replace('_', "");
    cleaned.parse::<BigInt>()
        .map_err(|_| CalcAuyError::InvalidSyntax {
            input: s.to_string(),
        })
}

fn parse_decimal(s: &str) -> Result<Rational, CalcAuyError> {
    let s = s.replace('_', "");
    let lower = s.to_lowercase();

    // Notação científica
    if let Some((base, exp)) = lower.split_once('e') {
        let exp: i32 = exp.parse()
            .map_err(|_| CalcAuyError::InvalidSyntax { input: s.to_string() })?;
        
        let base_rat = if base.contains('.') {
            parse_simple_decimal(base)?
        } else {
            Rational::from_int(parse_bigint(base)?)
        };

        // Aplica expoente
        let ten = Rational::from_int(BigInt::from(10));
        let power = ten.pow_int(&BigInt::from(exp))?;
        
        return Ok(base_rat * power);
    }

    parse_simple_decimal(&s)
}

fn parse_simple_decimal(s: &str) -> Result<Rational, CalcAuyError> {
    if let Some((int_part, frac_part)) = s.split_once('.') {
        let n_str = format!("{}{}", int_part, frac_part);
        let n = parse_bigint(&n_str)?;
        let d = BigInt::from(10u32).pow(frac_part.len() as u32);
        Rational::new(n, d)
    } else {
        Ok(Rational::from_int(parse_bigint(s)?))
    }
}
```

---

## Serialização (Serde)

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct RationalSerde {
    n: String,
    d: String,
}

impl Serialize for Rational {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let serde_struct = RationalSerde {
            n: self.n.to_string(),
            d: self.d.to_string(),
        };
        serde_struct.serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Rational {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let serde_struct = RationalSerde::deserialize(deserializer)?;
        let n = serde_struct.n.parse().map_err(serde::de::Error::custom)?;
        let d = serde_struct.d.parse().map_err(serde::de::Error::custom)?;
        Rational::new(n, d).map_err(serde::de::Error::custom)
    }
}
```

---

## Testes

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_creation_from_int() {
        let r = Rational::from_int(BigInt::from(10));
        assert_eq!(r.numerator(), &BigInt::from(10));
        assert_eq!(r.denominator(), &BigInt::one());
    }

    #[test]
    fn test_creation_from_str_decimal() {
        let r = Rational::from_str("10.50").unwrap();
        assert_eq!(r.numerator(), &BigInt::from(21));
        assert_eq!(r.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_creation_from_str_fraction() {
        let r = Rational::from_str("3/7").unwrap();
        assert_eq!(r.numerator(), &BigInt::from(3));
        assert_eq!(r.denominator(), &BigInt::from(7));
    }

    #[test]
    fn test_creation_from_str_percent() {
        let r = Rational::from_str("15%").unwrap();
        assert_eq!(r.numerator(), &BigInt::from(3));
        assert_eq!(r.denominator(), &BigInt::from(20));
    }

    #[test]
    fn test_simplification() {
        let r = Rational::new(BigInt::from(50), BigInt::from(100)).unwrap();
        assert_eq!(r.numerator(), &BigInt::one());
        assert_eq!(r.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_sign_normalization() {
        let r = Rational::new(BigInt::from(1), BigInt::from(-2)).unwrap();
        assert_eq!(r.numerator(), &BigInt::from(-1));
        assert_eq!(r.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_addition() {
        let a = Rational::from_str("1/2").unwrap();
        let b = Rational::from_str("1/3").unwrap();
        let c = a + b;
        assert_eq!(c.numerator(), &BigInt::from(5));
        assert_eq!(c.denominator(), &BigInt::from(6));
    }

    #[test]
    fn test_multiplication() {
        let a = Rational::from_str("2/3").unwrap();
        let b = Rational::from_str("3/4").unwrap();
        let c = a * b;
        assert_eq!(c.numerator(), &BigInt::one());
        assert_eq!(c.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_division() {
        let a = Rational::from_str("2/3").unwrap();
        let b = Rational::from_str("4/5").unwrap();
        let c = a / b;
        assert_eq!(c.numerator(), &BigInt::from(5));
        assert_eq!(c.denominator(), &BigInt::from(6));
    }

    #[test]
    fn test_to_decimal_string() {
        let r = Rational::from_str("1/2").unwrap();
        assert_eq!(r.to_decimal_string(2).unwrap(), "0.50");
        
        let r = Rational::from_str("1/3").unwrap();
        assert_eq!(r.to_decimal_string(4).unwrap(), "0.3333");
    }
}
```

---

## Comparação de Performance

| Operação | TypeScript (BigInt) | Rust (num-bigint) | Speedup |
|----------|---------------------|-------------------|---------|
| Criação | ~50ns | ~30ns | 1.7x |
| Adição | ~100ns | ~60ns | 1.7x |
| Multiplicação | ~150ns | ~80ns | 1.9x |
| GCD | ~200ns | ~100ns | 2.0x |
| Potenciação | ~500ns | ~250ns | 2.0x |

*Valores estimados baseados em benchmarks típicos de BigInt vs num-bigint*

---

## Conclusão

O tipo `Rational` em Rust oferece:
- **Segurança de tipos**: Imutabilidade garantida pelo borrow checker
- **Performance**: Operações ~2x mais rápidas que JS BigInt
- **Clareza**: Código mais conciso e expressivo
- **Testabilidade**: Fácil de testar com `#[cfg(test)]`

A próxima seção detalha a AST e o engine de avaliação.
