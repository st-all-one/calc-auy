//! Baseline do lexer/parser por tamanho de entrada (T05.5).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;

use calc_auy_core::Limits;
use calc_auy_parser::{Lexer, parse};
use criterion::{Criterion, criterion_group, criterion_main};

/// Cadeia de somas `0+1+...+n`.
fn chain(terms: usize) -> String {
    let mut text = String::new();
    for value in 0..terms {
        if value > 0 {
            text.push('+');
        }
        text.push_str(&value.to_string());
    }
    text
}

fn bench_parser(c: &mut Criterion) {
    let limits = Limits::default();
    let chain_100 = chain(100);
    let chain_1000 = chain(1000);

    c.bench_function("lex_chain_100", |bencher| {
        bencher.iter(|| Lexer::new(black_box(&chain_100)).count());
    });
    c.bench_function("parse_chain_100", |bencher| {
        bencher.iter(|| parse(black_box(&chain_100), &limits));
    });
    c.bench_function("parse_chain_1000", |bencher| {
        bencher.iter(|| parse(black_box(&chain_1000), &limits));
    });
}

criterion_group!(benches, bench_parser);
criterion_main!(benches);
