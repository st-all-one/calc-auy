//! Parse numérico exato.
//!
//! Suporta: inteiro, decimal, `%`, fração `a/b`, notação científica e
//! separador `_`. Nunca usa `parse::<f64>`.

use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};

use num_bigint::BigInt;
use num_traits::One;

use crate::error::CalcAuyError;
use crate::limits::Limits;

use super::rational::Rational;

/// Capacidade máxima do cache quente de parsing.
const HOT_CACHE_CAPACITY: usize = 256;

/// Tamanho máximo (em bytes) de uma entrada cacheável.
const HOT_CACHE_MAX_INPUT: usize = 64;

/// Mapa textual → racional do cache quente.
type HotCache = BTreeMap<Box<str>, Rational>;

/// Cache quente global de parsing (entrada textual → racional).
///
/// Espelha o `HOT_CACHE` do `RationalNumber` do rascunho. Bounded e
/// determinístico: a mesma entrada devolve sempre o mesmo valor.
static HOT_CACHE: OnceLock<Mutex<HotCache>> = OnceLock::new();

/// Consulta o cache quente.
fn hot_get(input: &str) -> Option<Rational> {
    if input.len() > HOT_CACHE_MAX_INPUT {
        return None;
    }
    let cache = HOT_CACHE.get()?.lock().ok()?;
    cache.get(input).cloned()
}

/// Insere no cache quente, evictando a menor chave quando cheio.
fn hot_put(input: &str, value: &Rational) {
    if input.len() > HOT_CACHE_MAX_INPUT {
        return;
    }
    let cache = HOT_CACHE.get_or_init(|| Mutex::new(BTreeMap::new()));
    let Ok(mut guard) = cache.lock() else {
        return;
    };
    if guard.len() >= HOT_CACHE_CAPACITY
        && let Some(key) = guard.keys().next().cloned()
    {
        guard.remove(&key);
    }
    drop(guard.insert(Box::from(input), value.clone()));
}

/// Erro de entrada inválida.
fn invalid(message: impl Into<String>) -> CalcAuyError {
    CalcAuyError::InvalidInput {
        message: message.into(),
    }
}

/// Separa o sinal do restante da string.
fn split_sign(input: &str) -> (bool, &str) {
    input.strip_prefix('-').map_or_else(
        || (false, input.strip_prefix('+').unwrap_or(input)),
        |rest| (true, rest),
    )
}

/// Faz parse de um inteiro decimal com sinal em `BigInt`.
///
/// # Errors
///
/// Retorna erro se a string não for um inteiro decimal válido.
fn parse_signed_bigint(input: &str) -> Result<BigInt, CalcAuyError> {
    let trimmed = input.trim();
    let (negative, digits) = split_sign(trimmed);
    if digits.is_empty() || !digits.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(invalid(format!("Inteiro inválido: {trimmed}")));
    }
    let magnitude: BigInt = digits
        .parse()
        .map_err(|_| invalid(format!("Inteiro inválido: {trimmed}")))?;
    Ok(if negative { -magnitude } else { magnitude })
}

/// Separa a mantissa do expoente de notação científica.
///
/// # Errors
///
/// Retorna erro se o expoente não for um inteiro válido.
fn split_exponent(input: &str) -> Result<(&str, i32), CalcAuyError> {
    let split = input.split_once('e').or_else(|| input.split_once('E'));
    match split {
        Some((mantissa, exponent)) => {
            let value: i32 = exponent
                .parse()
                .map_err(|_| invalid(format!("Expoente inválido: {exponent}")))?;
            Ok((mantissa, value))
        }
        None => Ok((input, 0)),
    }
}

/// Faz parse de um número decimal ou em notação científica.
///
/// Retorna o par `(numerador, denominador)` exato.
///
/// # Errors
///
/// Retorna erro se o formato for inválido.
fn parse_decimal(input: &str) -> Result<(BigInt, BigInt), CalcAuyError> {
    let (negative, body) = split_sign(input);
    let (mantissa, exponent) = split_exponent(body)?;
    let (int_part, frac_part) = mantissa.split_once('.').unwrap_or((mantissa, ""));

    let int_digits = if int_part.is_empty() { "0" } else { int_part };
    let valid_digits = int_digits.bytes().all(|byte| byte.is_ascii_digit())
        && frac_part.bytes().all(|byte| byte.is_ascii_digit());
    if !valid_digits {
        return Err(invalid(format!("Decimal inválido: {input}")));
    }

    let combined = format!("{int_digits}{frac_part}");
    let mut numerator: BigInt = combined
        .parse()
        .map_err(|_| invalid(format!("Decimal inválido: {input}")))?;
    let frac_len = u32::try_from(frac_part.len())
        .map_err(|_| invalid(format!("Decimal demasiado longo: {input}")))?;
    let mut denominator = BigInt::from(10u64).pow(frac_len);

    if exponent >= 0 {
        numerator *= BigInt::from(10u64).pow(exponent.unsigned_abs());
    } else {
        denominator *= BigInt::from(10u64).pow(exponent.unsigned_abs());
    }

    if negative {
        numerator = -numerator;
    }

    Ok((numerator, denominator))
}

