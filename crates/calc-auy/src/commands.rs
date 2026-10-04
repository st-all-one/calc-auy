//! Implementação dos comandos (casca fina sobre `calc-auy-api`).

use std::io::{Read, Write};

use anyhow::{Context, Result};
use calc_auy_api::{
    AuditTrace, CalcAuy, CalcAuyError, CustodyVerifier, DEFAULT_KEYS, InstanceConfig, Output,
    OutputOptions, RoundingStrategy, Salt,
};
#[cfg(feature = "render")]
use calc_auy_api::{HtmlOptions, SvgOptions};

use crate::batch;
use crate::cli::{Cli, Command, Shell};
use crate::config::{FormatMode, Op, Settings};
use crate::man;

/// Verificador permissivo da CLI.
///
/// A custódia real é conferida pelo subcomando `verify`, que recomputa a
/// assinatura do traço de auditoria.
#[derive(Debug, Clone, Copy)]
pub(crate) struct AcceptAll;

impl CustodyVerifier for AcceptAll {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        Ok(())
    }
}

/// Resultado de uma operação do fluxo principal.
pub(crate) enum OpOutput {
    /// Resultado formatado.
    Formatted(String),
    /// Traço de auditoria assinado e sua assinatura.
    Committed {
        /// Traço de auditoria em JSON.
        trace: String,
        /// Assinatura (hex).
        signature: String,
    },
    /// Assinatura (hex).
    Signed(String),
}

impl OpOutput {
    /// Imprime o resultado no formato textual.
    pub(crate) fn print(&self) {
        match self {
            Self::Formatted(text) | Self::Signed(text) => println!("{text}"),
            Self::Committed { trace, .. } => println!("{trace}"),
        }
    }

    /// Renderiza o resultado como linha NDJSON com o `id` dado.
    pub(crate) fn to_json(&self, id: &serde_json::Value) -> String {
        match self {
            Self::Formatted(result) => {
                serde_json::json!({ "id": id, "ok": true, "result": result })
            }
            Self::Committed { trace, signature } => serde_json::json!({
                "id": id,
                "ok": true,
                "trace": trace,
                "signature": signature,
            }),
            Self::Signed(signature) => {
                serde_json::json!({ "id": id, "ok": true, "signature": signature })
            }
        }
        .to_string()
    }
}

/// Cria a instância da fachada para a configuração efetiva.
#[must_use]
pub(crate) fn app(settings: &Settings) -> CalcAuy {
    let config = InstanceConfig::new(Salt::new(settings.salt.clone()))
        .with_rounding(settings.rounding, settings.decimals)
        .with_context_label("cli");
    CalcAuy::new(config)
}

/// Executa o comando selecionado.
///
/// # Errors
///
/// Retorna erro de domínio ou de E/S conforme o comando.
pub(crate) fn run(cli: &Cli, settings: &Settings) -> Result<()> {
    match &cli.command {
        Some(Command::Verify { body }) => verify(settings, body.as_deref()),
        Some(Command::Hydrate { body }) => hydrate(settings, body.as_deref()),
        Some(Command::Repl) => repl(settings),
        Some(Command::Schema) => schema(),
        Some(Command::Man { completions }) => {
            man(*completions);
            Ok(())
        }
        None if cli.batch => batch::run(settings),
        None => {
            let body = read_body(cli.body.as_deref())?;
            dispatch(settings, &body)?.print();
            Ok(())
        }
    }
}

/// Lê o corpo: argumento, `-` ou entrada padrão (heredoc).
///
/// # Errors
///
/// Retorna erro se a entrada padrão não puder ser lida.
pub(crate) fn read_body(body: Option<&str>) -> Result<String> {
    match body {
        Some("-") | None => {
            let mut buffer = String::new();
            std::io::stdin()
                .read_to_string(&mut buffer)
                .context("falha ao ler a entrada padrão")?;
            Ok(buffer)
        }
        Some(text) => Ok(text.to_string()),
    }
}

/// Executa a operação do fluxo principal.
///
/// # Errors
///
/// Retorna erro de domínio se a expressão, a custódia ou a avaliação falharem.
/// Renderiza o resultado selado no modo de formatação configurado.
///
/// # Errors
///
/// Retorna erro de serialização se a representação escolhida falhar, ou
/// [`CalcAuyError::InvalidInput`] se o modo exigir uma feature desligada.
fn render_format(settings: &Settings, output: &Output<'_>) -> Result<String, CalcAuyError> {
    let rendered = match settings.mode {
        FormatMode::Decimal => output.to_string_decimal(),
        FormatMode::Monetary => output.to_monetary(),
        FormatMode::Latex => output.to_latex(),
        FormatMode::Unicode => output.to_unicode(),
        FormatMode::Mermaid => output.to_mermaid_graph(),
        FormatMode::Scaled => output.to_scaled_bigint(settings.decimals).to_string(),
        FormatMode::Verbal => output.to_verbal_a11y(settings.language.realizer().as_ref()),
        FormatMode::Json => {
            output.to_json_formats(DEFAULT_KEYS, settings.language.realizer().as_ref())?
        }
        #[cfg(feature = "render")]
        FormatMode::Html => output
            .to_html(
                settings.language.realizer().as_ref(),
                &HtmlOptions::default(),
            )
            .map_err(|error| CalcAuyError::SerializationError {
                message: error.to_string(),
            })?,
        #[cfg(feature = "render")]
        FormatMode::Svg => output.to_svg(&SvgOptions::default()).map_err(|error| {
            CalcAuyError::SerializationError {
                message: error.to_string(),
            }
        })?,
        #[cfg(not(feature = "render"))]
        FormatMode::Html | FormatMode::Svg => {
            return Err(CalcAuyError::InvalidInput {
                message: "modo visual requer a feature `render`".to_string(),
            });
        }
    };
    Ok(rendered)
}

