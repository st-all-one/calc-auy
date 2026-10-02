//! Binário oficial `calc-auy` (ADR-008): casca fina sobre `calc-auy-api`.

#![allow(clippy::print_stdout, reason = "CLI: a saída padrão é o produto")]
#![allow(
    clippy::print_stderr,
    reason = "CLI: erros legíveis vão para a saída de erro"
)]
#![allow(
    clippy::redundant_pub_crate,
    reason = "binário: `pub(crate)` é a visibilidade correta entre módulos internos"
)]
#![allow(
    clippy::disallowed_methods,
    reason = "CLI: ler ambiente e relógio na borda é o comportamento esperado"
)]

mod batch;
mod cli;
mod commands;
mod config;
mod error;
mod man;

use std::process::ExitCode;

use calc_auy_api::{Clock, MockClock, SystemClock};
use clap::Parser;

use crate::cli::Cli;
use crate::config::Settings;

/// Valida as exclusões da convenção (`--params`/`--batch`).
fn validate(cli: &Cli) -> Option<ExitCode> {
    if cli.params.is_some() && cli.batch {
        eprintln!("erro: `--params` e `--batch` são mutuamente exclusivos");
        return Some(ExitCode::from(2));
    }
    if cli.batch && cli.command.is_some() {
        eprintln!("erro: `--batch` não se aplica a subcomandos");
        return Some(ExitCode::from(2));
    }
    None
}

/// Ponto de entrada do binário.
fn main() -> ExitCode {
    let cli = Cli::parse();
    if let Some(code) = validate(&cli) {
        return code;
    }
    let params = match config::load(&cli) {
        Ok(params) => params,
        Err(error) => {
            eprintln!("erro: {error:#}");
            return ExitCode::from(2);
        }
    };
    let settings = match Settings::resolve(&params) {
        Ok(settings) => settings,
        Err(error) => {
            eprintln!("erro: {error:#}");
            return ExitCode::from(1);
        }
    };
    let clock: Box<dyn Clock> = if settings.deterministic {
        Box::new(MockClock::new())
    } else {
        Box::new(SystemClock)
    };
    match commands::run(&cli, &settings) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            error::render(&error, settings.error_format, clock.as_ref());
            ExitCode::from(error::exit_code(&error))
        }
    }
}
