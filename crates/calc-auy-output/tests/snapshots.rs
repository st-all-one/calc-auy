//! Snapshots golden dos formatos de saída (T07.7).
//!
//! `insta` não está disponível offline no toolchain pinado; o harness abaixo
//! cumpre o mesmo papel: compara com arquivos em `tests/snapshots/` e os
//! regenera quando `UPDATE_SNAPSHOTS=1`.

mod common;

use std::path::PathBuf;

use calc_auy_core::{Limits, Rational};
use calc_auy_i18n::PtBrRealizer;
use calc_auy_output::{DEFAULT_KEYS, Locale, Output, OutputOptions};

use common::{commit_expression, commit_value};

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

fn sample() -> calc_auy_core::Committed {
    commit_expression("10000 * (1 + 14.75%) ^ 3", 2)
}

#[test]
fn monetary_snapshots() {
    let committed = sample();
    let brl = Output::new(&committed, OutputOptions::new().with_locale(Locale::PtBr));
    assert_snapshot("monetary_pt_br", &brl.to_monetary());
    let usd = Output::new(&committed, OutputOptions::new().with_locale(Locale::EnUs));
    assert_snapshot("monetary_en_us", &usd.to_monetary());
}

#[test]
fn representation_snapshots() {
    let committed = sample();
    let output = Output::new(&committed, OutputOptions::new().with_locale(Locale::PtBr));
    assert_snapshot("latex", &output.to_latex());
    assert_snapshot("unicode", &output.to_unicode());
    assert_snapshot("mermaid", &output.to_mermaid_graph());
    assert_snapshot("decimal", &output.to_string_decimal());
    assert_snapshot("verbal_pt_br", &output.to_verbal_a11y(&PtBrRealizer::new()));
}

#[test]
fn audit_snapshots() {
    let committed = sample();
    let output = Output::new(&committed, OutputOptions::new());
    assert_snapshot("audit_trace", &output.to_audit_trace().expect("audit"));
    assert_snapshot("payload_json", &output.to_json().expect("json"));
}

#[test]
fn json_formats_snapshot() {
    let committed = sample();
    let output = Output::new(&committed, OutputOptions::new().with_locale(Locale::PtBr));
    let json = output
        .to_json_formats(DEFAULT_KEYS, &PtBrRealizer::new())
        .expect("json");
    assert_snapshot("json_formats", &json);
}

#[test]
fn slice_snapshots() {
    let committed = commit_value(Rational::from_i64(100), 2);
    let output = Output::new(&committed, OutputOptions::new().with_decimals(2));
    let equal = output.to_slice(3).expect("rateio");
    assert_snapshot("slice_3", &equal.join("\n"));

    let limits = Limits::default();
    let ratios = [
        Rational::new_checked(1, 1, &limits).expect("r"),
        Rational::new_checked(1, 1, &limits).expect("r"),
        Rational::new_checked(2, 1, &limits).expect("r"),
    ];
    let weighted = output.to_slice_by_ratio(&ratios).expect("rateio");
    assert_snapshot("slice_ratio", &weighted.join("\n"));
}
