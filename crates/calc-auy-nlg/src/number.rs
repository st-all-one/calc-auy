//! Léxico de números e algoritmos genéricos de escrita por extenso.
//!
//! As tabelas de palavras são **dados** ([`NumberWords`]); o algoritmo que as
//! combina é **código** (ADR-011). Idiomas com estruturas irregulares
//! (francês, alemão, russo, chinês, japonês) trazem funções dedicadas em
//! `calc-auy-i18n`, reaproveitando os auxiliares daqui.

use num_bigint::BigInt;
use num_traits::{Signed, Zero};

/// Gênero gramatical para concordância.
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Gender {
    /// Masculino.
    #[default]
    Masculine,
    /// Feminino.
    Feminine,
    /// Neutro.
    Neuter,
}

/// Palavra de escala (mil, milhão, ...) com singular e plural.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScaleWord {
    /// Forma singular.
    pub singular: &'static str,
    /// Forma plural.
    pub plural: &'static str,
    /// Omite o "um" (ex.: português "mil", não "um mil").
    pub omit_one: bool,
}

/// Léxico de números de uma língua.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NumberWords {
    /// Palavra para zero.
    pub zero: &'static str,
    /// Unidades `0..=9` (índice 0 não usado).
    pub units: [&'static str; 10],
    /// Unidades no feminino, quando houver.
    pub feminine_units: Option<[&'static str; 10]>,
    /// Números `10..=19`.
    pub teens: [&'static str; 10],
    /// Dezenas `0,10,...,90`.
    pub tens: [&'static str; 10],
    /// Formas contraídas `20..=29`, quando houver.
    pub twenties: Option<[&'static str; 10]>,
    /// Centenas `0,100,...,900`.
    pub hundreds: [&'static str; 10],
    /// Forma exata de `100`.
    pub exact_hundred: &'static str,
    /// Escalas `10^3, 10^6, ...`.
    pub scales: &'static [ScaleWord],
    /// Junta dezena e unidade (`" e "`, `"-"`).
    pub unit_join: &'static str,
    /// Junta centena e resto (`" e "`, `" and "`).
    pub hundred_join: &'static str,
    /// Junta grupos de escala quando cabe conjunção (`" e "`, `" and "`).
    pub group_join: &'static str,
    /// Palavra para o sinal negativo.
    pub negative: &'static str,
    /// Palavra do separador decimal.
    pub decimal_word: &'static str,
    /// Palavra de fração (`"sobre"`, `"over"`).
    pub fraction_word: &'static str,
}

/// Escreve por extenso o valor absoluto em grupos de três dígitos.
#[must_use]
pub fn integer_to_words(value: &BigInt, words: &NumberWords, gender: Gender) -> String {
    if value.is_zero() {
        return words.zero.to_string();
    }
    let negative = value.is_negative();
    let magnitude = value.magnitude();
    let digits = magnitude.to_str_radix(10);
    let groups = split_groups(&digits, 3);
    let mut entries: Vec<(u32, String)> = Vec::new();
    for (index, group) in groups.iter().enumerate().rev() {
        if *group == 0 {
            continue;
        }
        entries.push((*group, group_part(*group, index, words, gender)));
    }
    let result = join_entries(&entries, words);
    if negative {
        format!("{} {result}", words.negative)
    } else {
        result
    }
}

/// Escreve por extenso um texto decimal canônico (ponto como separador).
#[must_use]
pub fn decimal_text_to_words(text: &str, words: &NumberWords, gender: Gender) -> String {
    let (integer_part, fraction_part) = text
        .split_once('.')
        .map_or((text, None), |(integer, fraction)| {
            (integer, Some(fraction))
        });
    let mut out = integer_part.parse::<BigInt>().map_or_else(
        |_| integer_part.to_string(),
        |value| integer_to_words(&value, words, gender),
    );
    if let Some(fraction) = fraction_part {
        out.push_str(&fraction_to_words(fraction, words, gender));
    }
    out
}

/// Escreve por extenso o texto original de um literal (aceita fração `a/b`).
#[must_use]
pub fn literal_text_to_words(text: &str, words: &NumberWords, gender: Gender) -> String {
    text.split_once('/').map_or_else(
        || decimal_text_to_words(text, words, gender),
        |(numerator, denominator)| {
            format!(
                "{} {} {}",
                decimal_text_to_words(numerator, words, gender),
                words.fraction_word,
                decimal_text_to_words(denominator, words, gender)
            )
        },
    )
}

/// Escreve um inteiro positivo em grupos de `size` dígitos (menos significativo
/// primeiro).
#[must_use]
pub fn split_groups(digits: &str, size: usize) -> Vec<u32> {
    let mut groups = Vec::new();
    let mut end = digits.len();
    while end > 0 {
        let start = end.saturating_sub(size);
        let chunk = digits.get(start..end).unwrap_or("");
        groups.push(chunk.parse::<u32>().unwrap_or(0));
        end = start;
    }
    groups
}

/// Escreve um trio `0..=999` por extenso.
#[must_use]
pub fn triple_to_words(n: u32, words: &NumberWords, gender: Gender) -> String {
    if n == 0 {
        return words.zero.to_string();
    }
    if n == 100 {
        return words.exact_hundred.to_string();
    }
    let mut out = String::new();
    let hundreds = n / 100;
    let rest = n % 100;
    if hundreds > 0 {
        out.push_str(word_at(&words.hundreds, hundreds));
    }
    if rest > 0 {
        if hundreds > 0 {
            out.push_str(words.hundred_join);
        }
        out.push_str(&two_digits_to_words(rest, words, gender));
    }
    out
}

/// Escreve `0..=99` por extenso.
#[must_use]
pub fn two_digits_to_words(n: u32, words: &NumberWords, gender: Gender) -> String {
    if n < 10 {
        return unit_word(words, n, gender).to_string();
    }
    if n < 20 {
        return word_at(&words.teens, n.saturating_sub(10)).to_string();
    }
    if n < 30
        && let Some(twenties) = words.twenties
    {
        return word_at(&twenties, n.saturating_sub(20)).to_string();
    }
    let tens = n / 10;
    let units = n % 10;
    let mut out = word_at(&words.tens, tens).to_string();
    if units > 0 {
        out.push_str(words.unit_join);
        out.push_str(unit_word(words, units, gender));
    }
    out
}

/// Escreve cada dígito de `text` separadamente.
#[must_use]
pub fn digits_to_words(text: &str, words: &NumberWords, gender: Gender) -> String {
    let mut parts = Vec::new();
    for character in text.chars() {
        let digit = character.to_digit(10).unwrap_or(0);
        let word = if digit == 0 {
            words.zero
        } else {
            unit_word(words, digit, gender)
        };
        parts.push(word);
    }
    parts.join(" ")
}

/// Monta a parte textual de um grupo com sua escala.
#[must_use]
fn group_part(group: u32, index: usize, words: &NumberWords, gender: Gender) -> String {
    let scale = select_scale(group, index, words);
    let omit_one = group == 1 && scale.omit_one;
    let mut part = if omit_one {
        String::new()
    } else {
        triple_to_words(group, words, gender)
    };
    if scale.singular.is_empty() {
        return part;
    }
    if !part.is_empty() {
        part.push(' ');
    }
    part.push_str(scale.singular);
    part
}

/// Seleciona a forma de escala de um grupo.
#[must_use]
pub fn select_scale(group: u32, index: usize, words: &NumberWords) -> ScaleWord {
    let Some(base) = index.checked_sub(1).and_then(|i| words.scales.get(i)) else {
        return ScaleWord {
            singular: "",
            plural: "",
            omit_one: false,
        };
    };
    let word = if group == 1 {
        base.singular
    } else {
        base.plural
    };
    ScaleWord {
        singular: word,
        plural: word,
        omit_one: base.omit_one,
    }
}

/// Junta os grupos de escala com o separador adequado.
#[must_use]
pub fn join_entries(entries: &[(u32, String)], words: &NumberWords) -> String {
    let mut result = String::new();
    for (position, (group, part)) in entries.iter().enumerate() {
        if position > 0 {
            result.push_str(group_separator(*group, words));
        }
        result.push_str(part);
    }
    result
}

/// Separador antes de um grupo de escala.
#[must_use]
const fn group_separator(group: u32, words: &NumberWords) -> &'static str {
    if group < 100 || group.is_multiple_of(100) {
        words.group_join
    } else {
        " "
    }
}

/// Escreve a parte fracionária de um decimal canônico.
#[must_use]
fn fraction_to_words(fraction: &str, words: &NumberWords, gender: Gender) -> String {
    let trimmed = fraction.trim_end_matches('0');
    if trimmed.is_empty() {
        return String::new();
    }
    let body = if trimmed.starts_with('0') || trimmed.len() > 2 {
        digits_to_words(trimmed, words, gender)
    } else {
        trimmed.parse::<BigInt>().map_or_else(
            |_| digits_to_words(trimmed, words, gender),
            |value| integer_to_words(&value, words, gender),
        )
    };
    format!(" {} {body}", words.decimal_word)
}

/// Retorna a palavra na posição `index`, ou `""`.
#[must_use]
fn word_at(table: &[&'static str], index: u32) -> &'static str {
    table
        .get(usize::try_from(index).unwrap_or(usize::MAX))
        .copied()
        .unwrap_or("")
}

/// Retorna a unidade (respeitando o gênero), ou `""`.
#[must_use]
fn unit_word(words: &NumberWords, index: u32, gender: Gender) -> &'static str {
    let table = match gender {
        Gender::Feminine => words.feminine_units.unwrap_or(words.units),
        _ => words.units,
    };
    word_at(&table, index)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PT: NumberWords = NumberWords {
        zero: "zero",
        units: [
            "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
        ],
        feminine_units: None,
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
        scales: &[
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
        ],
        unit_join: " e ",
        hundred_join: " e ",
        group_join: " e ",
        negative: "menos",
        decimal_word: "vírgula",
        fraction_word: "sobre",
    };

    #[test]
    fn writes_portuguese_numbers() {
        let cases = [
            (0, "zero"),
            (1, "um"),
            (14, "quatorze"),
            (21, "vinte e um"),
            (100, "cem"),
            (101, "cento e um"),
            (115, "cento e quinze"),
            (1000, "mil"),
            (1100, "mil e cem"),
            (15109, "quinze mil cento e nove"),
            (1_000_000, "um milhão"),
            (2_000_000, "dois milhões"),
        ];
        for (value, expected) in cases {
            assert_eq!(
                integer_to_words(&BigInt::from(value), &PT, Gender::Masculine),
                expected,
                "valor {value}"
            );
        }
    }

    #[test]
    fn writes_decimals() {
        assert_eq!(
            decimal_text_to_words("14.75", &PT, Gender::Masculine),
            "quatorze vírgula setenta e cinco"
        );
        assert_eq!(
            decimal_text_to_words("0.05", &PT, Gender::Masculine),
            "zero vírgula zero cinco"
        );
        assert_eq!(
            literal_text_to_words("1/100", &PT, Gender::Masculine),
            "um sobre cem"
        );
    }

    #[test]
    fn uses_feminine_units() {
        let feminine = NumberWords {
            feminine_units: Some([
                "", "uma", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
            ]),
            ..PT
        };
        assert_eq!(
            integer_to_words(&BigInt::from(21), &feminine, Gender::Feminine),
            "vinte e uma"
        );
    }
}
