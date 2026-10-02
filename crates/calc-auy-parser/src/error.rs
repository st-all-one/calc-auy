//! Erros do parser com posição (span) e mapeamento para `ProblemDetails`.

use std::fmt;

use calc_auy_core::clock::Clock;
use calc_auy_core::error::{CalcAuyError, ProblemDetails};
use calc_auy_core::meta_value::MetaValue;

/// Intervalo de bytes em uma entrada.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Span {
    /// Byte inicial (inclusive).
    pub start: usize,
    /// Byte final (exclusivo).
    pub end: usize,
}

impl Span {
    /// Cria um span.
    #[must_use]
    pub const fn new(start: usize, end: usize) -> Self {
        Self { start, end }
    }

    /// Retorna o comprimento em bytes.
    #[must_use]
    pub const fn len(self) -> usize {
        self.end.saturating_sub(self.start)
    }

    /// Retorna `true` se o span é vazio.
    #[must_use]
    pub const fn is_empty(self) -> bool {
        self.start == self.end
    }
}

impl fmt::Display for Span {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}..{}", self.start, self.end)
    }
}

/// Erro de lexing/parsing com posição.
#[derive(Debug)]
pub enum ParseError {
    /// Erro léxico ou sintático.
    Syntax {
        /// Mensagem legível.
        message: String,
        /// Posição do erro.
        span: Span,
    },
    /// Limite excedido durante a construção da AST.
    Limit {
        /// Erro tipado do núcleo.
        error: CalcAuyError,
        /// Posição aproximada do erro.
        span: Span,
    },
}

impl ParseError {
    /// Cria um erro sintático.
    #[must_use]
    pub fn syntax(message: impl Into<String>, span: Span) -> Self {
        Self::Syntax {
            message: message.into(),
            span,
        }
    }

    /// Retorna a posição do erro.
    #[must_use]
    pub const fn span(&self) -> Span {
        match self {
            Self::Syntax { span, .. } | Self::Limit { span, .. } => *span,
        }
    }

    /// Retorna a mensagem legível.
    #[must_use]
    pub fn message(&self) -> String {
        match self {
            Self::Syntax { message, .. } => message.clone(),
            Self::Limit { error, .. } => error.to_string(),
        }
    }

    /// Converte para `ProblemDetails`, anexando a posição ao contexto.
    #[must_use]
    pub fn to_problem_details(&self, clock: &dyn Clock) -> ProblemDetails {
        let span = self.span();
        let problem = match self {
            Self::Syntax { message, .. } => CalcAuyError::ParseError {
                message: message.clone(),
            }
            .to_problem_details(clock),
            Self::Limit { error, .. } => error.to_problem_details(clock),
        };
        problem
            .with_context("span_start", span_uint(span.start))
            .with_context("span_end", span_uint(span.end))
    }
}

/// Converte um índice em `MetaValue::Uint` saturando.
fn span_uint(value: usize) -> MetaValue {
    MetaValue::Uint(u64::try_from(value).unwrap_or(u64::MAX))
}

impl fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} (byte {})", self.message(), self.span())
    }
}

impl std::error::Error for ParseError {}

impl From<ParseError> for CalcAuyError {
    fn from(error: ParseError) -> Self {
        match error {
            ParseError::Syntax { message, span } => Self::ParseError {
                message: format!("{message} (byte {span})"),
            },
            ParseError::Limit { error, .. } => error,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use calc_auy_core::clock::MockClock;

    #[test]
    fn span_display_and_len() {
        let span = Span::new(2, 5);
        assert_eq!(span.len(), 3);
        assert!(!span.is_empty());
        assert_eq!(span.to_string(), "2..5");
    }

    #[test]
    fn syntax_maps_to_problem_with_span() {
        let clock = MockClock::new();
        let error = ParseError::syntax("token inesperado", Span::new(1, 3));
        let problem = error.to_problem_details(&clock);
        assert!(problem.context.contains_key("span_start"));
        assert!(problem.context.contains_key("span_end"));
        assert_eq!(problem.status, 400);
    }

    #[test]
    fn converts_to_calc_error() {
        let error = ParseError::syntax("x", Span::new(0, 1));
        let converted: CalcAuyError = error.into();
        assert!(matches!(converted, CalcAuyError::ParseError { .. }));
    }
}
