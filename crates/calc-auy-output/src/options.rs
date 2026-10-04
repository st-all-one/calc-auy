//! Opções de saída e tabelas de locale/moeda (dados, não NLG).

/// Termos de apresentação do diagrama Mermaid por locale.
///
/// É **dado** (não NLG): mora junto das demais tabelas de locale, mantendo a
/// camada de saída independente da i18n completa (ADR-011).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MermaidTerms {
    /// Rótulo de contexto (`Contexto`).
    pub context: &'static str,
    /// Transferência de custódia entre contextos (`Handover`).
    pub handover: &'static str,
    /// Ingestão de um literal (`Ingestão`).
    pub ingestion: &'static str,
    /// Ingestão agrupada de operandos (`Ingestão de Operandos`).
    pub ingestion_operands: &'static str,
    /// Operação aplicada (`Operação`).
    pub operation: &'static str,
    /// Evento de controle (`Evento`).
    pub event: &'static str,
    /// Fechamento e assinatura final (`Fechamento e Assinatura Final`).
    pub closing: &'static str,
    /// Rótulo do rastro digital (`Signature`).
    pub signature: &'static str,
    /// Rótulo do dia atual (`Hoje`).
    pub today: &'static str,
    /// Rótulo de metadado do tipo objeto (`[Objeto]`).
    pub object_label: &'static str,
    /// Template de metadado do tipo lista, contendo `{n}`.
    pub list_template: &'static str,
}

/// Localidade suportada.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Locale {
    /// Português do Brasil.
    #[default]
    PtBr,
    /// Inglês (Estados Unidos).
    EnUs,
    /// Inglês (Europa).
    EnEu,
    /// Espanhol (Espanha).
    EsEs,
    /// Francês (França).
    FrFr,
    /// Alemão (Alemanha).
    DeDe,
    /// Russo (Rússia).
    RuRu,
    /// Chinês simplificado (China).
    ZhCn,
    /// Japonês (Japão).
    JaJp,
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
    /// Termos do diagrama Mermaid.
    pub mermaid: MermaidTerms,
}

/// Termos Mermaid em português do Brasil.
const MERMAID_PT_BR: MermaidTerms = MermaidTerms {
    context: "Contexto",
    handover: "Handover",
    ingestion: "Ingestão",
    ingestion_operands: "Ingestão de Operandos",
    operation: "Operação",
    event: "Evento",
    closing: "Fechamento e Assinatura Final",
    signature: "Signature",
    today: "Hoje",
    object_label: "[Objeto]",
    list_template: "[Lista: {n} itens]",
};

/// Termos Mermaid em inglês.
const MERMAID_EN: MermaidTerms = MermaidTerms {
    context: "Context",
    handover: "Handover",
    ingestion: "Ingestion",
    ingestion_operands: "Ingestion of Operands",
    operation: "Operation",
    event: "Event",
    closing: "Final Closing and Signature",
    signature: "Signature",
    today: "Today",
    object_label: "[Object]",
    list_template: "[List: {n} items]",
};

/// Termos Mermaid em espanhol.
const MERMAID_ES: MermaidTerms = MermaidTerms {
    context: "Contexto",
    handover: "Handover",
    ingestion: "Ingestión",
    ingestion_operands: "Ingestión de Operandos",
    operation: "Operación",
    event: "Evento",
    closing: "Cierre y Firma Final",
    signature: "Signature",
    today: "Hoy",
    object_label: "[Objeto]",
    list_template: "[Lista: {n} elementos]",
};

/// Termos Mermaid em francês.
const MERMAID_FR: MermaidTerms = MermaidTerms {
    context: "Contexte",
    handover: "Passage",
    ingestion: "Ingestion",
    ingestion_operands: "Ingestion des opérandes",
    operation: "Opération",
    event: "Événement",
    closing: "Clôture et Signature Finale",
    signature: "Signature",
    today: "Aujourd'hui",
    object_label: "[Objet]",
    list_template: "[Liste: {n} éléments]",
};

