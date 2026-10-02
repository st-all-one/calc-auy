//! Realizador em alemão (Alemanha) com compostos (einundzwanzig).

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

use calc_auy_nlg::{
    Connectors, Gender, Grammar, NumberWords, Srl, VerbalRealizer, digits_to_words, split_groups,
};

const UNITS: [&str; 10] = [
    "", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
];
const TEENS: [&str; 10] = [
    "zehn",
    "elf",
    "zwölf",
    "dreizehn",
    "vierzehn",
    "fünfzehn",
    "sechzehn",
    "siebzehn",
    "achtzehn",
    "neunzehn",
];
const TENS: [&str; 10] = [
    "", "zehn", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig",
    "neunzig",
];

/// Léxico mínimo do alemão.
pub const WORDS: NumberWords = NumberWords {
    zero: "null",
    units: UNITS,
    feminine_units: None,
    teens: TEENS,
    tens: TENS,
    twenties: None,
    hundreds: [
        "",
        "einhundert",
        "zweihundert",
        "dreihundert",
        "vierhundert",
        "fünfhundert",
        "sechshundert",
        "siebenhundert",
        "achthundert",
        "neunhundert",
    ],
    exact_hundred: "einhundert",
    scales: &[],
    unit_join: "",
    hundred_join: "",
    group_join: " ",
    negative: "minus",
    decimal_word: "Komma",
    fraction_word: "geteilt durch",
};

/// Gramática do alemão.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "plus",
        sub: "minus",
        mul: "mal",
        div: "geteilt durch",
        pow_prefix: " hoch ",
        pow_suffix: "",
        modulo: "modulo",
        div_int: "ganzzahlig geteilt durch",
        cross_context_add: "plus (Kontext)",
    },
    group_prefix: "Klammer auf ",
    group_suffix: " Klammer zu",
};

/// Escreve um texto numérico por extenso em alemão.
fn number(text: &str, _gender: Gender) -> String {
    text.split_once('/').map_or_else(
        || decimal_de(text),
        |(numerator, denominator)| {
            format!(
                "{} geteilt durch {}",
                decimal_de(numerator),
                decimal_de(denominator)
            )
        },
    )
}

/// Escreve um decimal canônico em alemão.
fn decimal_de(text: &str) -> String {
    let (integer_part, fraction_part) = text
        .split_once('.')
        .map_or((text, None), |(integer, fraction)| {
            (integer, Some(fraction))
        });
    let mut out = integer_part
        .parse::<BigInt>()
        .map_or_else(|_| integer_part.to_string(), |value| integer_de(&value));
    if let Some(fraction) = fraction_part {
        let trimmed = fraction.trim_end_matches('0');
        if !trimmed.is_empty() {
            out.push_str(" Komma ");
            out.push_str(&digits_to_words(trimmed, &WORDS, Gender::Masculine));
        }
    }
    out
}

/// Escreve um inteiro em alemão.
fn integer_de(value: &BigInt) -> String {
    if value.is_zero() {
        return "null".to_string();
    }
    let negative = value.is_negative();
    let digits = value.magnitude().to_str_radix(10);
    let groups = split_groups(&digits, 3);
    let mut parts: Vec<String> = Vec::new();
    for (index, group) in groups.iter().enumerate().skip(2).rev() {
        if *group == 0 {
            continue;
        }
        parts.push(scale_group_de(*group, index));
    }
    let low = low_de(&groups);
    if !low.is_empty() {
        parts.push(low);
    }
    let joined = parts.join(" ");
    if negative {
        format!("minus {joined}")
    } else {
        joined
    }
}

/// Monta a parte abaixo de um milhão (`tausend` + unidades).
fn low_de(groups: &[u32]) -> String {
    let mut low = String::new();
    if let Some(thousands) = groups.get(1)
        && *thousands > 0
    {
        low.push_str(&thousands_de(*thousands));
        low.push_str("tausend");
    }
    if let Some(units) = groups.first()
        && *units > 0
    {
        low.push_str(&triple_de(*units));
    }
    low
}

/// Escreve a parte de milhares (`ein`/`zwei` + `tausend`).
fn thousands_de(group: u32) -> String {
    if group == 1 {
        "ein".to_string()
    } else {
        triple_de(group)
    }
}

/// Escreve um grupo de milhões/milhares com sua escala.
fn scale_group_de(group: u32, index: usize) -> String {
    let (singular, plural) = match index {
        2 => ("Million", "Millionen"),
        3 => ("Milliarde", "Milliarden"),
        4 => ("Billion", "Billionen"),
        5 => ("Billiarde", "Billiarden"),
        _ => ("", ""),
    };
    if group == 1 {
        format!("eine {singular}")
    } else {
        format!("{} {plural}", triple_de(group))
    }
}

/// Escreve um trio `0..=999` em alemão (composto).
fn triple_de(n: u32) -> String {
    let hundreds = n / 100;
    let rest = n % 100;
    let mut out = String::new();
    if hundreds > 0 {
        out.push_str(if hundreds == 1 {
            "ein"
        } else {
            unit_de(hundreds)
        });
        out.push_str("hundert");
    }
    if rest > 0 {
        out.push_str(&two_de(rest));
    }
    out
}

/// Escreve `0..=99` em alemão (composto).
fn two_de(n: u32) -> String {
    match n {
        0 => String::new(),
        1..=9 => unit_de(n).to_string(),
        10..=19 => word_at(&TEENS, n.saturating_sub(10)),
        _ => {
            let tens = word_at(&TENS, n / 10);
            let unit = n % 10;
            if unit == 0 {
                tens
            } else if unit == 1 {
                format!("einund{tens}")
            } else {
                format!("{}und{tens}", unit_de(unit))
            }
        }
    }
}

/// Retorna a unidade alemã.
fn unit_de(index: u32) -> &'static str {
    UNITS
        .get(usize::try_from(index).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
}

/// Retorna a palavra na posição `index`, ou `""`.
fn word_at(table: &[&'static str], index: u32) -> String {
    table
        .get(usize::try_from(index).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
        .to_string()
}

/// Realizador em alemão.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct DeDeRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl DeDeRealizer {
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

impl VerbalRealizer for DeDeRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "{expression} ist gleich {result}. Rundung: {} auf {} Nachkommastellen.",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "de-DE"
    }
}
