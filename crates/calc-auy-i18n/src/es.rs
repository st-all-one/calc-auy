//! Realizador em espanhol (Espanha).

use calc_auy_nlg::{
    Connectors, Gender, Grammar, NumberWords, ScaleWord, Srl, VerbalRealizer, literal_text_to_words,
};

const SCALES: &[ScaleWord] = &[
    ScaleWord {
        singular: "mil",
        plural: "mil",
        omit_one: true,
    },
    ScaleWord {
        singular: "millón",
        plural: "millones",
        omit_one: false,
    },
    ScaleWord {
        singular: "billón",
        plural: "billones",
        omit_one: false,
    },
];

/// Léxico de números do espanhol.
pub const WORDS: NumberWords = NumberWords {
    zero: "cero",
    units: [
        "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    ],
    feminine_units: Some([
        "", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    ]),
    teens: [
        "diez",
        "once",
        "doce",
        "trece",
        "catorce",
        "quince",
        "dieciséis",
        "diecisiete",
        "dieciocho",
        "diecinueve",
    ],
    tens: [
        "",
        "diez",
        "veinte",
        "treinta",
        "cuarenta",
        "cincuenta",
        "sesenta",
        "setenta",
        "ochenta",
        "noventa",
    ],
    twenties: Some([
        "veinte",
        "veintiuno",
        "veintidós",
        "veintitrés",
        "veinticuatro",
        "veinticinco",
        "veintiséis",
        "veintisiete",
        "veintiocho",
        "veintinueve",
    ]),
    hundreds: [
        "",
        "ciento",
        "doscientos",
        "trescientos",
        "cuatrocientos",
        "quinientos",
        "seiscientos",
        "setecientos",
        "ochocientos",
        "novecientos",
    ],
    exact_hundred: "cien",
    scales: SCALES,
    unit_join: " y ",
    hundred_join: " ",
    group_join: " ",
    negative: "menos",
    decimal_word: "coma",
    fraction_word: "sobre",
};

/// Gramática do espanhol.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "más",
        sub: "menos",
        mul: "por",
        div: "dividido por",
        pow_prefix: " elevado a ",
        pow_suffix: "",
        modulo: "módulo",
        div_int: "división entera por",
        cross_context_add: "más (contexto)",
    },
    group_prefix: "abre paréntesis ",
    group_suffix: " cierra paréntesis",
};

/// Escreve um texto numérico por extenso em espanhol.
fn number(text: &str, gender: Gender) -> String {
    literal_text_to_words(text, &WORDS, gender)
}

/// Realizador em espanhol.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct EsEsRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl EsEsRealizer {
    /// Cria o realizer.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            gender: Gender::Masculine,
        }
    }

    /// Cria o realizer com gênero explícito.
    #[must_use]
    pub const fn with_gender(gender: Gender) -> Self {
        Self { gender }
    }
}

impl VerbalRealizer for EsEsRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "{expression} es igual a {result}. Redondeo: {} a {} decimales.",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "es-ES"
    }
}
