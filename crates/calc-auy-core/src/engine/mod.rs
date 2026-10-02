//! Motor de avaliação: iterativo, com *commit* assinado e memoização.

pub mod cache;
pub mod commit;
pub mod eval;

#[cfg(test)]
mod differential;

#[cfg(test)]
mod proptests;

pub use cache::EvalCache;
pub use commit::{Committed, commit};
pub use eval::{eval, eval_memoized};
