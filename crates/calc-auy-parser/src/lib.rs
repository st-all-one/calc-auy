//! Lexer e parser de expressões matemáticas para AST.
//!
//! O lexer é *zero-copy* (tokens carregam fatias `&str`) e o parser usa
//! precedência por *climbing*, emitindo direto na arena [`calc_auy_core::FlatAst`].

pub mod error;
pub mod lexer;
pub mod parser;

pub use error::{ParseError, Span};
pub use lexer::{Lexer, Token, TokenKind};
pub use parser::parse;
