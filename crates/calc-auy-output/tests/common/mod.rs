//! Helpers compartilhados pelos testes de integração da saída.

#![allow(
    dead_code,
    unreachable_pub,
    reason = "helpers usados por diferentes testes"
)]

use calc_auy_core::{
    AstBuilder, CalcAuyError, Committed, CustodyVerifier, FlatAst, Limits, Rational,
    RoundingStrategy, Salt, commit,
};

/// Verificador permissivo (sem nós de controle).
pub struct AcceptAll;

impl CustodyVerifier for AcceptAll {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        Ok(())
    }
}

/// Limites padrão.
pub fn limits() -> Limits {
    Limits::default()
}

/// Sela uma AST já verificável.
pub fn commit_ast(ast: FlatAst, decimals: u32) -> Committed {
    let limits = limits();
    let verified = ast
        .verify_custody(&AcceptAll, &limits)
        .expect("custódia válida");
    commit(
        verified,
        RoundingStrategy::Nbr5891,
        decimals,
        &Salt::new("snapshot-sal"),
        &limits,
    )
    .expect("commit")
}

/// Sela uma expressão textual.
pub fn commit_expression(expression: &str, decimals: u32) -> Committed {
    let limits = limits();
    let ast = calc_auy_parser::parse(expression, &limits).expect("expressão válida");
    commit_ast(ast, decimals)
}

/// Sela um valor racional puro.
pub fn commit_value(value: Rational, decimals: u32) -> Committed {
    let limits = limits();
    let mut builder = AstBuilder::new(&limits);
    let root = builder
        .literal(value.clone(), value.to_string())
        .expect("literal");
    let ast = builder.finish(root).expect("árvore");
    commit_ast(ast, decimals)
}
