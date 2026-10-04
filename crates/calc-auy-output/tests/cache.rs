//! Cache de representações por `Output` (paridade com o `#outputCache` do TS).

mod common;

use calc_auy_output::{Locale, Output, OutputOptions};

use common::commit_expression;

/// Renderizações repetidas sobre a mesma `Output` são estáveis (e memoizadas).
#[test]
fn repeated_renders_are_stable() {
    let committed = commit_expression("100 + 50", 2);
    let output = Output::new(&committed, OutputOptions::new());

    for _ in 0..3 {
        assert_eq!(output.to_latex(), output.to_latex());
        assert_eq!(output.to_unicode(), output.to_unicode());
        assert_eq!(output.to_mermaid_graph(), output.to_mermaid_graph());
        assert_eq!(output.to_monetary(), output.to_monetary());
        assert_eq!(
            output.to_audit_trace().expect("trace"),
            output.to_audit_trace().expect("trace")
        );
    }
}

/// O cache é por instância/opções: locais diferentes não compartilham valores.
#[test]
fn cache_is_scoped_to_options() {
    let committed = commit_expression("1234.56", 2);
    let pt = Output::new(&committed, OutputOptions::new().with_locale(Locale::PtBr));
    let us = Output::new(&committed, OutputOptions::new().with_locale(Locale::EnUs));

    let pt_value = pt.to_monetary();
    let us_value = us.to_monetary();
    assert_ne!(pt_value, us_value);
    // Repetir cada instância devolve o próprio valor (sem vazamento).
    assert_eq!(pt.to_monetary(), pt_value);
    assert_eq!(us.to_monetary(), us_value);
}

/// O cache não altera a saída dos demais formatos derivados.
#[test]
fn cache_preserves_derived_formats() {
    let committed = commit_expression("1000 / 3", 2);
    let output = Output::new(&committed, OutputOptions::new());

    let latex = output.to_latex();
    let unicode = output.to_unicode();
    // Aquecer o cache e conferir que os derivados seguem iguais.
    assert_eq!(output.to_latex(), latex);
    assert_eq!(output.to_unicode(), unicode);
    assert_eq!(output.to_string_decimal(), "333.33");
}
