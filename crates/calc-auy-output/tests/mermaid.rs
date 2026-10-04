//! Testes do diagrama Mermaid: localização, PII e transferência de contexto.

mod common;

use calc_auy_core::{AstBuilder, Limits, OperationType, Rational, RoundingStrategy};
use calc_auy_output::{Locale, Output, OutputOptions, Sensitivity};

#[test]
fn mermaid_is_localized_and_redacts_by_default() {
    let committed = common::commit_expression("100 * 1.5", 2);
    let output = Output::new(&committed, OutputOptions::new().with_locale(Locale::EnUs));
    let graph = output.to_mermaid_graph();
    assert!(graph.contains("Context: default"), "{graph}");
    assert!(graph.contains("Ingestion of Operands"), "{graph}");
    assert!(graph.contains("[REDACTED]"), "{graph}");
    assert!(graph.contains("Signature: (Sig:"), "{graph}");
    assert!(graph.contains("Final Closing and Signature"), "{graph}");
}

#[test]
fn mermaid_exposes_values_when_not_sensitive() {
    let committed = common::commit_expression("100 * 1.5", 2);
    let output = Output::new(
        &committed,
        OutputOptions::new()
            .with_locale(Locale::PtBr)
            .with_sensitivity(Sensitivity::Expose),
    );
    let graph = output.to_mermaid_graph();
    assert!(graph.contains("100"), "{graph}");
    assert!(graph.contains("Ingestão"), "{graph}");
    assert!(!graph.contains("[REDACTED]"), "{graph}");
}

#[test]
fn mermaid_renders_context_handover() {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let one = builder
        .literal(Rational::from_i64(1), "1")
        .expect("literal");
    let two = builder
        .literal(Rational::from_i64(2), "2")
        .expect("literal");
    let sum = builder
        .operation(OperationType::Add, &[one, two])
        .expect("soma");
    let control = builder
        .control(
            sum,
            "prev-ctx",
            "abcdef0123456789",
            RoundingStrategy::Nbr5891,
        )
        .expect("controle");
    let ast = builder.finish(control).expect("ast");
    let committed = common::commit_ast(ast, 2);
    let output = Output::new(
        &committed,
        OutputOptions::new()
            .with_locale(Locale::EnUs)
            .with_sensitivity(Sensitivity::Expose),
    );
    let graph = output.to_mermaid_graph();
    assert!(graph.contains("participant Ctx_prev_ctx"), "{graph}");
    assert!(graph.contains("Handover (Sig: abcdef01...)"), "{graph}");
    assert!(graph.contains("Event: reanimation_event"), "{graph}");
    assert!(graph.contains("Ctx_prev_ctx->>+Ctx_default"), "{graph}");
}
