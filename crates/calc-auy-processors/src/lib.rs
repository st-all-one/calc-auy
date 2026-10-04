//! Processadores de schema: Protobuf, CBOR e MessagePack (E11).
//!
//! Serializações binárias determinísticas e conformes ao schema versionado
//! (ADR-013), todas derivadas do modelo *wire* canônico ([`WirePayload`]) e com
//! limites impostos na reconstrução da arena.

#![allow(
    clippy::redundant_pub_crate,
    reason = "módulos internos: `pub(crate)` é a visibilidade correta"
)]

pub mod codec;
pub mod persistence;
pub mod schema;

mod proto;
mod wire;

pub use codec::Format;
pub use wire::{WireNode, WirePayload};

/// Tipos gerados do `schema/calc_auy.proto`.
#[allow(
    clippy::all,
    clippy::pedantic,
    clippy::nursery,
    missing_docs,
    unreachable_pub,
    reason = "código gerado pelo prost"
)]
pub(crate) mod generated {
    include!(concat!(env!("OUT_DIR"), "/calc_auy.v1.rs"));
}