/// Termos Mermaid em alemão.
const MERMAID_DE: MermaidTerms = MermaidTerms {
    context: "Kontext",
    handover: "Übergabe",
    ingestion: "Aufnahme",
    ingestion_operands: "Aufnahme von Operanden",
    operation: "Operation",
    event: "Ereignis",
    closing: "Abschluss und Endgültige Signatur",
    signature: "Signature",
    today: "Heute",
    object_label: "[Objekt]",
    list_template: "[Liste: {n} Elemente]",
};

/// Termos Mermaid em russo.
const MERMAID_RU: MermaidTerms = MermaidTerms {
    context: "Контекст",
    handover: "Передача",
    ingestion: "Прием",
    ingestion_operands: "Прием операндов",
    operation: "Operation",
    event: "Событие",
    closing: "Закрытие и окончательная подпись",
    signature: "Signature",
    today: "Сегодня",
    object_label: "[Объект]",
    list_template: "[Список: {n} элементов]",
};

/// Termos Mermaid em chinês simplificado.
const MERMAID_ZH: MermaidTerms = MermaidTerms {
    context: "上下文",
    handover: "切换",
    ingestion: "摄入",
    ingestion_operands: "操作数摄入",
    operation: "操作",
    event: "事件",
    closing: "完成与最终签名",
    signature: "Signature",
    today: "今天",
    object_label: "[对象]",
    list_template: "[列表: {n} 项]",
};

/// Termos Mermaid em japonês.
const MERMAID_JA: MermaidTerms = MermaidTerms {
    context: "コンテキスト",
    handover: "ハンドオーバー",
    ingestion: "摂取",
    ingestion_operands: "オペランドの摂取",
    operation: "操作",
    event: "イベント",
    closing: "最终決算 e 署名",
    signature: "Signature",
    today: "今日",
    object_label: "[オブジェクト]",
    list_template: "[リスト: {n} 項目]",
};

/// Dados de locale: português do Brasil.
const DATA_PT_BR: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: ".",
    currency: Currency::Brl,
    currency_position: CurrencyPosition::PrefixSpace,
    mermaid: MERMAID_PT_BR,
};

/// Dados de locale: inglês americano.
const DATA_EN_US: LocaleData = LocaleData {
    decimal_separator: ".",
    thousand_separator: ",",
    currency: Currency::Usd,
    currency_position: CurrencyPosition::Prefix,
    mermaid: MERMAID_EN,
};

/// Dados de locale: inglês europeu.
const DATA_EN_EU: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: ".",
    currency: Currency::Eur,
    currency_position: CurrencyPosition::SuffixSpace,
    mermaid: MERMAID_EN,
};

/// Dados de locale: espanhol.
const DATA_ES_ES: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: ".",
    currency: Currency::Eur,
    currency_position: CurrencyPosition::SuffixSpace,
    mermaid: MERMAID_ES,
};

/// Dados de locale: francês.
const DATA_FR_FR: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: "\u{202f}",
    currency: Currency::Eur,
    currency_position: CurrencyPosition::SuffixSpace,
    mermaid: MERMAID_FR,
};

/// Dados de locale: alemão.
const DATA_DE_DE: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: "\u{202f}",
    currency: Currency::Eur,
    currency_position: CurrencyPosition::SuffixSpace,
    mermaid: MERMAID_DE,
};

/// Dados de locale: russo.
const DATA_RU_RU: LocaleData = LocaleData {
    decimal_separator: ",",
    thousand_separator: "\u{202f}",
    currency: Currency::Rub,
    currency_position: CurrencyPosition::SuffixSpace,
    mermaid: MERMAID_RU,
};

/// Dados de locale: chinês simplificado.
const DATA_ZH_CN: LocaleData = LocaleData {
    decimal_separator: ".",
    thousand_separator: ",",
    currency: Currency::Cny,
    currency_position: CurrencyPosition::Prefix,
    mermaid: MERMAID_ZH,
};

/// Dados de locale: japonês.
const DATA_JA_JP: LocaleData = LocaleData {
    decimal_separator: ".",
    thousand_separator: ",",
    currency: Currency::Jpy,
    currency_position: CurrencyPosition::Prefix,
    mermaid: MERMAID_JA,
};

