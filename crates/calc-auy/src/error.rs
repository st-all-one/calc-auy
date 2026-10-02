//! Renderização de erros e códigos de saída (ADR-015).

use anyhow::Error;
use calc_auy_api::{CalcAuyError, Clock};
use serde::Deserialize;

/// Formato de renderização de erro.
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ErrorFormat {
    /// Texto legível no `stderr`.
    #[default]
    Human,
    /// `ProblemDetails` em JSON no `stdout`.
    Json,
}

/// Código de saída para um erro arbitrário.
///
/// Erros de domínio têm códigos estáveis; erros de contexto/IO usam `1`.
#[must_use]
pub(crate) fn exit_code(error: &Error) -> u8 {
    error
        .downcast_ref::<CalcAuyError>()
        .map_or(1, domain_exit_code)
}

/// Código de saída para um erro de domínio.
const fn domain_exit_code(error: &CalcAuyError) -> u8 {
    match error {
        CalcAuyError::ParseError { .. } => 3,
        CalcAuyError::LimitExceeded { .. } | CalcAuyError::MathOverflow { .. } => 4,
        CalcAuyError::DivisionByZero => 5,
        CalcAuyError::IntegrityViolation { .. } | CalcAuyError::CustodyViolation { .. } => 6,
        CalcAuyError::IrrationalResult { .. } => 7,
        _ => 1,
    }
}

/// Renderiza o erro no formato pedido.
pub(crate) fn render(error: &Error, format: ErrorFormat, clock: &dyn Clock) {
    let Some(domain) = error.downcast_ref::<CalcAuyError>() else {
        eprintln!("erro: {error:#}");
        return;
    };
    match format {
        ErrorFormat::Json => render_json(domain, clock),
        ErrorFormat::Human => eprintln!("erro: {domain}"),
    }
}

/// Renderiza um erro de domínio como `ProblemDetails` (JSON).
fn render_json(error: &CalcAuyError, clock: &dyn Clock) {
    let problem = error.to_problem_details(clock);
    match serde_json::to_string(&problem) {
        Ok(text) => println!("{text}"),
        Err(_) => println!("{error}"),
    }
}
