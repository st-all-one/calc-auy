//! Interface de linha de comando (clap derive).
//!
//! Convenção: o único posicional é o `BODY` (padrão: entrada padrão); toda a
//! configuração vai em `--params <JSON>`; `--batch` processa NDJSON alinhado ao
//! `params`. `--params` e `--batch` são mutuamente exclusivos e não convivem com
//! outras flags de configuração.

use clap::{Parser, Subcommand, ValueEnum};

/// Calculadora auditável com aritmética racional exata.
#[derive(Debug, Parser)]
#[command(
    name = "calc-auy",
    version,
    about = "Calculadora auditável: racional exata, custódia verificada e saída formatada",
    long_about = None,
    propagate_version = true,
    subcommand_precedence_over_arg = true
)]
pub(crate) struct Cli {
    /// Configuração completa em JSON (exclusivo com `--batch`).
    #[arg(long, global = true, value_name = "JSON")]
    pub(crate) params: Option<String>,

    /// Modo lote: NDJSON na entrada padrão → NDJSON na saída padrão.
    #[arg(long)]
    pub(crate) batch: bool,

    /// Subcomando explícito (`verify`, `hydrate`, `repl`, `schema`, `man`).
    #[command(subcommand)]
    pub(crate) command: Option<Command>,

    /// Corpo (expressão/traço/rascunho); ausente lê da entrada padrão.
    #[arg(value_name = "BODY")]
    pub(crate) body: Option<String>,
}

/// Subcomandos explícitos (tangenciais ao fluxo principal).
#[derive(Debug, Subcommand)]
pub(crate) enum Command {
    /// Verifica a assinatura de um traço de auditoria.
    Verify {
        /// Traço de auditoria em JSON (`-`/ausente lê da entrada padrão).
        #[arg(value_name = "BODY")]
        body: Option<String>,
    },
    /// Reabre um rascunho (AST JSON) e imprime a forma normalizada.
    Hydrate {
        /// Rascunho em JSON (`-`/ausente lê da entrada padrão).
        #[arg(value_name = "BODY")]
        body: Option<String>,
    },
    /// REPL interativo.
    Repl,
    /// Imprime informações de schema/versão.
    Schema,
    /// Gera uma página de manual (roff) no stdout.
    Man {
        /// Em vez do manual, emite um script de completions.
        #[arg(long, value_enum)]
        completions: Option<Shell>,
    },
}

/// Shell alvo das completions emitidas por `man --completions`.
#[derive(Debug, Clone, Copy, ValueEnum)]
pub(crate) enum Shell {
    /// Bash.
    Bash,
    /// Zsh.
    Zsh,
    /// Fish.
    Fish,
}
