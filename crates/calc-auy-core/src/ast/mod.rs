//! AST em arena plana (`FlatAst`), projeção *wire* e construção validada.
//!
//! A representação em memória é uma **árvore de arrays** cache-friendly; a
//! forma recursiva existe apenas na borda de serialização. Todos os limites
//! ([`crate::limits::Limits`]) são invariantes de construção e de
//! desserialização.

pub mod builder;
pub mod flat;
pub mod types;
pub mod wire;

#[cfg(test)]
mod proptests;

pub use builder::AstBuilder;
pub use flat::{AstParts, FlatAst, NodeData, NodeKind};
pub use types::{Metadata, NodeId, OperationType, metadata_size_bytes};
