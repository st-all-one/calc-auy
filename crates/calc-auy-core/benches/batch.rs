//! Benchmarks do motor de lotes (T08.5, T08.8).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;
use std::time::Duration;

use calc_auy_core::batch::unchecked::{dot_products_safe, dot_products_unchecked};
use calc_auy_core::{
    AstBuilder, CalcAuyError, CustodyVerifier, DEFAULT_TILE, FlatAst, Limits, OperationType,
    Rational, RoundingStrategy, SmallBatch, VerifiedAst, eval_batch,
};
use criterion::{Criterion, criterion_group, criterion_main};

/// Verificador permissivo.
struct AcceptAll;

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

/// Constrói um lote canônico de `size` frações pequenas.
fn sample_batch(size: usize, limits: &Limits) -> SmallBatch {
    let values: Vec<Rational> = (0..size)
        .map(|index| {
            let numerator = i64::try_from(index).unwrap_or(i64::MAX).saturating_add(1);
            let denominator = i64::try_from(index.checked_rem(97).unwrap_or(0))
                .unwrap_or(0)
                .saturating_add(1);
            Rational::new_checked(numerator, denominator, limits).unwrap_or(Rational::ZERO)
        })
        .collect();
    SmallBatch::from_rationals(&values).unwrap_or_default()
}

/// Constrói uma cadeia de somas de `terms` literais.
fn build_chain(terms: usize, limits: &Limits) -> Result<FlatAst, CalcAuyError> {
    let mut builder = AstBuilder::with_capacity(limits, terms.saturating_add(1));
    let mut operands = Vec::with_capacity(terms);
    for term in 0..terms {
        let value = Rational::from_i64(i64::try_from(term).unwrap_or(0).saturating_add(1));
        operands.push(builder.literal(value.clone(), value.to_string())?);
    }
    let root = builder.flattened_operation(OperationType::Add, &operands)?;
    builder.finish(root)
}

/// Constrói um lote de ASTs verificadas.
fn verified_batch(count: usize, limits: &Limits) -> Vec<VerifiedAst> {
    let mut batch = Vec::with_capacity(count);
    for index in 0..count {
        let terms = index.checked_rem(32).unwrap_or(0).saturating_add(4);
        if let Ok(ast) = build_chain(terms, limits) {
            if let Ok(verified) = ast.verify_custody(&AcceptAll, limits) {
                batch.push(verified);
            }
        }
    }
    batch
}

fn bench_batch(c: &mut Criterion) {
    let limits = Limits::default();
    let batch = sample_batch(1 << 12, &limits);
    let small = sample_batch(1 << 9, &limits);

    c.bench_function("sum_batch_plain_4k", |bencher| {
        bencher.iter(|| black_box(batch.sum(&limits)));
    });
    c.bench_function("sum_batch_tiled_4k", |bencher| {
        bencher.iter(|| black_box(batch.sum_tiled(DEFAULT_TILE, &limits)));
    });
    c.bench_function("product_batch_tiled_512", |bencher| {
        bencher.iter(|| black_box(small.product_tiled(DEFAULT_TILE, &limits)));
    });

    for tile in [64_usize, 256, 1024, 4096] {
        c.bench_function(&format!("sum_batch_tile_{tile}"), |bencher| {
            bencher.iter(|| black_box(batch.sum_tiled(tile, &limits)));
        });
    }

    let nums: Vec<u64> = (1..=4096_u64).collect();
    let dens: Vec<u64> = (1..=4096_u64)
        .map(|value| value.saturating_add(1))
        .collect();
    c.bench_function("dot_products_safe", |bencher| {
        bencher.iter(|| black_box(dot_products_safe(&nums, &dens)));
    });
    c.bench_function("dot_products_unchecked", |bencher| {
        bencher.iter(|| black_box(dot_products_unchecked(&nums, &dens)));
    });

    let asts = verified_batch(64, &limits);
    c.bench_function("eval_batch_64", |bencher| {
        bencher.iter(|| black_box(eval_batch(&asts, &limits)));
    });
}

criterion_group! {
    name = benches;
    config = Criterion::default()
        .warm_up_time(Duration::from_millis(500))
        .measurement_time(Duration::from_secs(2))
        .sample_size(20);
    targets = bench_batch
}
criterion_main!(benches);
