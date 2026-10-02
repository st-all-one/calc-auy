//! Custo do builder por número de operações (T06.7).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;

use calc_auy_builder::{Calculation, InstanceConfig};
use calc_auy_core::{CalcAuyError, CustodyVerifier, Limits, RoundingStrategy, Salt};
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

/// Constrói uma cadeia de `count` somas.
fn build(config: &InstanceConfig, count: usize) -> Calculation<'_, calc_auy_builder::Draft> {
    let mut calculation = Calculation::from(config, 0_i64).expect("literal");
    for _ in 0..count {
        calculation = calculation.add(1).expect("soma");
    }
    calculation
}

fn bench_builder(c: &mut Criterion) {
    let limits = Limits::new(1_000_000, 10_000, 1_000_000, 100, 16_384).expect("limites");
    let config = InstanceConfig::new(Salt::new("bench")).with_limits(limits);

    c.bench_function("build_add_100", |bencher| {
        bencher.iter(|| black_box(build(&config, 100)));
    });
    c.bench_function("build_add_1000", |bencher| {
        bencher.iter(|| black_box(build(&config, 1000)));
    });
    c.bench_function("commit_add_100", |bencher| {
        bencher.iter(|| {
            let draft = build(&config, 100);
            black_box(draft.commit(&AcceptAll).expect("commit"));
        });
    });
}

criterion_group!(benches, bench_builder);
criterion_main!(benches);
