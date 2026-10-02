//! Assinatura BLAKE3 *keyed* e verificação.

use crate::error::CalcAuyError;

use super::digest::Digest;
use super::salt::Salt;

/// Contexto de derivação da chave de assinatura (v1).
const SIGNATURE_CONTEXT: &str = "calc-auy/v1 signature";

/// Assina bytes canônicos com BLAKE3 keyed.
///
/// A chave é derivada do sal com [`blake3::derive_key`], eliminando a
/// ambiguidade de fronteira `canonical || salt`.
#[must_use]
pub fn sign(canonical: &[u8], salt: &Salt) -> Digest {
    let key = blake3::derive_key(SIGNATURE_CONTEXT, salt.expose().as_bytes());
    let hash = blake3::keyed_hash(&key, canonical);
    Digest::from_bytes(*hash.as_bytes())
}

/// Verifica que `canonical` corresponde à assinatura `expected`.
///
/// # Errors
///
/// Retorna [`CalcAuyError::IntegrityViolation`] se a assinatura não conferir.
pub fn verify(canonical: &[u8], salt: &Salt, expected: &Digest) -> Result<(), CalcAuyError> {
    let actual = sign(canonical, salt);
    if actual == *expected {
        Ok(())
    } else {
        Err(CalcAuyError::IntegrityViolation {
            expected: expected.hex(),
            received: actual.hex(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signature_is_deterministic() {
        let salt = Salt::new("sal");
        let payload = b"conteudo";
        assert_eq!(sign(payload, &salt), sign(payload, &salt));
    }

    #[test]
    fn mutation_changes_digest() {
        let salt = Salt::new("sal");
        assert_ne!(sign(b"a", &salt), sign(b"b", &salt));
    }

    #[test]
    fn salt_changes_digest() {
        assert_ne!(sign(b"a", &Salt::new("x")), sign(b"a", &Salt::new("y")));
    }

    #[test]
    fn verify_accepts_and_rejects() {
        let salt = Salt::new("sal");
        let digest = sign(b"conteudo", &salt);
        assert!(verify(b"conteudo", &salt, &digest).is_ok());
        assert!(verify(b"outro", &salt, &digest).is_err());
    }
}
