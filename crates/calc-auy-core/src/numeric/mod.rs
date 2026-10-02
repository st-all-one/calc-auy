//! Núcleo numérico: racionais híbridos, backend, GCD, pow, rounding, parse.
//!
//! Este módulo contém a aritmética exata que é o coração do produto.

pub mod backend;
pub mod gcd;
pub mod parse;
pub mod rational;
pub mod rounding;

pub use backend::Numeric;
pub use rational::Rational;