impl Locale {
    /// Interpreta um código (`pt-BR`, `en-US`, ...).
    #[must_use]
    pub fn from_code(code: &str) -> Self {
        match code {
            "en-US" | "en_US" | "en" => Self::EnUs,
            "en-EU" | "en-GB" | "en_EU" | "en_GB" => Self::EnEu,
            "es-ES" | "es_ES" | "es" => Self::EsEs,
            "fr-FR" | "fr_FR" | "fr" => Self::FrFr,
            "de-DE" | "de_DE" | "de" => Self::DeDe,
            "ru-RU" | "ru_RU" | "ru" => Self::RuRu,
            "zh-CN" | "zh_CN" | "zh" => Self::ZhCn,
            "ja-JP" | "ja_JP" | "ja" => Self::JaJp,
            _ => Self::PtBr,
        }
    }

    /// Retorna o código estável.
    #[must_use]
    pub const fn code(self) -> &'static str {
        match self {
            Self::PtBr => "pt-BR",
            Self::EnUs => "en-US",
            Self::EnEu => "en-EU",
            Self::EsEs => "es-ES",
            Self::FrFr => "fr-FR",
            Self::DeDe => "de-DE",
            Self::RuRu => "ru-RU",
            Self::ZhCn => "zh-CN",
            Self::JaJp => "ja-JP",
        }
    }

    /// Retorna os dados de formatação.
    #[must_use]
    pub const fn data(self) -> LocaleData {
        match self {
            Self::PtBr => DATA_PT_BR,
            Self::EnUs => DATA_EN_US,
            Self::EnEu => DATA_EN_EU,
            Self::EsEs => DATA_ES_ES,
            Self::FrFr => DATA_FR_FR,
            Self::DeDe => DATA_DE_DE,
            Self::RuRu => DATA_RU_RU,
            Self::ZhCn => DATA_ZH_CN,
            Self::JaJp => DATA_JA_JP,
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
    /// Rublo russo.
    Rub,
    /// Yuan chinês.
    Cny,
    /// Iene japonês.
    Jpy,
}

impl Currency {
    /// Interpreta um código (`BRL`, `USD`, ...).
    #[must_use]
    pub fn from_code(code: &str) -> Self {
        match code {
            "USD" | "usd" => Self::Usd,
            "EUR" | "eur" => Self::Eur,
            "RUB" | "rub" => Self::Rub,
            "CNY" | "cny" => Self::Cny,
            "JPY" | "jpy" => Self::Jpy,
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
            Self::Rub => "RUB",
            Self::Cny => "CNY",
            Self::Jpy => "JPY",
        }
    }

    /// Retorna o símbolo.
    #[must_use]
    pub const fn symbol(self) -> &'static str {
        match self {
            Self::Brl => "R$",
            Self::Usd => "$",
            Self::Eur => "€",
            Self::Rub => "₽",
            Self::Cny | Self::Jpy => "¥",
        }
    }
}

/// Política de privacidade para o diagrama Mermaid.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Sensitivity {
    /// Redige literais e metadados marcados como PII (padrão).
    #[default]
    Redact,
    /// Expõe os valores.
    Expose,
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
    /// Política de privacidade do diagrama Mermaid.
    pub sensitive: Option<Sensitivity>,
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
            sensitive: None,
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

    /// Define a política de privacidade (redação de PII no Mermaid).
    #[must_use]
    pub const fn with_sensitivity(mut self, sensitivity: Sensitivity) -> Self {
        self.sensitive = Some(sensitivity);
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

    /// Retorna os termos Mermaid do locale efetivo.
    #[must_use]
    pub fn mermaid_terms(&self) -> MermaidTerms {
        self.locale().data().mermaid
    }

    /// Retorna se PII deve ser redigida (padrão: `true`).
    #[must_use]
    pub const fn is_sensitive(&self) -> bool {
        match self.sensitive {
            Some(Sensitivity::Redact) | None => true,
            Some(Sensitivity::Expose) => false,
        }
    }
}
