//! Realizadores em inglês (Estados Unidos e Europa).

use calc_auy_nlg::{
    Connectors, Gender, Grammar, NumberWords, ScaleWord, Srl, VerbalRealizer, literal_text_to_words,
};

const SCALES: &[ScaleWord] = &[
    ScaleWord {
        singular: "thousand",
        plural: "thousand",
        omit_one: false,
    },
    ScaleWord {
        singular: "million",
        plural: "million",
        omit_one: false,
    },
    ScaleWord {
        singular: "billion",
        plural: "billion",
        omit_one: false,
    },
    ScaleWord {
        singular: "trillion",
        plural: "trillion",
        omit_one: false,
    },
];

const CONNECTORS: Connectors = Connectors {
    add: "plus",
    sub: "minus",
    mul: "times",
    div: "divided by",
    pow_prefix: " to the power of ",
    pow_suffix: "",
    modulo: "modulo",
    div_int: "integer divided by",
    cross_context_add: "plus (context)",
};

const UNITS: [&str; 10] = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
];

const TEENS: [&str; 10] = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
];

const TENS: [&str; 10] = [
    "", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

const HUNDREDS: [&str; 10] = [
    "",
    "one hundred",
    "two hundred",
    "three hundred",
    "four hundred",
    "five hundred",
    "six hundred",
    "seven hundred",
    "eight hundred",
    "nine hundred",
];

/// Léxico americano (sem "and").
pub const WORDS_US: NumberWords = NumberWords {
    zero: "zero",
    units: UNITS,
    feminine_units: None,
    teens: TEENS,
    tens: TENS,
    twenties: None,
    hundreds: HUNDREDS,
    exact_hundred: "one hundred",
    scales: SCALES,
    unit_join: "-",
    hundred_join: " ",
    group_join: " ",
    negative: "minus",
    decimal_word: "point",
    fraction_word: "over",
};

/// Léxico britânico/europeu (com "and").
pub const WORDS_EU: NumberWords = NumberWords {
    hundred_join: " and ",
    group_join: " and ",
    ..WORDS_US
};

/// Gramática americana.
pub const GRAMMAR_US: Grammar = Grammar {
    number: number_us,
    connectors: CONNECTORS,
    group_prefix: "open parenthesis ",
    group_suffix: " close parenthesis",
    root_square: "square root of ",
    root_cubic: "cubic root of ",
    root_n: "the {den}-th root of ",
};

/// Gramática europeia.
pub const GRAMMAR_EU: Grammar = Grammar {
    number: number_eu,
    connectors: CONNECTORS,
    group_prefix: "open parenthesis ",
    group_suffix: " close parenthesis",
    root_square: "square root of ",
    root_cubic: "cubic root of ",
    root_n: "the {den}-th root of ",
};

/// Escreve um texto numérico por extenso (americano).
fn number_us(text: &str, gender: Gender) -> String {
    literal_text_to_words(text, &WORDS_US, gender)
}

/// Escreve um texto numérico por extenso (europeu).
fn number_eu(text: &str, gender: Gender) -> String {
    literal_text_to_words(text, &WORDS_EU, gender)
}

/// Realizador em inglês americano.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct EnUsRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl EnUsRealizer {
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

impl VerbalRealizer for EnUsRealizer {
    fn realize(&self, srl: &Srl) -> String {
        realize_with(&GRAMMAR_US, srl, self.gender)
    }

    fn language(&self) -> &'static str {
        "en-US"
    }
}

/// Realizador em inglês europeu.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct EnEuRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl EnEuRealizer {
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

impl VerbalRealizer for EnEuRealizer {
    fn realize(&self, srl: &Srl) -> String {
        realize_with(&GRAMMAR_EU, srl, self.gender)
    }

    fn language(&self) -> &'static str {
        "en-EU"
    }
}

/// Realiza uma SRL com a gramática e o gênero informados.
fn realize_with(grammar: &Grammar, srl: &Srl, gender: Gender) -> String {
    let expression = grammar.render_node(&srl.expression, gender);
    let result = grammar.render_result(&srl.result, gender);
    format!(
        "{expression} equals {result}. Rounding: {} to {} decimal places.",
        srl.round_strategy, srl.decimals
    )
}
