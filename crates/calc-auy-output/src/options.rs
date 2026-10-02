//! Opções de saída e tabelas de locale/moeda (dados, não NLG).

/// Localidade suportada.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Locale {
    /// Português do Brasil.
    #[default]
    PtBr,
    /// Inglês (Estados Unidos).
    EnUs,
    /// Francês (França).
    FrFr,
    /// Alemão (Alemanha).
    DeDe,
    /// Espanhol (Espanha).
    EsEs,
}

/// Posição do símbolo da moeda em relação ao número.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurrencyPosition {
    /// Prefixo colado (`$10`).
    Prefix,
    /// Prefixo com espaço (`R$ 10`).
    PrefixSpace,
    /// Sufixo colado (`10€`).
    Suffix,
    /// Sufixo com espaço (`10 €`).
    SuffixSpace,
}

/// Dados de formatação de uma localidade.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LocaleData {
    /// Separador decimal.
    pub decimal_separator: &'static str,
    /// Separador de milhares.
    pub thousand_separator: &'static str,
    /// Moeda padrão.
    pub currency: Currency,
    /// Posição do símbolo da moeda.
    pub currency_position: CurrencyPosition,
}

impl Locale {
    /// Interpreta um código (`pt-BR`, `en-US`, ...).
    #[must_use]
    pub fn from_code(code: &str) -> Self {
        match code {
            "en-US" | "en_US" | "en" => Self::EnUs,
            "fr-FR" | "fr_FR" | "fr" => Self::FrFr,
            "de-DE" | "de_DE" | "de" => Self::DeDe,
            "es-ES" | "es_ES" | "es" => Self::EsEs,
            _ => Self::PtBr,
        }
    }

    /// Retorna o código estável.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PtBr => "pt-BR",
            Self::EnUs => "en-US",
            Self::FrFr => "fr-FR",
            Self::DeDe => "de-DE",
            Self::EsEs => "es-ES",
        }
    }

    /// Retorna os dados de formatação.
    #[must_use]
    pub const fn data(self) -> LocaleData {
        match self {
            Self::PtBr => LocaleData {
                decimal_separator: ",",
                thousand_separator: ".",
                currency: Currency::Brl,
                currency_position: CurrencyPosition::PrefixSpace,
            },
            Self::EnUs => LocaleData {
                decimal_separator: ".",
                thousand_separator: ",",
                currency: Currency::Usd,
                currency_position: CurrencyPosition::Prefix,
            },
            Self::FrFr | Self::DeDe => LocaleData {
                decimal_separator: ",",
                thousand_separator: "\u{202f}",
                currency: Currency::Eur,
                currency_position: CurrencyPosition::SuffixSpace,
            },
            Self::EsEs => LocaleData {
                decimal_separator: ",",
                thousand_separator: ".",
                currency: Currency::Eur,
                currency_position: CurrencyPosition::SuffixSpace,
            },
        }
    }
}

/// Moeda suportada.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Currency {
    /// Real brasileiro.
    #[default]
    Brl,
    /// Dólar americano.
    Usd,
    /// Euro.
    Eur,
}

impl Currency {
    /// Interpreta um código (`BRL`, `USD`, ...).
    #[must_use]
    pub fn from_code(code: &str) -> Self {
        match code {
            "USD" | "usd" => Self::Usd,
            "EUR" | "eur" => Self::Eur,
            _ => Self::Brl,
        }
    }

    /// Retorna o código ISO 4217.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::Brl => "BRL",
            Self::Usd => "USD",
            Self::Eur => "EUR",
        }
    }

    /// Retorna o símbolo.
    #[must_use]
    pub const fn symbol(self) -> &'static str {
        match self {
            Self::Brl => "R$",
            Self::Usd => "$",
            Self::Eur => "€",
        }
    }
}

/// Opções de formatação de saída.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct OutputOptions {
    /// Número de casas decimais (padrão: 2, ou 50 sem arredondamento).
    pub decimals: Option<u32>,
    /// Localidade.
    pub locale: Option<Locale>,
    /// Moeda (padrão: a da localidade).
    pub currency: Option<Currency>,
    /// Rótulo de contexto para o diagrama Mermaid.
    pub context_label: Option<String>,
}

impl OutputOptions {
    /// Cria opções padrão.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            decimals: None,
            locale: None,
            currency: None,
            context_label: None,
        }
    }

    /// Define as casas decimais.
    #[must_use]
    pub const fn with_decimals(mut self, decimals: u32) -> Self {
        self.decimals = Some(decimals);
        self
    }

    /// Define a localidade.
    #[must_use]
    pub const fn with_locale(mut self, locale: Locale) -> Self {
        self.locale = Some(locale);
        self
    }

    /// Define a moeda.
    #[must_use]
    pub const fn with_currency(mut self, currency: Currency) -> Self {
        self.currency = Some(currency);
        self
    }

    /// Define o rótulo de contexto.
    #[must_use]
    pub fn with_context_label(mut self, label: impl Into<String>) -> Self {
        self.context_label = Some(label.into());
        self
    }

    /// Retorna a localidade efetiva.
    #[must_use]
    pub fn locale(&self) -> Locale {
        self.locale.unwrap_or_default()
    }

    /// Retorna a moeda efetiva.
    #[must_use]
    pub fn currency(&self) -> Currency {
        self.currency
            .unwrap_or_else(|| self.locale().data().currency)
    }
}
