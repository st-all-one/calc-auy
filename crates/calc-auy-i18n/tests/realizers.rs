//! Testes de realização: snapshots por idioma e propriedades de acessibilidade.

use std::path::PathBuf;

use calc_auy_core::OperationType;
use calc_auy_i18n::{Language, grammar, realizer_for_code};
use calc_auy_nlg::{Gender, Srl, SrlNode};

const LANGUAGES: [Language; 9] = [
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

/// SRL representativa: `10000 * (1 + 14.75 * 1/100) ^ 3`.
fn sample() -> Srl {
    Srl {
        expression: SrlNode::Operation {
            op: OperationType::Mul,
            operands: vec![
                SrlNode::Literal("10000".to_string()),
                SrlNode::Group(Box::new(SrlNode::Operation {
                    op: OperationType::Add,
                    operands: vec![
                        SrlNode::Literal("1".to_string()),
                        SrlNode::Operation {
                            op: OperationType::Mul,
                            operands: vec![
                                SrlNode::Literal("14.75".to_string()),
                                SrlNode::Literal("1/100".to_string()),
                            ],
                        },
                    ],
                })),
            ],
        },
        result: "15109.78".to_string(),
        round_strategy: "nbr5891".to_string(),
        decimals: 2,
    }
}

/// SRL com potenciação e divisão inteira.
fn mixed() -> Srl {
    Srl {
        expression: SrlNode::Operation {
            op: OperationType::Pow,
            operands: vec![
                SrlNode::Literal("2".to_string()),
                SrlNode::Literal("10".to_string()),
            ],
        },
        result: "1024".to_string(),
        round_strategy: "half_even".to_string(),
        decimals: 0,
    }
}

/// Compara (ou atualiza) um snapshot textual.
fn assert_snapshot(name: &str, actual: &str) {
    let directory = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/snapshots");
    let path = directory.join(format!("{name}.snap"));
    if std::env::var("UPDATE_SNAPSHOTS").is_ok() {
        std::fs::create_dir_all(&directory).expect("cria diretório");
        std::fs::write(&path, actual).expect("escreve snapshot");
        return;
    }
    let expected = std::fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("snapshot ausente: {name}; rode UPDATE_SNAPSHOTS=1"));
    assert_eq!(expected, actual, "snapshot divergente: {name}");
}

#[test]
fn realizers_snapshot() {
    let srl = sample();
    for language in LANGUAGES {
        let text = language.realizer().realize(&srl);
        assert_snapshot(language.code(), &text);
    }
}

#[test]
fn pow_snapshot() {
    let srl = mixed();
    for language in LANGUAGES {
        let text = language.realizer().realize(&srl);
        assert_snapshot(&format!("{}-pow", language.code()), &text);
    }
}

#[test]
fn numbers_per_language() {
    let cases = [
        (Language::PtBr, "quinze mil cento e nove"),
        (Language::EnUs, "fifteen thousand one hundred nine"),
        (Language::EnEu, "fifteen thousand one hundred and nine"),
        (Language::EsEs, "quince mil ciento nueve"),
        (Language::FrFr, "quinze mille cent neuf"),
        (Language::DeDe, "fünfzehntausendeinhundertneun"),
        (Language::RuRu, "пятнадцать тысяч сто девять"),
        (Language::ZhCn, "一万五千一百零九"),
        (Language::JaJp, "一万五千一百〇九"),
    ];
    for (language, expected) in cases {
        let number = grammar(language).number;
        assert_eq!(number("15109", Gender::Masculine), expected, "{language:?}");
    }
}

#[test]
fn accessibility_no_semantic_loss() {
    let srl = sample();
    let operations = srl.expression.operations();
    assert_eq!(
        operations,
        vec![OperationType::Mul, OperationType::Add, OperationType::Mul]
    );
    for language in LANGUAGES {
        let text = language.realizer().realize(&srl);
        let connectors = grammar(language).connectors;
        for operation in &operations {
            let word = connectors.for_op(*operation);
            assert!(
                text.contains(word),
                "{language:?} perdeu a operação {operation:?} ({word:?})"
            );
        }
        assert!(!text.trim().is_empty(), "{language:?} produziu texto vazio");
    }
}

#[test]
fn realization_is_deterministic() {
    let srl = sample();
    for language in LANGUAGES {
        let realizer = language.realizer();
        let first = realizer.realize(&srl);
        let second = realizer.realize(&srl);
        assert_eq!(first, second, "{language:?}");
    }
}

#[test]
fn code_lookup_builds_realizer() {
    for language in LANGUAGES {
        let realizer = realizer_for_code(language.code());
        assert_eq!(realizer.language(), language.code());
    }
}

#[test]
fn every_literal_is_rendered() {
    let srl = sample();
    let literals = srl.expression.literals();
    assert_eq!(literals, vec!["10000", "1", "14.75", "1/100"]);
    for language in LANGUAGES {
        let text = language.realizer().realize(&srl);
        let number = grammar(language).number;
        for literal in &literals {
            let expected = number(literal, Gender::Masculine);
            assert!(
                text.contains(&expected),
                "{language:?} perdeu o literal {literal:?} ({expected:?})"
            );
        }
    }
}
