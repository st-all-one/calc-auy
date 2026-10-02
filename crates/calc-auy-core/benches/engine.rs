//! Baseline de avaliação: profundidade/nós e overhead da memoização (T04.7).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;

use calc_auy_core::{
    AstBuilder, CustodyVerifier, EvalCache, FlatAst, Limits, OperationType, Rational,
    RoundingStrategy, VerifiedAst, eval, eval_memoized,
};
use criterion::{Criterion, criterion_group, criterion_main};

/// Limites amplos para os benchmarks.
fn large_limits() -> Limits {
    Limits::new(1_000_000, 500, 1_000_000, 100, 16_384).expect("limites válidos")
}

/// Verificador permissivo.
struct NoopVerifier;

impl CustodyVerifier for NoopVerifier {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), calc_auy_core::CalcAuyError> {
        Ok(())
    }
}

/// Verifica a AST para uso no motor.
fn verify(ast: &FlatAst, limits: &Limits) -> VerifiedAst {
    ast.clone()
        .verify_custody(&NoopVerifier, limits)
        .expect("custódia")
}

/// Cadeia achatada de somas com `terms` folhas.
fn build_chain(terms: usize) -> FlatAst {
    let limits = large_limits();
    let mut builder = AstBuilder::new(&limits);
    let mut operands = Vec::with_capacity(terms);
    for value in 0..terms {
        let literal = i64::try_from(value).unwrap_or(i64::MAX);
        operands.push(
            builder
                .literal(Rational::from_i64(literal), value.to_string())
                .expect("literal"),
        );
    }
    let root = builder
        .flattened_operation(OperationType::Add, &operands)
        .expect("flattening");
    builder.finish(root).expect("árvore")
}

/// Subárvore com ~`size` nós, referenciada `repeat` vezes por uma soma.
fn build_shared(size: usize, repeat: usize) -> FlatAst {
    let limits = large_limits();
    let mut builder = AstBuilder::new(&limits);
    let mut accumulator = builder.literal(Rational::ONE, "1").expect("literal");
    for value in 0..size {
        let literal = i64::try_from(value).unwrap_or(i64::MAX);
        let leaf = builder
            .literal(Rational::from_i64(literal), value.to_string())
            .expect("literal");
        accumulator = builder
            .operation(OperationType::Add, &[accumulator, leaf])
            .expect("soma");
    }
    let operands = vec![accumulator; repeat];
    let root = builder
        .operation(OperationType::Add, &operands)
        .expect("soma");
    builder.finish(root).expect("árvore")
}

fn bench_engine(c: &mut Criterion) {
    let limits = large_limits();

    let chain = build_chain(10_000);
    let chain = verify(&chain, &limits);
    c.bench_function("eval_chain_10k", |bencher| {
        bencher.iter(|| eval(black_box(&chain), &limits));
    });

    let shared = build_shared(50, 100);
    let shared = verify(&shared, &limits);
    c.bench_function("eval_plain_shared", |bencher| {
        bencher.iter(|| eval(black_box(&shared), &limits));
    });
    c.bench_function("eval_memoized_shared", |bencher| {
        bencher.iter(|| {
            let mut cache = EvalCache::new(256);
            eval_memoized(black_box(&shared), &limits, &mut cache)
        });
    });
}

criterion_group!(benches, bench_engine);
criterion_main!(benches);
