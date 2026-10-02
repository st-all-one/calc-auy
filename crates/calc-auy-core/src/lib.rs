//! Núcleo do CalcAUY: racionais híbridos, AST, engine, integridade.
//!
//! Este crate contém os tipos fundamentais e a lógica de negócio central.

pub mod clock;
pub mod diag;
pub mod error;
pub mod limits;
pub mod meta_value;
pub mod numeric;

pub use clock::{Clock, MockClock, SystemClock};
pub use error::{CalcAuyError, ProblemDetails};
pub use limits::Limits;
pub use meta_value::MetaValue;
pub use numeric::Rational;
