//! Baselines de performance do núcleo numérico (T01.9).
//!
//! Mede operações nos caminhos `Small` (sem heap) e `Large` (bignum).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;

use calc_auy_core::Rational;
use criterion::{Criterion, criterion_group, criterion_main};

/// Constrói um racional que promove para o caminho `Large`.
fn large_value() -> Rational {
    let mut value = Rational::from_u64(u64::MAX);
    for _ in 0..8 {
        value = value.mul(&value);
    }
    value
}

fn bench_small(c: &mut Criterion) {
    let left = Rational::from_u64(123_456);
    let right = Rational::from_u64(789_012);

    c.bench_function("small_add", |bencher| {
        bencher.iter(|| black_box(&left).add(black_box(&right)));
    });
    c.bench_function("small_mul", |bencher| {
        bencher.iter(|| black_box(&left).mul(black_box(&right)));
    });
    c.bench_function("small_div", |bencher| {
        bencher.iter(|| black_box(&left).checked_div(black_box(&right)));
    });
}

fn bench_large(c: &mut Criterion) {
    let left = large_value();
    let right = large_value();

    c.bench_function("large_add", |bencher| {
        bencher.iter(|| black_box(&left).add(black_box(&right)));
    });
    c.bench_function("large_mul", |bencher| {
        bencher.iter(|| black_box(&left).mul(black_box(&right)));
    });
}

criterion_group!(benches, bench_small, bench_large);
criterion_main!(benches);
