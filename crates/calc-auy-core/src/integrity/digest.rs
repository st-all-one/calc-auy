//! Resumo criptográfico (`Digest`) e codificações.

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::canonical::Canonical;
use crate::error::CalcAuyError;

/// Tamanho em bytes de um [`Digest`] (BLAKE3).
pub const DIGEST_BYTES: usize = 32;

/// Codificações suportadas para exibição de um [`Digest`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[non_exhaustive]
pub enum Encoder {
    /// Hexadecimal minúsculo.
    Hex,
    /// Base32 (RFC 4648, sem preenchimento).
    Base32,
    /// Base64 (RFC 4648, padrão).
    Base64,
    /// Base58 (Bitcoin).
    Base58,
}

/// Resumo criptográfico cru de 32 bytes.
///
/// A codificação é derivada sob demanda; o tipo nunca guarda texto.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Digest([u8; DIGEST_BYTES]);

impl Digest {
    /// Cria um digest a partir dos bytes crus.
    #[must_use]
    pub const fn from_bytes(bytes: [u8; DIGEST_BYTES]) -> Self {
        Self(bytes)
    }

    /// Retorna os bytes crus.
    #[must_use]
    pub const fn as_bytes(&self) -> &[u8; DIGEST_BYTES] {
        &self.0
    }

    /// Codifica o digest em hexadecimal minúsculo.
    #[must_use]
    pub fn hex(&self) -> String {
        hex::encode(self.0)
    }

    /// Codifica o digest com o encoder escolhido.
    #[must_use]
    pub fn encode(&self, encoder: Encoder) -> String {
        match encoder {
            Encoder::Hex => self.hex(),
            Encoder::Base32 => data_encoding::BASE32.encode(&self.0),
            Encoder::Base64 => {
                use base64::Engine;
                base64::engine::general_purpose::STANDARD.encode(self.0)
            }
            Encoder::Base58 => bs58::encode(self.0).into_string(),
        }
    }

    /// Decodifica um digest a partir de hexadecimal.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se o texto não for hexadecimal
    /// válido ou não tiver 32 bytes.
    pub fn from_hex(input: &str) -> Result<Self, CalcAuyError> {
        let bytes = hex::decode(input).map_err(|error| CalcAuyError::InvalidInput {
            message: format!("digest hexadecimal inválido: {error}"),
        })?;
        let array: [u8; DIGEST_BYTES] =
            bytes.try_into().map_err(|_| CalcAuyError::InvalidInput {
                message: "digest deve ter 32 bytes".to_string(),
            })?;
        Ok(Self(array))
    }
}

impl fmt::Debug for Digest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "Digest({})", self.hex())
    }
}

impl fmt::Display for Digest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.hex())
    }
}

impl Canonical for Digest {
    fn write_canonical(&self, out: &mut Vec<u8>) {
        crate::canonical::write_json_string(out, &self.hex());
    }
}

impl Serialize for Digest {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.hex())
    }
}

impl<'de> Deserialize<'de> for Digest {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let text = String::deserialize(deserializer)?;
        Self::from_hex(&text).map_err(D::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encoders_are_deterministic() {
        let digest = Digest::from_bytes([0xab; DIGEST_BYTES]);
        assert_eq!(digest.hex().len(), 64);
        assert_eq!(digest.encode(Encoder::Hex), digest.hex());
        assert!(!digest.encode(Encoder::Base64).is_empty());
        assert!(!digest.encode(Encoder::Base58).is_empty());
        assert!(!digest.encode(Encoder::Base32).is_empty());
    }

    #[test]
    fn hex_round_trip() {
        let digest = Digest::from_bytes([0x01; DIGEST_BYTES]);
        let parsed = Digest::from_hex(&digest.hex()).expect("hex válido");
        assert_eq!(digest, parsed);
    }

    #[test]
    fn rejects_bad_hex() {
        assert!(Digest::from_hex("xyz").is_err());
        assert!(Digest::from_hex("abcd").is_err());
    }

    #[test]
    fn debug_redacts_to_hex() {
        let digest = Digest::from_bytes([0; DIGEST_BYTES]);
        assert_eq!(format!("{digest:?}"), format!("Digest({})", "0".repeat(64)));
    }
}
