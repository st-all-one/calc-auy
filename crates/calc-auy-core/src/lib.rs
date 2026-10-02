//! Núcleo do CalcAUY: racionais híbridos, AST, engine, integridade.
//!
//! Este crate contém os tipos fundamentais e a lógica de negócio central.

// Permite que macros derivadas referenciem este crate pelo nome (`::calc_auy_core`).
extern crate self as calc_auy_core;

pub mod ast;
pub mod canonical;
pub mod clock;
pub mod diag;
pub mod error;
pub mod integrity;
pub mod limits;
pub mod meta_value;
pub mod numeric;

pub use ast::{AstBuilder, FlatAst, Metadata, NodeData, NodeId, NodeKind, OperationType};
pub use clock::{Clock, MockClock, SystemClock};
pub use error::{CalcAuyError, ProblemDetails};
pub use limits::Limits;
pub use meta_value::MetaValue;
pub use numeric::Rational;