/// Executa a operação do fluxo principal.
///
/// # Errors
///
/// Retorna erro de domínio se a expressão, a custódia ou a avaliação falharem.
pub(crate) fn dispatch(settings: &Settings, body: &str) -> Result<OpOutput, CalcAuyError> {
    let instance = app(settings);
    let expression = body.trim();
    match settings.op {
        Op::Format => {
            let verified = instance
                .parse(expression)?
                .commit(&AcceptAll)?
                .verify(&AcceptAll)?;
            let mut options = OutputOptions::new()
                .with_locale(settings.locale)
                .with_decimals(settings.decimals);
            if let Some(currency) = settings.currency {
                options = options.with_currency(currency);
            }
            let output = verified.output(options);
            Ok(OpOutput::Formatted(render_format(settings, &output)?))
        }
        Op::Commit => {
            let committed = instance.parse(expression)?.commit(&AcceptAll)?;
            let salt = Salt::new(settings.salt.clone());
            let mut trace = AuditTrace::new(committed.payload().clone());
            trace.commit(&salt);
            Ok(OpOutput::Committed {
                trace: serialize(&trace)?,
                signature: committed.signature().hex(),
            })
        }
        Op::Sign => {
            let committed = instance.parse(expression)?.commit(&AcceptAll)?;
            Ok(OpOutput::Signed(committed.signature().hex()))
        }
    }
}

/// Serializa um valor para JSON.
///
/// # Errors
///
/// Retorna [`CalcAuyError::SerializationError`] se a serialização falhar.
fn serialize<T: serde::Serialize>(value: &T) -> Result<String, CalcAuyError> {
    serde_json::to_string(value).map_err(|error| CalcAuyError::SerializationError {
        message: error.to_string(),
    })
}

/// Verifica a assinatura de um traço de auditoria.
///
/// # Errors
///
/// Retorna erro se o JSON for inválido ou a assinatura não conferir.
fn verify(settings: &Settings, body: Option<&str>) -> Result<()> {
    let text = read_body(body)?;
    let parsed: AuditTrace =
        serde_json::from_str(text.trim()).map_err(|error| CalcAuyError::InvalidInput {
            message: error.to_string(),
        })?;
    let salt = Salt::new(settings.salt.clone());
    match parsed.verify(&salt) {
        Ok(()) => {
            println!("true");
            Ok(())
        }
        Err(error) => {
            println!("false");
            Err(error.into())
        }
    }
}

/// Reabre um rascunho e imprime a forma normalizada.
///
/// # Errors
///
/// Retorna erro se o rascunho for inválido.
fn hydrate(settings: &Settings, body: Option<&str>) -> Result<()> {
    let text = read_body(body)?;
    let instance = app(settings);
    let reopened = instance.hydrate(text.trim())?;
    println!("{}", reopened.hibernate()?);
    Ok(())
}

/// Gera o manual ou um script de completions.
fn man(completions: Option<Shell>) {
    match completions {
        Some(shell) => print!("{}", man::completions(shell)),
        None => print!("{}", man::man()),
    }
}

/// REPL interativo.
///
/// # Errors
///
/// Retorna erro se a entrada ou a saída padrão falharem.
fn repl(settings: &Settings) -> Result<()> {
    let stdin = std::io::stdin();
    let mut line = String::new();
    loop {
        print!("calc-auy> ");
        std::io::stdout()
            .flush()
            .context("falha ao escrever o prompt")?;
        line.clear();
        if stdin
            .read_line(&mut line)
            .context("falha ao ler a entrada padrão")?
            == 0
        {
            break;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if matches!(trimmed, "exit" | "quit") {
            break;
        }
        match dispatch(settings, trimmed) {
            Ok(output) => output.print(),
            Err(error) => eprintln!("erro: {error}"),
        }
    }
    Ok(())
}

/// Imprime informações de schema/versão.
///
/// # Errors
///
/// Retorna erro se a serialização falhar.
fn schema() -> Result<()> {
    let document = serde_json::json!({
        "name": "calc-auy",
        "version": env!("CARGO_PKG_VERSION"),
        "trace_version": 1,
        "payload": "SignaturePayload",
        "operations": ["format", "commit", "sign"],
        "modes": ["decimal", "monetary", "latex", "unicode", "mermaid", "scaled", "verbal"],
        "locales": ["pt-BR", "en-US", "en-EU", "fr-FR", "de-DE", "es-ES", "ru-RU", "zh-CN", "ja-JP"],
        "rounding": ["nbr5891", "half_up", "half_even", "truncate", "ceil", "none"],
        "error_format": ["human", "json"],
        "subcommands": ["verify", "hydrate", "repl", "schema", "man"],
    });
    println!("{}", serde_json::to_string_pretty(&document)?);
    Ok(())
}
