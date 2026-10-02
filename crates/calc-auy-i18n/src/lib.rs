//! Realizadores linguísticos (NLG) por idioma.
//!
//! A camada é plugável (ADR-011): a SRL e o trait [`calc_auy_nlg::VerbalRealizer`]
//! vivem em `calc-auy-nlg`; aqui ficam o léxico (dados) e a gramática (código)
//! de cada idioma. Idiomas podem reordenar elementos, mudar a concordância e a
//! estratégia de leitura numérica (grupos de 3 ou de 4 dígitos).
//!
//! # Idiomas disponíveis
//!
//! `pt-BR`, `en-US`, `en-EU`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`, `zh-CN` e
//! `ja-JP`. Use [`Language::from_code`] e [`realizer`].
//!
//! # Estendendo um idioma
//!
//! Um idioma é **dados** ([`calc_auy_nlg::NumberWords`] e conectivos) mais
//! **funções gramaticais**. Para adicionar um idioma:
//!
//! 1. Defina o léxico (`NumberWords`) e a função de escrita numérica.
//! 2. Monte uma [`calc_auy_nlg::Grammar`] com os conectivos e os delimitadores.
//! 3. Implemente [`calc_auy_nlg::VerbalRealizer`] formatando a sentença.
//!
//! O exemplo abaixo mostra o *seam* reutilizável (uma realização mínima):
//!
//! ```
//! use calc_auy_i18n::{grammar, Language};
//! use calc_auy_nlg::{Gender, Srl, SrlNode, VerbalRealizer};
//!
//! struct Echo;
//!
//! impl VerbalRealizer for Echo {
//!     fn realize(&self, srl: &Srl) -> String {
//!         let expression = grammar(Language::EnUs).render_node(&srl.expression, Gender::Masculine);
//!         format!("{expression} = {}", srl.result)
//!     }
//!
//!     fn language(&self) -> &'static str {
//!         "xx-XX"
//!     }
//! }
//!
//! let srl = Srl {
//!     expression: SrlNode::Literal("42".to_string()),
//!     result: "42".to_string(),
//!     round_strategy: "none".to_string(),
//!     decimals: 0,
//! };
//! assert_eq!(Echo.realize(&srl), "forty-two = 42");
//! ```

pub mod de;
pub mod en;
pub mod es;
pub mod fr;
pub mod ja;
pub mod pt_br;
pub mod ru;
pub mod zh;

use calc_auy_nlg::{Gender, VerbalRealizer};

pub use de::DeDeRealizer;
pub use en::{EnEuRealizer, EnUsRealizer};
pub use es::EsEsRealizer;
pub use fr::FrFrRealizer;
pub use ja::JaJpRealizer;
pub use pt_br::PtBrRealizer;
pub use ru::RuRuRealizer;
pub use zh::ZhCnRealizer;

/// Idioma suportado pela camada de realização.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Language {
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
    /// Chinês (China).
    ZhCn,
    /// Japonês (Japão).
    JaJp,
}

impl Language {
    /// Interpreta um código BCP-47 (`pt-BR`, `en-EU`, ...).
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

    /// Retorna o código BCP-47 estável.
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

    /// Cria o realizer correspondente.
    #[must_use]
    pub fn realizer(self) -> Box<dyn VerbalRealizer> {
        match self {
            Self::PtBr => Box::new(PtBrRealizer::new()),
            Self::EnUs => Box::new(EnUsRealizer::new()),
            Self::EnEu => Box::new(EnEuRealizer::new()),
            Self::EsEs => Box::new(EsEsRealizer::new()),
            Self::FrFr => Box::new(FrFrRealizer::new()),
            Self::DeDe => Box::new(DeDeRealizer::new()),
            Self::RuRu => Box::new(RuRuRealizer::new()),
            Self::ZhCn => Box::new(ZhCnRealizer::new()),
            Self::JaJp => Box::new(JaJpRealizer::new()),
        }
    }

    /// Cria o realizer com gênero gramatical explícito.
    #[must_use]
    pub fn realizer_with_gender(self, gender: Gender) -> Box<dyn VerbalRealizer> {
        match self {
            Self::PtBr => Box::new(PtBrRealizer::with_gender(gender)),
            Self::EnUs => Box::new(EnUsRealizer::with_gender(gender)),
            Self::EnEu => Box::new(EnEuRealizer::with_gender(gender)),
            Self::EsEs => Box::new(EsEsRealizer::with_gender(gender)),
            Self::FrFr => Box::new(FrFrRealizer::with_gender(gender)),
            Self::DeDe => Box::new(DeDeRealizer::with_gender(gender)),
            Self::RuRu => Box::new(RuRuRealizer::with_gender(gender)),
            Self::ZhCn => Box::new(ZhCnRealizer::with_gender(gender)),
            Self::JaJp => Box::new(JaJpRealizer::with_gender(gender)),
        }
    }
}

/// Cria um realizer para o idioma informado.
#[must_use]
pub fn realizer(language: Language) -> Box<dyn VerbalRealizer> {
    language.realizer()
}

/// Retorna a gramática (léxico + conectivos) do idioma.
#[must_use]
pub const fn grammar(language: Language) -> calc_auy_nlg::Grammar {
    match language {
        Language::PtBr => pt_br::GRAMMAR,
        Language::EnUs => en::GRAMMAR_US,
        Language::EnEu => en::GRAMMAR_EU,
        Language::EsEs => es::GRAMMAR,
        Language::FrFr => fr::GRAMMAR,
        Language::DeDe => de::GRAMMAR,
        Language::RuRu => ru::GRAMMAR,
        Language::ZhCn => zh::GRAMMAR,
        Language::JaJp => ja::GRAMMAR,
    }
}

/// Cria um realizer a partir de um código BCP-47.
#[must_use]
pub fn realizer_for_code(code: &str) -> Box<dyn VerbalRealizer> {
    Language::from_code(code).realizer()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn language_codes_roundtrip() {
        let languages = [
            Language::PtBr,
            Language::EnUs,
            Language::EnEu,
            Language::EsEs,
            Language::FrFr,
            Language::DeDe,
            Language::RuRu,
            Language::ZhCn,
            Language::JaJp,
        ];
        for language in languages {
            assert_eq!(Language::from_code(language.code()), language);
            assert_eq!(language.realizer().language(), language.code());
        }
    }

    #[test]
    fn unknown_code_falls_back_to_pt_br() {
        assert_eq!(Language::from_code("xx-XX"), Language::PtBr);
    }
}
