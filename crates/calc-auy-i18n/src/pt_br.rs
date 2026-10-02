//! Realizador em português do Brasil (ordem SVO, vírgula decimal, gênero).

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
        singular: "milhão",
        plural: "milhões",
        omit_one: false,
    },
    ScaleWord {
        singular: "bilhão",
        plural: "bilhões",
        omit_one: false,
    },
    ScaleWord {
        singular: "trilhão",
        plural: "trilhões",
        omit_one: false,
    },
];

/// Léxico de números do português.
pub const WORDS: NumberWords = NumberWords {
    zero: "zero",
    units: [
        "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    ],
    feminine_units: Some([
        "", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    ]),
    teens: [
        "dez",
        "onze",
        "doze",
        "treze",
        "quatorze",
        "quinze",
        "dezesseis",
        "dezessete",
        "dezoito",
        "dezenove",
    ],
    tens: [
        "",
        "dez",
        "vinte",
        "trinta",
        "quarenta",
        "cinquenta",
        "sessenta",
        "setenta",
        "oitenta",
        "noventa",
    ],
    twenties: None,
    hundreds: [
        "",
        "cento",
        "duzentos",
        "trezentos",
        "quatrocentos",
        "quinhentos",
        "seiscentos",
        "setecentos",
        "oitocentos",
        "novecentos",
    ],
    exact_hundred: "cem",
    scales: SCALES,
    unit_join: " e ",
    hundred_join: " e ",
    group_join: " e ",
    negative: "menos",
    decimal_word: "vírgula",
    fraction_word: "sobre",
};

/// Gramática do português do Brasil.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "mais",
        sub: "menos",
        mul: "multiplicado por",
        div: "dividido por",
        pow_prefix: " elevado a ",
        pow_suffix: "",
        modulo: "módulo",
        div_int: "dividido inteiro por",
        cross_context_add: "mais (contexto)",
    },
    group_prefix: "abre parênteses ",
    group_suffix: " fecha parênteses",
};

/// Escreve um texto numérico por extenso em português.
fn number(text: &str, gender: Gender) -> String {
    literal_text_to_words(text, &WORDS, gender)
}

/// Realizador padrão em português do Brasil.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct PtBrRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl PtBrRealizer {
    /// Cria o realizer no masculino.
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

impl VerbalRealizer for PtBrRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "{expression} é igual a {result}. Arredondamento: {} para {} casas decimais.",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "pt-BR"
    }
}
