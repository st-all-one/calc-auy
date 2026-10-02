//! Task runner do CalcAUY: CI, benchmarks, corpus e schema.

use std::process::Command;

use anyhow::{Context, Result, ensure};
use clap::{Parser, Subcommand};

/// Task runner do CalcAUY.
#[derive(Debug, Parser)]
#[command(name = "xtask", about = "Tarefas de build do CalcAUY")]
struct Cli {
    /// Subcomando a executar.
    #[command(subcommand)]
    command: Commands,
}

/// Subcomandos disponíveis.
#[derive(Debug, Subcommand)]
enum Commands {
    /// Executa o pipeline de verificação (fmt, clippy, test).
    Ci,
    /// Executa os benchmarks do workspace.
    Bench,
    /// Ajusta o tamanho de tile (stub).
    TileTune,
    /// Gera o corpus de conformidade (stub).
    Corpus,
    /// Gera os processadores a partir do schema (stub).
    Schema,
}

/// Ponto de entrada do task runner.
///
/// # Errors
///
/// Retorna erro se o subcomando executado falhar.
fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Ci => run_ci(),
        Commands::Bench => run_cargo(&["bench", "--workspace"]),
        Commands::TileTune | Commands::Corpus | Commands::Schema => {
            // Stubs: serão implementados nos épicos E08/E11/E13.
            Ok(())
        }
    }
}

/// Executa o pipeline completo de verificação.
///
/// # Errors
///
/// Retorna erro se qualquer etapa do pipeline falhar.
fn run_ci() -> Result<()> {
    run_cargo(&["fmt", "--all", "--", "--check"])?;
    run_cargo(&[
        "clippy",
        "--workspace",
        "--all-targets",
        "--",
        "-D",
        "warnings",
    ])?;
    run_cargo(&["test", "--workspace"])?;
    Ok(())
}

/// Executa o `cargo` com os argumentos dados, propagando falhas.
///
/// # Errors
///
/// Retorna erro se o processo não puder ser iniciado ou retornar falha.
fn run_cargo(args: &[&str]) -> Result<()> {
    let status = Command::new("cargo")
        .args(args)
        .status()
        .context("falha ao executar o cargo")?;
    ensure!(status.success(), "comando falhou: cargo {}", args.join(" "));
    Ok(())
}
