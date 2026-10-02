//! API fluente com *typestate* para construção de cálculos.
//!
//! O ciclo de vida `Draft → Committed → Verified` é codificado no sistema de
//! tipos: métodos válidos apenas em um estado não existem nos demais. A
//! ingestão é feita via [`IntoRational`], selado contra `f64`.

pub mod calculation;
pub mod config;
pub mod context;
pub mod into_rational;
pub mod state;

pub use calculation::Calculation;
pub use config::InstanceConfig;
pub use context::ContextLink;
pub use into_rational::IntoRational;
pub use state::{Committed, Draft, State, Verified};
