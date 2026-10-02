//! Integridade forense: canonicalização, assinatura, custódia e log Merkle.

pub mod custody;
pub mod digest;
pub mod hash;
pub mod merkle;
pub mod payload;
pub mod salt;
pub mod sign;

#[cfg(test)]
mod proptests;

pub use custody::{CustodyVerifier, VerifiedAst};
pub use digest::{DIGEST_BYTES, Digest, Encoder};
pub use hash::{trace_hash, value_hash};
pub use merkle::{CustodyLink, chain_log, verify_log};
pub use payload::{AuditTrace, SignaturePayload, SignaturePayloadV2, TraceVersion};
pub use salt::Salt;
pub use sign::{sign, verify};
