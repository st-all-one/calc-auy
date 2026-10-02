//! Realizador em russo (Rússia) com concordância de plural.

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

use calc_auy_nlg::{
    Connectors, Gender, Grammar, NumberWords, Srl, VerbalRealizer, digits_to_words, split_groups,
};

const UNITS: [&str; 10] = [
    "",
    "один",
    "два",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
];
const FEMININE_UNITS: [&str; 10] = [
    "",
    "одна",
    "две",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
];
const TEENS: [&str; 10] = [
    "десять",
    "одиннадцать",
    "двенадцать",
    "тринадцать",
    "четырнадцать",
    "пятнадцать",
    "шестнадцать",
    "семнадцать",
    "восемнадцать",
    "девятнадцать",
];
const TENS: [&str; 10] = [
    "",
    "десять",
    "двадцать",
    "тридцать",
    "сорок",
    "пятьдесят",
    "шестьдесят",
    "семьдесят",
    "восемьдесят",
    "девяносто",
];
const HUNDREDS: [&str; 10] = [
    "",
    "сто",
    "двести",
    "триста",
    "четыреста",
    "пятьсот",
    "шестьсот",
    "семьсот",
    "восемьсот",
    "девятьсот",
];

/// Léxico mínimo do russo.
pub const WORDS: NumberWords = NumberWords {
    zero: "ноль",
    units: UNITS,
    feminine_units: Some(FEMININE_UNITS),
    teens: TEENS,
    tens: TENS,
    twenties: None,
    hundreds: HUNDREDS,
    exact_hundred: "сто",
    scales: &[],
    unit_join: " ",
    hundred_join: " ",
    group_join: " ",
    negative: "минус",
    decimal_word: "запятая",
    fraction_word: "делённое на",
};

/// Gramática do russo.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "плюс",
        sub: "минус",
        mul: "умножить на",
        div: "делить на",
        pow_prefix: " в степени ",
        pow_suffix: "",
        modulo: "модуль",
        div_int: "целочисленно делить на",
        cross_context_add: "плюс (контекст)",
    },
    group_prefix: "открывающая скобка ",
    group_suffix: " закрывающая скобка",
};

/// Escreve um texto numérico por extenso em russo.
fn number(text: &str, _gender: Gender) -> String {
    text.split_once('/').map_or_else(
        || decimal_ru(text),
        |(numerator, denominator)| {
            format!(
                "{} делённое на {}",
                decimal_ru(numerator),
                decimal_ru(denominator)
            )
        },
    )
}

/// Escreve um decimal canônico em russo.
fn decimal_ru(text: &str) -> String {
    let (integer_part, fraction_part) = text
        .split_once('.')
        .map_or((text, None), |(integer, fraction)| {
            (integer, Some(fraction))
        });
    let mut out = integer_part
        .parse::<BigInt>()
        .map_or_else(|_| integer_part.to_string(), |value| integer_ru(&value));
    if let Some(fraction) = fraction_part {
        let trimmed = fraction.trim_end_matches('0');
        if !trimmed.is_empty() {
            out.push_str(" запятая ");
            out.push_str(&digits_to_words(trimmed, &WORDS, Gender::Masculine));
        }
    }
    out
}

/// Escreve um inteiro em russo.
fn integer_ru(value: &BigInt) -> String {
    if value.is_zero() {
        return "ноль".to_string();
    }
    let negative = value.is_negative();
    let digits = value.magnitude().to_str_radix(10);
    let groups = split_groups(&digits, 3);
    let mut parts: Vec<String> = Vec::new();
    for (index, group) in groups.iter().enumerate().rev() {
        if *group == 0 {
            continue;
        }
        parts.push(group_ru(*group, index));
    }
    let joined = parts.join(" ");
    if negative {
        format!("минус {joined}")
    } else {
        joined
    }
}

/// Escreve um grupo com sua escala em russo.
fn group_ru(group: u32, index: usize) -> String {
    match index {
        0 => triple_ru(group, Gender::Masculine),
        1 => format!(
            "{} {}",
            triple_ru(group, Gender::Feminine),
            plural_ru(group, "тысяча", "тысячи", "тысяч")
        ),
        2 => format!(
            "{} {}",
            triple_ru(group, Gender::Masculine),
            plural_ru(group, "миллион", "миллиона", "миллионов")
        ),
        _ => format!(
            "{} {}",
            triple_ru(group, Gender::Masculine),
            plural_ru(group, "миллиард", "миллиарда", "миллиардов")
        ),
    }
}

/// Escreve um trio `0..=999` em russo.
fn triple_ru(n: u32, gender: Gender) -> String {
    let hundreds = n / 100;
    let rest = n % 100;
    let mut out = String::new();
    if hundreds > 0 {
        out.push_str(word_at(&HUNDREDS, hundreds));
    }
    if rest > 0 {
        if hundreds > 0 {
            out.push(' ');
        }
        out.push_str(&two_ru(rest, gender));
    }
    out
}

/// Escreve `0..=99` em russo.
fn two_ru(n: u32, gender: Gender) -> String {
    if n < 10 {
        return unit_ru(n, gender).to_string();
    }
    if n < 20 {
        return word_at(&TEENS, n.saturating_sub(10)).to_string();
    }
    let tens = word_at(&TENS, n / 10);
    let unit = n % 10;
    if unit == 0 {
        tens.to_string()
    } else {
        format!("{tens} {}", unit_ru(unit, gender))
    }
}

/// Retorna a unidade russa conforme o gênero.
fn unit_ru(index: u32, gender: Gender) -> &'static str {
    let table = if gender == Gender::Feminine {
        FEMININE_UNITS
    } else {
        UNITS
    };
    word_at(&table, index)
}

/// Retorna a palavra na posição `index`, ou `""`.
fn word_at(table: &[&'static str], index: u32) -> &'static str {
    table
        .get(usize::try_from(index).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
}

/// Escolhe a forma plural russa (`1`, `2-4`, `5+`).
fn plural_ru(n: u32, one: &'static str, few: &'static str, many: &'static str) -> &'static str {
    let mod100 = n % 100;
    if (11..=14).contains(&mod100) {
        return many;
    }
    match n % 10 {
        1 => one,
        2..=4 => few,
        _ => many,
    }
}

/// Realizador em russo.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct RuRuRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl RuRuRealizer {
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

impl VerbalRealizer for RuRuRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "{expression} равно {result}. Округление: {} до {} знаков.",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "ru-RU"
    }
}
