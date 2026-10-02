//! Realizador em francês (França) com numeração irregular (70/80/90).

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

use calc_auy_nlg::{
    Connectors, Gender, Grammar, Srl, VerbalRealizer, digits_to_words, split_groups,
};

const UNITS: [&str; 10] = [
    "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
];
const TEENS: [&str; 7] = [
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
];
const TENS: [&str; 7] = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
];

/// Gramática do francês.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "plus",
        sub: "moins",
        mul: "fois",
        div: "divisé par",
        pow_prefix: " puissance ",
        pow_suffix: "",
        modulo: "modulo",
        div_int: "division entière par",
        cross_context_add: "plus (contexte)",
    },
    group_prefix: "ouvre parenthèse ",
    group_suffix: " ferme parenthèse",
};

/// Escreve um texto numérico por extenso em francês.
fn number(text: &str, _gender: Gender) -> String {
    text.split_once('/').map_or_else(
        || decimal_fr(text),
        |(numerator, denominator)| {
            format!("{} sur {}", decimal_fr(numerator), decimal_fr(denominator))
        },
    )
}

/// Escreve um decimal canônico em francês.
fn decimal_fr(text: &str) -> String {
    let (integer_part, fraction_part) = text
        .split_once('.')
        .map_or((text, None), |(integer, fraction)| {
            (integer, Some(fraction))
        });
    let mut out = integer_part
        .parse::<BigInt>()
        .map_or_else(|_| integer_part.to_string(), |value| integer_fr(&value));
    if let Some(fraction) = fraction_part {
        let trimmed = fraction.trim_end_matches('0');
        if !trimmed.is_empty() {
            out.push_str(" virgule ");
            out.push_str(&digits_to_words(trimmed, &WORDS_FR, Gender::Masculine));
        }
    }
    out
}

/// Escreve um inteiro em francês.
fn integer_fr(value: &BigInt) -> String {
    if value.is_zero() {
        return "zéro".to_string();
    }
    let negative = value.is_negative();
    let digits = value.magnitude().to_str_radix(10);
    let groups = split_groups(&digits, 3);
    let mut parts: Vec<String> = Vec::new();
    for (index, group) in groups.iter().enumerate().rev() {
        if *group == 0 {
            continue;
        }
        parts.push(group_fr(*group, index));
    }
    let joined = parts.join(" ");
    if negative {
        format!("moins {joined}")
    } else {
        joined
    }
}

/// Escreve um grupo com sua escala em francês.
fn group_fr(group: u32, index: usize) -> String {
    if index == 1 && group == 1 {
        return "mille".to_string();
    }
    let word = triple_fr(group);
    match index {
        0 => word,
        1 => format!("{word} mille"),
        _ if group == 1 => format!("{word} million"),
        _ => format!("{word} millions"),
    }
}

/// Escreve um trio `0..=999` em francês.
fn triple_fr(n: u32) -> String {
    if n == 0 {
        return "zéro".to_string();
    }
    let hundreds = n / 100;
    let rest = n % 100;
    let mut out = hundreds_fr(hundreds, rest);
    if rest > 0 {
        if hundreds > 0 {
            out.push(' ');
        }
        out.push_str(&two_fr(rest));
    }
    out
}

/// Escreve a centena francesa, com plural em `cents`.
fn hundreds_fr(hundreds: u32, rest: u32) -> String {
    if hundreds == 0 {
        return String::new();
    }
    if hundreds == 1 {
        return "cent".to_string();
    }
    let unit = unit_fr(hundreds);
    if rest == 0 {
        format!("{unit} cents")
    } else {
        format!("{unit} cent")
    }
}

/// Escreve `0..=99` em francês.
fn two_fr(n: u32) -> String {
    match n {
        0 => "zéro".to_string(),
        1..=9 => unit_fr(n),
        10..=16 => word_at(&TEENS, n.saturating_sub(10)),
        17..=19 => format!("dix-{}", unit_fr(n.saturating_sub(10))),
        20..=69 => tens_fr(n),
        70..=79 if n == 71 => "soixante et onze".to_string(),
        70..=79 => format!("soixante-{}", two_fr(n.saturating_sub(60))),
        80..=99 if n == 80 => "quatre-vingts".to_string(),
        80..=99 => format!("quatre-vingt-{}", two_fr(n.saturating_sub(80))),
        _ => String::new(),
    }
}

/// Escreve as dezenas `20..=69` em francês.
fn tens_fr(n: u32) -> String {
    let tens = word_at(&TENS, n / 10);
    let unit = n % 10;
    if unit == 0 {
        tens
    } else if unit == 1 {
        format!("{tens} et un")
    } else {
        format!("{tens}-{}", unit_fr(unit))
    }
}

/// Retorna a unidade francesa.
fn unit_fr(index: u32) -> String {
    word_at(&UNITS, index)
}

/// Retorna a palavra na posição `index`, ou `""`.
fn word_at(table: &[&'static str], index: u32) -> String {
    table
        .get(usize::try_from(index).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
        .to_string()
}

/// Léxico mínimo do francês (para dígitos).
const WORDS_FR: calc_auy_nlg::NumberWords = calc_auy_nlg::NumberWords {
    zero: "zéro",
    units: UNITS,
    feminine_units: None,
    teens: [
        "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit",
        "dix-neuf",
    ],
    tens: [
        "",
        "dix",
        "vingt",
        "trente",
        "quarante",
        "cinquante",
        "soixante",
        "soixante-dix",
        "quatre-vingts",
        "quatre-vingt-dix",
    ],
    twenties: None,
    hundreds: [
        "",
        "cent",
        "deux cents",
        "trois cents",
        "quatre cents",
        "cinq cents",
        "six cents",
        "sept cents",
        "huit cents",
        "neuf cents",
    ],
    exact_hundred: "cent",
    scales: &[],
    unit_join: "-",
    hundred_join: " ",
    group_join: " ",
    negative: "moins",
    decimal_word: "virgule",
    fraction_word: "sur",
};

/// Realizador em francês.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct FrFrRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl FrFrRealizer {
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

impl VerbalRealizer for FrFrRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "{expression} est égal à {result}. Arrondi : {} à {} décimales.",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "fr-FR"
    }
}
