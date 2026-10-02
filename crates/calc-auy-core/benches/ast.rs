//! Baseline de travessia da arena vs. árvore recursiva de referência (T02.8).

#![allow(missing_docs, reason = "harness gerado pelo criterion")]

use std::hint::black_box;

use calc_auy_core::{AstBuilder, FlatAst, Limits, NodeData, NodeId, OperationType, Rational};
use criterion::{Criterion, criterion_group, criterion_main};

/// Limites amplos para os benchmarks.
fn large_limits() -> Limits {
    Limits::new(1_000_000, 500, 1_000_000, 100, 16_384).expect("limites válidos")
}

/// Constrói uma arena com `terms` folhas somadas via flattening.
fn build_arena(terms: usize) -> FlatAst {
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

/// Árvore recursiva de referência (com ponteiros).
enum RefNode {
    /// Folha racional.
    Leaf(Rational),
    /// Operação com filhos.
    Operation(Vec<Self>),
}

/// Projeta a arena em uma árvore recursiva de referência.
fn to_ref(ast: &FlatAst, id: NodeId) -> RefNode {
    match ast.node(id).expect("nó válido") {
        NodeData::Literal { value, .. } => RefNode::Leaf(value.clone()),
        NodeData::Operation { operands, .. } => {
            RefNode::Operation(operands.iter().map(|child| to_ref(ast, *child)).collect())
        }
        NodeData::Group { child } | NodeData::Control { child, .. } => to_ref(ast, *child),
    }
}

/// Conta nós e operandos percorrendo a arena (travessia leve, mede localidade).
fn scan_arena(ast: &FlatAst) -> u64 {
    let mut count = 0_u64;
    for (_, node) in ast.iter_nodes() {
        let delta = match node {
            NodeData::Literal { .. } => 1,
            NodeData::Operation { operands, .. } => u64::try_from(operands.len()).unwrap_or(0),
            NodeData::Group { .. } | NodeData::Control { .. } => 1,
        };
        count = count.wrapping_add(delta);
    }
    count
}

/// Conta nós e filhos percorrendo a árvore de referência.
fn scan_ref(node: &RefNode) -> u64 {
    match node {
        RefNode::Leaf(_) => 1,
        RefNode::Operation(children) => {
            children.iter().map(scan_ref).fold(1_u64, u64::wrapping_add)
        }
    }
}

fn bench_ast(c: &mut Criterion) {
    let ast = build_arena(10_000);
    let reference = to_ref(&ast, ast.root());

    c.bench_function("arena_build_10k", |bencher| {
        bencher.iter(|| build_arena(black_box(10_000)));
    });
    c.bench_function("arena_scan_10k", |bencher| {
        bencher.iter(|| scan_arena(black_box(&ast)));
    });
    c.bench_function("recursive_scan_10k", |bencher| {
        bencher.iter(|| scan_ref(black_box(&reference)));
    });
}

criterion_group!(benches, bench_ast);
criterion_main!(benches);