/// Faz parse de uma string em um racional exato (com cache quente).
///
/// Formatos suportados:
/// - Inteiro: `"42"`, `"-7"`
/// - Decimal: `"3.14"`, `"-0.5"`
/// - Percentual: `"50%"`, `"12.5%"`
/// - Fração: `"1/2"`, `"-3/4"`
/// - Notação científica: `"1e10"`, `"1.5e-3"`
/// - Separador de milhar: `"1_000_000"`
///
/// # Errors
///
/// Retorna erro se o formato for inválido ou se os limites forem excedidos.
pub fn parse_rational(input: &str, limits: &Limits) -> Result<Rational, CalcAuyError> {
    if let Some(cached) = hot_get(input) {
        // O valor pode ter sido cacheado com limites mais frouxos.
        limits.check_bits(cached.bits())?;
        return Ok(cached);
    }
    let value = parse_rational_uncached(input, limits)?;
    hot_put(input, &value);
    Ok(value)
}

/// Faz parse sem consultar o cache (usado no caminho frio).
///
/// # Errors
///
/// Retorna erro se o formato for inválido ou se os limites forem excedidos.
fn parse_rational_uncached(input: &str, limits: &Limits) -> Result<Rational, CalcAuyError> {
    let cleaned = input.trim().replace('_', "");
    if cleaned.is_empty() {
        return Err(invalid("Entrada vazia"));
    }

    if let Some(body) = cleaned.strip_suffix('%') {
        let value = parse_rational(body, limits)?;
        return value.checked_div(&Rational::from_i64(100));
    }

    if let Some((numerator, denominator)) = cleaned.split_once('/') {
        let numerator = parse_signed_bigint(numerator)?;
        let denominator = parse_signed_bigint(denominator)?;
        return Rational::new_bigint_checked(numerator, denominator, limits);
    }

    if cleaned.contains(['.', 'e', 'E']) {
        let (numerator, denominator) = parse_decimal(&cleaned)?;
        return Rational::new_bigint_checked(numerator, denominator, limits);
    }

    let numerator = parse_signed_bigint(&cleaned)?;
    Rational::new_bigint_checked(numerator, BigInt::one(), limits)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(input: &str) -> Rational {
        parse_rational(input, &Limits::default()).expect("parse válido")
    }

    #[test]
    fn parse_integer() {
        assert_eq!(parse("42"), Rational::from_i64(42));
        assert_eq!(parse("-7"), Rational::from_i64(-7));
        assert_eq!(parse("+5"), Rational::from_i64(5));
    }

    #[test]
    fn hot_cache_validates_limits_on_hit() {
        // Aquece o cache com limites frouxos.
        let generous = Limits::default();
        assert_eq!(
            parse_rational("123456789", &generous).expect("parse"),
            Rational::from_i64(123_456_789)
        );
        // A segunda chamada bate no cache, mas o limite apertado deve rejeitar.
        let tight = Limits::new(8, 500, 1_000, 100, 16_384).expect("limites");
        assert!(parse_rational("123456789", &tight).is_err());
    }

    #[test]
    fn hot_cache_returns_equivalent_values() {
        let limits = Limits::default();
        let first = parse_rational("1.23456789", &limits).expect("primeiro");
        let second = parse_rational("1.23456789", &limits).expect("segundo");
        assert_eq!(first, second);
    }

    #[test]
    fn parse_decimal() {
        assert_eq!(parse("0.5"), Rational::HALF);
        assert_eq!(
            parse("3.14"),
            Rational::new_checked(314, 100, &Limits::default()).expect("válido")
        );
    }

    #[test]
    fn parse_percent() {
        assert_eq!(parse("50%"), Rational::HALF);
    }

    #[test]
    fn parse_fraction() {
        assert_eq!(parse("1/2"), Rational::HALF);
        assert_eq!(
            parse("-3/4"),
            Rational::new_checked(-3, 4, &Limits::default()).expect("válido")
        );
    }

    #[test]
    fn parse_scientific() {
        assert_eq!(parse("1e3"), Rational::from_i64(1000));
        assert_eq!(parse("1.5e2"), Rational::from_i64(150));
    }

    #[test]
    fn parse_thousands_separator() {
        assert_eq!(parse("1_000_000"), Rational::from_i64(1_000_000));
    }

    #[test]
    fn parse_invalid() {
        let limits = Limits::default();
        assert!(parse_rational("", &limits).is_err());
        assert!(parse_rational("abc", &limits).is_err());
        assert!(parse_rational("1.2.3", &limits).is_err());
    }
}
