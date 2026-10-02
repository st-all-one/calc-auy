//! Parâmetros (`--params`), configuração efetiva e ambiente.
//!
//! Precedência: `--params` > ambiente > padrões. O arquivo apontado por
//! `CALC_AUY_CONFIG` (formato `chave = valor`) serve de base.

use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{Context, Result};
use calc_auy_api::{Language, Locale, RoundingStrategy};
use serde::Deserialize;

use crate::cli::Cli;
use crate::error::ErrorFormat;

/// Operação do fluxo principal.
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum Op {
    /// Formata o resultado (padrão).
    #[default]
    Format,
    /// Sela e devolve o traço de auditoria assinado.
    Commit,
    /// Devolve a assinatura (hex).
    Sign,
}

/// Modo de formatação.
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum FormatMode {
    /// Decimal simples (padrão).
    #[default]
    Decimal,
    /// Monetário no locale.
    Monetary,
    /// LaTeX.
    Latex,
    /// Unicode (frações/sobrescritos).
    Unicode,
    /// Diagrama Mermaid.
    Mermaid,
    /// Inteiro escalado (string).
    Scaled,
    /// Descrição verbal (acessibilidade).
    Verbal,
}

/// Objeto de parâmetros (`--params`).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Params {
    /// Operação do fluxo principal.
    pub(crate) op: Option<Op>,
    /// Sal de assinatura.
    pub(crate) salt: Option<String>,
    /// Casas decimais.
    pub(crate) decimals: Option<u32>,
    /// Estratégia de arredondamento.
    pub(crate) rounding: Option<String>,
    /// Locale de saída.
    pub(crate) locale: Option<String>,
    /// Modo de formatação.
    pub(crate) mode: Option<FormatMode>,
    /// Formato de erro.
    pub(crate) error_format: Option<ErrorFormat>,
    /// Usa relógio determinístico (`MockClock`).
    pub(crate) deterministic: Option<bool>,
}

/// Configuração efetiva usada pelos comandos.
#[derive(Debug, Clone)]
pub(crate) struct Settings {
    /// Operação do fluxo principal.
    pub(crate) op: Op,
    /// Sal de assinatura.
    pub(crate) salt: String,
    /// Casas decimais.
    pub(crate) decimals: u32,
    /// Estratégia de arredondamento.
    pub(crate) rounding: RoundingStrategy,
    /// Locale de saída.
    pub(crate) locale: Locale,
    /// Idioma de realização verbal.
    pub(crate) language: Language,
    /// Modo de formatação.
    pub(crate) mode: FormatMode,
    /// Formato de erro.
    pub(crate) error_format: ErrorFormat,
    /// Usa relógio determinístico.
    pub(crate) deterministic: bool,
}

impl Settings {
    /// Resolve a configuração combinando `--params`, ambiente e padrões.
    ///
    /// # Errors
    ///
    /// Retorna erro se o arquivo de configuração do ambiente não puder ser
    /// lido.
    pub(crate) fn resolve(params: &Params) -> Result<Self> {
        let file = match std::env::var("CALC_AUY_CONFIG") {
            Ok(path) => load_file(Path::new(&path))?,
            Err(_) => BTreeMap::new(),
        };
        let salt = params
            .salt
            .clone()
            .or_else(|| std::env::var("CALC_AUY_SALT").ok())
            .or_else(|| file.get("salt").cloned())
            .unwrap_or_else(|| "calc-auy".to_string());
        let decimals = params
            .decimals
            .or_else(|| std::env::var("CALC_AUY_DECIMALS").ok()?.parse().ok())
            .or_else(|| file.get("decimals").and_then(|value| value.parse().ok()))
            .unwrap_or(2);
        let rounding_name = params
            .rounding
            .clone()
            .or_else(|| std::env::var("CALC_AUY_ROUNDING").ok())
            .or_else(|| file.get("rounding").cloned())
            .unwrap_or_else(|| "nbr5891".to_string());
        let locale_name = params
            .locale
            .clone()
            .or_else(|| std::env::var("CALC_AUY_LOCALE").ok())
            .or_else(|| file.get("locale").cloned())
            .unwrap_or_else(|| "pt-BR".to_string());
        Ok(Self {
            op: params.op.unwrap_or_default(),
            salt,
            decimals,
            rounding: parse_rounding(&rounding_name),
            locale: Locale::from_code(&locale_name),
            language: Language::from_code(&locale_name),
            mode: params.mode.unwrap_or_default(),
            error_format: params.error_format.unwrap_or_default(),
            deterministic: params.deterministic.unwrap_or(false),
        })
    }

    /// Aplica os campos presentes em `params` sobre a configuração atual.
    pub(crate) fn apply(&mut self, params: &Params) {
        if let Some(op) = params.op {
            self.op = op;
        }
        if let Some(mode) = params.mode {
            self.mode = mode;
        }
        if let Some(error_format) = params.error_format {
            self.error_format = error_format;
        }
        if let Some(deterministic) = params.deterministic {
            self.deterministic = deterministic;
        }
        if let Some(salt) = &params.salt {
            self.salt.clone_from(salt);
        }
        if let Some(decimals) = params.decimals {
            self.decimals = decimals;
        }
        if let Some(rounding) = &params.rounding {
            self.rounding = parse_rounding(rounding);
        }
        if let Some(locale) = &params.locale {
            self.locale = Locale::from_code(locale);
            self.language = Language::from_code(locale);
        }
    }
}

/// Carrega os parâmetros de `--params` (ou os padrões).
///
/// # Errors
///
/// Retorna erro se o JSON for inválido.
pub(crate) fn load(cli: &Cli) -> Result<Params> {
    cli.params.as_deref().map_or_else(
        || Ok(Params::default()),
        |json| serde_json::from_str(json).context("parâmetros inválidos em `--params`"),
    )
}

/// Converte um nome de estratégia em [`RoundingStrategy`].
fn parse_rounding(name: &str) -> RoundingStrategy {
    match name {
        "half_up" => RoundingStrategy::HalfUp,
        "half_even" => RoundingStrategy::HalfEven,
        "truncate" => RoundingStrategy::Truncate,
        "ceil" => RoundingStrategy::Ceil,
        "none" => RoundingStrategy::None,
        _ => RoundingStrategy::Nbr5891,
    }
}

/// Lê um arquivo `chave = valor` (comentários com `#`).
///
/// # Errors
///
/// Retorna erro se o arquivo não puder ser lido.
fn load_file(path: &Path) -> Result<BTreeMap<String, String>> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("falha ao ler a configuração {}", path.display()))?;
    Ok(parse(&text))
}

/// Analisa o conteúdo `chave = valor`.
fn parse(text: &str) -> BTreeMap<String, String> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .filter_map(|line| line.split_once('='))
        .map(|(key, value)| (key.trim().to_string(), value.trim().to_string()))
        .collect()
}
