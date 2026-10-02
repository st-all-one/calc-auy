//! Redação de segredos no caminho de diagnóstico.
//!
//! Regra: um campo cuja **chave** é sensível (`token`, `authorization`, `secret`…) ou cujo
//! **valor** traz um marcador de segredo (`Bearer `, `sk-…`) nunca é emitido em claro.

use super::Value;

/// Marcador emitido no lugar de um valor redigido.
pub const REDACTED: &str = "[redacted]";

/// Chaves (em minúsculas) cujo valor textual é sempre redigido.
const SENSITIVE_KEYS: &[&str] = &[
    "secret",
    "token",
    "password",
    "passwd",
    "authorization",
    "auth",
    "cookie",
    "credential",
    "api_key",
    "apikey",
    "private_key",
    "salt",
];

/// Marcadores de segredo detetados **dentro** de um valor textual.
const SECRET_MARKERS: &[&str] = &[
    "-----begin",
    "bearer ",
    "authorization:",
    "sk-",
    "ghp_",
    "xoxb-",
];

/// `true` se a chave do campo é sensível.
#[must_use]
pub fn is_sensitive_key(key: &str) -> bool {
    let lowered = key.to_ascii_lowercase();
    SENSITIVE_KEYS.iter().any(|needle| lowered.contains(needle))
}

/// `true` se o valor textual contém um marcador de segredo.
#[must_use]
pub fn is_sensitive_value(value: &str) -> bool {
    let lowered = value.to_ascii_lowercase();
    SECRET_MARKERS.iter().any(|needle| lowered.contains(needle))
}

/// Aplica a redação a um campo.
#[must_use]
pub fn redact_value<'a>(key: &str, value: Value<'a>) -> Value<'a> {
    if is_sensitive_key(key) {
        return Value::Str(REDACTED);
    }
    if let Value::Str(s) = value
        && is_sensitive_value(s)
    {
        return Value::Str(REDACTED);
    }
    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sensitive_key_is_redacted() {
        assert_eq!(
            redact_value("token", Value::Str("abc123")),
            Value::Str(REDACTED)
        );
        assert_eq!(
            redact_value("api_key", Value::Str("xyz")),
            Value::Str(REDACTED)
        );
    }

    #[test]
    fn sensitive_value_is_redacted() {
        assert_eq!(
            redact_value("header", Value::Str("Bearer abc")),
            Value::Str(REDACTED)
        );
        assert_eq!(
            redact_value("key", Value::Str("sk-12345")),
            Value::Str(REDACTED)
        );
    }

    #[test]
    fn normal_value_passes() {
        assert_eq!(
            redact_value("name", Value::Str("hello")),
            Value::Str("hello")
        );
        assert_eq!(redact_value("count", Value::Int(42)), Value::Int(42));
    }
}
