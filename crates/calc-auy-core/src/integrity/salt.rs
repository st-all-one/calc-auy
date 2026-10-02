//! Segredo (`Salt`) usado na assinatura keyed.
//!
//! O sal nunca aparece em `Debug` nem em serialização; o buffer é zerado no
//! *drop* pelo [`secrecy`]/[`zeroize`].

use std::fmt;

use secrecy::{ExposeSecret, SecretString};

/// Sal de assinatura.
///
/// Não implementa `Serialize`/`Deserialize` por construção.
#[derive(Clone)]
pub struct Salt(SecretString);

impl Salt {
    /// Cria um sal a partir de um segredo.
    #[must_use]
    pub fn new(value: impl Into<String>) -> Self {
        Self(SecretString::from(value.into()))
    }

    /// Expõe o sal para uso interno da assinatura.
    #[must_use]
    pub fn expose(&self) -> &str {
        self.0.expose_secret()
    }
}

impl fmt::Debug for Salt {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Salt(<redacted>)")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn debug_never_leaks_secret() {
        let salt = Salt::new("super-secreto");
        let debug = format!("{salt:?}");
        assert_eq!(debug, "Salt(<redacted>)");
        assert!(!debug.contains("super-secreto"));
    }

    #[test]
    fn expose_returns_value() {
        let salt = Salt::new("abc");
        assert_eq!(salt.expose(), "abc");
    }
}
