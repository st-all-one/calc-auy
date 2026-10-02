//! Motor de lotes: `SoA`, tiling e paralelismo determinístico (ADR-010).
//!
//! O vetor principal de performance é processar muitos cálculos com o conjunto
//! de trabalho quente na L1/L2. Como a aritmética racional é exata, a redução
//! paralela é associativa e comutativa — determinismo por construção.

pub mod parallel;
pub mod soa;
pub mod tile;
pub mod unchecked;

#[cfg(test)]
mod proptests;

pub use parallel::eval_batch;
pub use soa::SmallBatch;
pub use tile::{DEFAULT_TILE, TileConfig, prod_tile, sum_tile};
