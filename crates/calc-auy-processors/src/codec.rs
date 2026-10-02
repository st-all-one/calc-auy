//! Codecs determinísticos: JSON, CBOR, MessagePack e Protobuf (T11.2–T11.4).

use calc_auy_core::{CalcAuyError, Limits, SignaturePayload};

use crate::proto;
use crate::wire::WirePayload;

/// Tamanho máximo aceito na desserialização binária (64 MiB).
const MAX_BYTES: usize = 64 * 1024 * 1024;

/// Formatos de serialização suportados.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    /// JSON canônico (formato *wire*).
    Json,
    /// CBOR determinístico.
    Cbor,
    /// MessagePack determinístico.
    MsgPack,
    /// Protobuf conforme `schema/calc_auy.proto`.
    Protobuf,
}

impl Format {
    /// Retorna o nome estável do formato.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Json => "json",
            Self::Cbor => "cbor",
            Self::MsgPack => "msgpack",
            Self::Protobuf => "protobuf",
        }
    }

    /// Interpreta o nome estável do formato.
    #[must_use]
    pub fn from_code(code: &str) -> Option<Self> {
        match code {
            "json" => Some(Self::Json),
            "cbor" => Some(Self::Cbor),
            "msgpack" => Some(Self::MsgPack),
            "protobuf" | "proto" => Some(Self::Protobuf),
            _ => None,
        }
    }

    /// Codifica um payload assinado neste formato.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::SerializationError`] se a codificação falhar.
    pub fn encode(self, payload: &SignaturePayload) -> Result<Vec<u8>, CalcAuyError> {
        let wire = WirePayload::from_signature(payload)?;
        match self {
            Self::Json => serde_json::to_vec(&wire).map_err(serialization),
            Self::Cbor => {
                let mut buffer = Vec::new();
                ciborium::into_writer(&wire, &mut buffer).map_err(serialization)?;
                Ok(buffer)
            }
            Self::MsgPack => rmp_serde::to_vec_named(&wire).map_err(serialization),
            Self::Protobuf => proto::encode(&wire),
        }
    }

    /// Decodifica um payload assinado, impondo os limites fornecidos.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::SerializationError`] se a decodificação falhar
    /// ou [`CalcAuyError::LimitExceeded`] se um limite for excedido.
    pub fn decode(self, bytes: &[u8], limits: &Limits) -> Result<SignaturePayload, CalcAuyError> {
        if bytes.len() > MAX_BYTES {
            return Err(serialization("payload excede o tamanho máximo"));
        }
        let wire = match self {
            Self::Json => serde_json::from_slice(bytes).map_err(serialization)?,
            Self::Cbor => ciborium::from_reader(bytes).map_err(serialization)?,
            Self::MsgPack => rmp_serde::from_slice(bytes).map_err(serialization)?,
            Self::Protobuf => proto::decode(bytes)?,
        };
        wire.to_signature(limits)
    }
}

/// Cria um erro de serialização a partir de qualquer erro exibível.
fn serialization(error: impl std::fmt::Display) -> CalcAuyError {
    CalcAuyError::SerializationError {
        message: error.to_string(),
    }
}
