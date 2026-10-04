//! Realizador em japonês (Japão) com numeração por grupos de quatro dígitos.

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

use calc_auy_nlg::{
    Connectors, Gender, Grammar, NumberWords, Srl, VerbalRealizer, digits_to_words, split_groups,
};

const DIGITS: [&str; 10] = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const NAMES: [&str; 4] = ["千", "百", "十", ""];
const SCALES: [&str; 4] = ["", "万", "億", "兆"];

/// Léxico mínimo do japonês.
pub const WORDS: NumberWords = NumberWords {
    zero: "〇",
    units: DIGITS,
    feminine_units: None,
    teens: [
        "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九",
    ],
    tens: [
        "", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十",
    ],
    twenties: None,
    hundreds: [
        "", "一百", "二百", "三百", "四百", "五百", "六百", "七百", "八百", "九百",
    ],
    exact_hundred: "一百",
    scales: &[],
    unit_join: "",
    hundred_join: "",
    group_join: "",
    negative: "マイナス",
    decimal_word: "点",
    fraction_word: "分の",
};

/// Gramática do japonês.
pub const GRAMMAR: Grammar = Grammar {
    number,
    connectors: Connectors {
        add: "足す",
        sub: "引く",
        mul: "掛ける",
        div: "割る",
        pow_prefix: " の ",
        pow_suffix: " 乗",
        modulo: "余り",
        div_int: "整数除算",
        cross_context_add: "足す（コンテキスト）",
    },
    group_prefix: "（",
    group_suffix: "）",
    root_square: "平方根 ",
    root_cubic: "立方根 ",
    root_n: "{den}乗根 ",
};

/// Escreve um texto numérico por extenso em japonês.
fn number(text: &str, _gender: Gender) -> String {
    text.split_once('/').map_or_else(
        || decimal_ja(text),
        |(numerator, denominator)| {
            format!("{} 分の {}", decimal_ja(denominator), decimal_ja(numerator))
        },
    )
}

/// Escreve um decimal canônico em japonês.
fn decimal_ja(text: &str) -> String {
    let (integer_part, fraction_part) = text
        .split_once('.')
        .map_or((text, None), |(integer, fraction)| {
            (integer, Some(fraction))
        });
    let mut out = integer_part
        .parse::<BigInt>()
        .map_or_else(|_| integer_part.to_string(), |value| integer_ja(&value));
    if let Some(fraction) = fraction_part {
        let trimmed = fraction.trim_end_matches('0');
        if !trimmed.is_empty() {
            out.push('点');
            out.push_str(&digits_to_words(trimmed, &WORDS, Gender::Masculine));
        }
    }
    out
}

/// Escreve um inteiro em japonês (grupos de quatro dígitos).
fn integer_ja(value: &BigInt) -> String {
    if value.is_zero() {
        return "〇".to_string();
    }
    let negative = value.is_negative();
    let digits = value.magnitude().to_str_radix(10);
    let groups = split_groups(&digits, 4);
    let mut parts: Vec<String> = Vec::new();
    for (index, group) in groups.iter().enumerate().rev() {
        if *group == 0 {
            continue;
        }
        if !parts.is_empty() && *group < 1000 {
            parts.push("〇".to_string());
        }
        let scale = SCALES.get(index).copied().unwrap_or("");
        parts.push(format!("{}{scale}", four_ja(*group)));
    }
    let joined = parts.concat();
    if negative {
        format!("マイナス{joined}")
    } else {
        joined
    }
}

/// Escreve um grupo de quatro dígitos em japonês.
#[allow(
    clippy::arithmetic_side_effects,
    reason = "divisores fixos (1000/100/10/1) nunca são zero"
)]
fn four_ja(n: u32) -> String {
    if n == 0 {
        return String::new();
    }
    let divisors = [1000, 100, 10, 1];
    let mut out = String::new();
    let mut pending_zero = false;
    let mut started = false;
    for (position, divisor) in divisors.iter().enumerate() {
        let digit = (n / divisor) % 10;
        if digit == 0 {
            pending_zero |= started;
            continue;
        }
        if pending_zero {
            out.push('〇');
        }
        pending_zero = false;
        let name = NAMES.get(position).copied().unwrap_or("");
        let omit_one = !started && digit == 1 && *divisor != 1;
        if !omit_one {
            out.push_str(digit_ja(digit));
        }
        out.push_str(name);
        started = true;
    }
    out
}

/// Retorna o dígito japonês.
fn digit_ja(digit: u32) -> &'static str {
    DIGITS
        .get(usize::try_from(digit).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
}

/// Realizador em japonês.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct JaJpRealizer {
    /// Gênero para concordância.
    gender: Gender,
}

impl JaJpRealizer {
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

impl VerbalRealizer for JaJpRealizer {
    fn realize(&self, srl: &Srl) -> String {
        let expression = GRAMMAR.render_node(&srl.expression, self.gender);
        let result = GRAMMAR.render_result(&srl.result, self.gender);
        format!(
            "式 {expression} は {result} です。丸め：{}、小数第 {} 位。",
            srl.round_strategy, srl.decimals
        )
    }

    fn language(&self) -> &'static str {
        "ja-JP"
    }
}
