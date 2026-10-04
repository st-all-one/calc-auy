//! Testes das raízes (potências fracionárias) em LaTeX, Unicode e verbal.

mod common;

use calc_auy_i18n::PtBrRealizer;
use calc_auy_output::{Output, OutputOptions};

#[test]
fn square_root_in_all_formats() {
    let committed = common::commit_expression("9 ^ (1/2)", 2);
    let output = Output::new(&committed, OutputOptions::new());
    assert!(
        output.to_latex().contains(r"\sqrt{9}"),
        "{}",
        output.to_latex()
    );
    assert!(
        output.to_unicode().contains("√9"),
        "{}",
        output.to_unicode()
    );
    assert!(
        output
            .to_verbal_a11y(&PtBrRealizer::new())
            .contains("raiz quadrada de"),
        "{}",
        output.to_verbal_a11y(&PtBrRealizer::new())
    );
}

#[test]
fn cubic_root_in_all_formats() {
    let committed = common::commit_expression("27 ^ (1/3)", 2);
    let output = Output::new(&committed, OutputOptions::new());
    assert!(
        output.to_latex().contains(r"\sqrt[3]{27}"),
        "{}",
        output.to_latex()
    );
    assert!(
        output.to_unicode().contains("∛27"),
        "{}",
        output.to_unicode()
    );
    assert!(
        output
            .to_verbal_a11y(&PtBrRealizer::new())
            .contains("raiz cúbica de"),
        "{}",
        output.to_verbal_a11y(&PtBrRealizer::new())
    );
}

#[test]
fn nth_root_with_power_in_all_formats() {
    let committed = common::commit_expression("16 ^ (3/2)", 2);
    let output = Output::new(&committed, OutputOptions::new());
    assert!(
        output.to_latex().contains(r"\sqrt{{16}^{3}}"),
        "{}",
        output.to_latex()
    );
    assert!(
        output.to_unicode().contains("√(16³)"),
        "{}",
        output.to_unicode()
    );
    assert!(
        output
            .to_verbal_a11y(&PtBrRealizer::new())
            .contains("raiz quadrada de dezesseis elevado a 3"),
        "{}",
        output.to_verbal_a11y(&PtBrRealizer::new())
    );
}

#[test]
fn fifth_root_uses_generic_index() {
    let committed = common::commit_expression("32 ^ (1/5)", 2);
    let output = Output::new(&committed, OutputOptions::new());
    assert!(
        output.to_latex().contains(r"\sqrt[5]{32}"),
        "{}",
        output.to_latex()
    );
    assert!(
        output.to_unicode().contains("⁵√32"),
        "{}",
        output.to_unicode()
    );
    assert!(
        output
            .to_verbal_a11y(&PtBrRealizer::new())
            .contains("raiz 5-ésima de"),
        "{}",
        output.to_verbal_a11y(&PtBrRealizer::new())
    );
}

#[test]
fn raw_parts_expose_exact_fraction() {
    let committed = common::commit_expression("1/2", 2);
    let output = Output::new(&committed, OutputOptions::new());
    let (numerator, denominator) = output.to_raw_parts();
    assert_eq!(numerator, "1");
    assert_eq!(denominator, "2");
}
