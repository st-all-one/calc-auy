//! Benchmark comparativo Rust × TypeScript (referência: `_REF/tests/`).
//!
//! Espelha a carga de `bench/ts/compare.ts` usando a API pública do
//! `calc-auy-api`. Rode com:
//!
//! ```text
//! cargo run --release -p calc-auy-api --example bench_compare
//! ```
//!
//! Grava `bench/results/rust.json`.

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::print_stdout,
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::indexing_slicing,
    clippy::arithmetic_side_effects,
    clippy::missing_docs,
    reason = "harness de benchmark (exemplo), não faz parte da biblioteca"
)]

use std::collections::BTreeMap;
use std::hint::black_box;
use std::time::Instant;

use calc_auy_api::{
    AstBuilder, CalcAuy, CalcAuyError, Calculation, Committed, CustodyVerifier, Draft,
    InstanceConfig, Limits, Locale, MetaValue, NodeId, OperationType, OutputContext, OutputKey,
    OutputOptions, OutputProcessor, Rational, RoundingStrategy, Salt, Sensitivity,
    realizer_for_code,
};
use calc_auy_processors::Format;

/// Amostra de tempo de um workload.
#[derive(Debug, Clone, Copy)]
struct Sample {
    /// Número de execuções.
    iters: u32,
    /// Tempo total em milissegundos.
    total_ms: f64,
}

/// Executa `f` uma vez (aquecimento) e depois `iters` vezes com um único timer.
fn bench<F, R>(results: &mut BTreeMap<String, Sample>, name: &str, iters: u32, mut f: F)
where
    F: FnMut() -> R,
{
    drop(black_box(f()));
    let start = Instant::now();
    for _ in 0..iters {
        drop(black_box(f()));
    }
    let total_ms = start.elapsed().as_secs_f64() * 1_000.0;
    let per_op = total_ms / f64::from(iters) * 1_000.0;
    println!("{name:<34} {total_ms:>10.2} ms  ({per_op:.2} µs/op, n={iters})");
    results.insert(name.to_string(), Sample { iters, total_ms });
}

/// Verificador permissivo (benchmark não exercita custódia cruzada).
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

const ACCEPT: AcceptAll = AcceptAll;

/// Limites generosos (equivalentes à permissividade do rascunho TS).
fn limits() -> Limits {
    Limits::new(1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000_000).expect("limites válidos")
}

/// Cria uma instância de benchmark.
fn app(label: &str, strategy: RoundingStrategy) -> CalcAuy {
    CalcAuy::new(
        InstanceConfig::new(Salt::new("bench-salt-2026"))
            .with_limits(limits())
            .with_rounding(strategy, 2)
            .with_context_label(label),
    )
}

/// Encadeia `terms` somas de `1` sobre um literal inicial.
fn chain(app: &CalcAuy, terms: u64) -> Result<Calculation<'_, Draft>, CalcAuyError> {
    let mut calc = app.from(1_i64)?;
    for _ in 0..terms {
        calc = calc.add(1_i64)?;
    }
    Ok(calc)
}

/// Encadeia `terms` somas de `value` sobre `1` e sela.
fn commit_chain_of<'a>(
    app: &'a CalcAuy,
    terms: u64,
    value: &str,
) -> Result<Calculation<'a, Committed>, CalcAuyError> {
    let mut calc = app.from(1_i64)?;
    for _ in 0..terms {
        calc = calc.add(value)?;
    }
    calc.commit(&ACCEPT)
}

/// Encadeia `terms` somas de `1` e sela.
fn commit_chain(app: &CalcAuy, terms: u64) -> Result<Calculation<'_, Committed>, CalcAuyError> {
    commit_chain_of(app, terms, "1")
}

/// `2^exp` como racional.
fn pow2(exp: i64, limits: &Limits) -> Result<Rational, CalcAuyError> {
    Rational::from_i64(2).pow(&Rational::from_i64(exp), limits)
}

/// Constrói `base^exponent` sobre um nó existente.
fn pow_exp_node(
    builder: &mut AstBuilder<'_>,
    base: NodeId,
    exponent: i64,
) -> Result<NodeId, CalcAuyError> {
    let exp = builder.literal(Rational::from_i64(exponent), exponent.to_string())?;
    builder.operation(OperationType::Pow, &[base, exp])
}

/// Constrói `base^exponent` a partir de uma base inteira.
fn pow_node(
    builder: &mut AstBuilder<'_>,
    base: i64,
    exponent: i64,
) -> Result<NodeId, CalcAuyError> {
    let base_id = builder.literal(Rational::from_i64(base), base.to_string())?;
    pow_exp_node(builder, base_id, exponent)
}

/// Constrói `base^(n/d)`.
fn pow_frac_node(
    builder: &mut AstBuilder<'_>,
    base: NodeId,
    numerator: i64,
    denominator: i64,
    limits: &Limits,
) -> Result<NodeId, CalcAuyError> {
    let exponent = builder.literal(
        Rational::new_checked(numerator, denominator, limits)?,
        format!("{numerator}/{denominator}"),
    )?;
    builder.operation(OperationType::Pow, &[base, exponent])
}

/// Sela uma AST construída manualmente.
fn commit_ast<'e>(
    engine: &'e CalcAuy,
    builder: AstBuilder<'e>,
    root: NodeId,
) -> Result<Calculation<'e, Committed>, CalcAuyError> {
    let ast = builder.finish(root)?;
    Calculation::from_flat_ast(engine.config(), ast).commit(&ACCEPT)
}

/// Constrói a "hidra" (árvore larga de `depth` níveis com `width` operandos).
fn build_hydra(
    builder: &mut AstBuilder<'_>,
    limits: &Limits,
    depth: u32,
    width: usize,
) -> Result<NodeId, CalcAuyError> {
    if depth == 0 {
        return builder.literal(Rational::new_checked(10_001, 10_000, limits)?, "1.0001");
    }
    let mut operands = Vec::with_capacity(width);
    for _ in 0..width {
        operands.push(build_hydra(builder, limits, depth - 1, width)?);
    }
    builder.operation(OperationType::Add, &operands)
}

/// Processador que devolve `Result: n/d`.
struct Stringify;

impl OutputProcessor for Stringify {
    type Output = String;
    type Options = ();

    fn process(&self, context: &OutputContext<'_, '_, ()>) -> String {
        let (numerator, denominator) = context.output.to_raw_parts();
        format!("Result: {numerator}/{denominator}")
    }
}

/// `true` se o `Result` representa um erro (para cargas de *overflow*).
fn is_err<T>(outcome: &Result<T, CalcAuyError>) -> bool {
    outcome.is_err()
}

fn main() -> Result<(), CalcAuyError> {
    let limits = limits();
    let mut results: BTreeMap<String, Sample> = BTreeMap::new();

    let engine = app("bench", RoundingStrategy::Nbr5891);

    // ─────────────────────── Core (core/rational, rounding, cache) ───────────────────────

    bench(&mut results, "core/rational_from", 200_000, || {
        parse_rational("1.23456789", &limits)
    });
    bench(&mut results, "core/rational_add", 200_000, || {
        let left = parse_rational("1/3", &limits)?;
        let right = parse_rational("1/7", &limits)?;
        Ok::<_, CalcAuyError>(left.add(&right))
    });
    bench(&mut results, "core/rational_mul", 100_000, || {
        let left = parse_rational("1.05", &limits)?;
        let right = parse_rational("0.15", &limits)?;
        Ok::<_, CalcAuyError>(left.mul(&right))
    });
    bench(&mut results, "core/rational_div", 100_000, || {
        let left = parse_rational("1/3", &limits)?;
        let right = parse_rational("7/11", &limits)?;
        left.checked_div(&right)
    });
    bench(&mut results, "core/rational_pow_small", 20_000, || {
        Rational::from_i64(2).pow(&Rational::from_i64(20), &limits)
    });
    bench(&mut results, "core/round_nbr5891", 100_000, || {
        let value = parse_rational("85.483", &limits)?;
        Ok::<_, CalcAuyError>(RoundingStrategy::Nbr5891.apply(&value, 2))
    });
    bench(&mut results, "core/round_half_up", 100_000, || {
        let value = parse_rational("1.25", &limits)?;
        Ok::<_, CalcAuyError>(RoundingStrategy::HalfUp.apply(&value, 1))
    });
    let canonical_value = {
        let mut object = BTreeMap::new();
        object.insert("a".to_string(), MetaValue::from(1_i64));
        object.insert(
            "b".to_string(),
            MetaValue::Array(vec![
                MetaValue::from(1_i64),
                MetaValue::from(2_i64),
                MetaValue::Object(BTreeMap::from([("c".to_string(), MetaValue::from("x"))])),
            ]),
        );
        object.insert("d".to_string(), MetaValue::from(true));
        MetaValue::Object(object)
    };
    bench(&mut results, "core/canonical_json", 100_000, || {
        let mut out = Vec::with_capacity(64);
        calc_auy_api::canonical::Canonical::write_canonical(&canonical_value, &mut out);
        out
    });

    // ───────────────────────── Builder: lexer/parser ─────────────────────────

    let chain100 = (0..100)
        .map(|i| i.to_string())
        .collect::<Vec<_>>()
        .join("+");
    let chain1000 = (0..1000)
        .map(|i| i.to_string())
        .collect::<Vec<_>>()
        .join("+");

    bench(&mut results, "builder/lex_chain_100", 20_000, || {
        calc_auy_parser::Lexer::new(&chain100).count()
    });
    bench(&mut results, "builder/parse_chain_100", 20_000, || {
        calc_auy_parser::parse(&chain100, &limits)
    });
    bench(&mut results, "builder/parse_chain_1000", 2_000, || {
        calc_auy_parser::parse(&chain1000, &limits)
    });
    bench(
        &mut results,
        "builder/parse_expression_pemdas",
        20_000,
        || engine.parse("10 + 5 * 2 ^ 3 - 4 / 2"),
    );

    // ───────────────────────── Builder: lógica/commit ─────────────────────────

    bench(&mut results, "builder/build_chain_10", 20_000, || {
        chain(&engine, 10)
    });
    bench(&mut results, "builder/commit_chain_10", 20_000, || {
        commit_chain(&engine, 10)
    });
    bench(&mut results, "builder/commit_chain_100", 2_000, || {
        commit_chain(&engine, 100)
    });
    bench(&mut results, "builder/basic_ops_chain", 20_000, || {
        engine
            .from(10_i64)?
            .add(5_i64)?
            .sub(2_i64)?
            .mul(2_i64)?
            .div(2_i64)?
            .pow(2_i64)?
            .mod_(10_i64)?
            .div_int(2_i64)?
            .commit(&ACCEPT)
    });
    bench(&mut results, "builder/group_precedence", 20_000, || {
        engine
            .from(10_i64)?
            .add(5_i64)?
            .group()?
            .mul(2_i64)?
            .commit(&ACCEPT)
    });
    bench(&mut results, "perf/deep_tree_500", 200, || {
        commit_chain(&engine, 500)
    });
    bench(&mut results, "perf/depth_10000", 10, || {
        commit_chain_of(&engine, 10_000, "0.0001")
    });
    bench(&mut results, "perf/batch_5000_mult", 3, || {
        for _ in 0..5_000 {
            drop(engine.from(100_i64)?.mul("1.05")?.commit(&ACCEPT)?);
        }
        Ok::<_, CalcAuyError>(())
    });
    bench(&mut results, "perf/batch_1000_tax", 3, || {
        for _ in 0..1_000 {
            drop(engine.from(100_i64)?.mul("0.15")?.commit(&ACCEPT)?);
        }
        Ok::<_, CalcAuyError>(())
    });
    let p99 = pow2(99, &limits)?;
    bench(&mut results, "perf/pow_div_2_100", 2_000, || {
        engine.from(2_i64)?.pow(100_i64)?.div(&p99)?.commit(&ACCEPT)
    });
    bench(&mut results, "perf/balanced_width_100", 500, || {
        let mut calc = engine.from(0_i64)?;
        for value in 0..100_i64 {
            calc = calc.add(value)?;
        }
        calc.commit(&ACCEPT)
    });

    // ───────────────────── Security/signing ─────────────────────

    bench(&mut results, "security/sign_chain_100", 2_000, || {
        commit_chain(&engine, 100)
    });
    bench(&mut results, "security/sign_chain_450", 300, || {
        commit_chain(&engine, 450)
    });
    bench(&mut results, "security/audit_trace_100", 2_000, || {
        commit_chain(&engine, 100)?
            .output(OutputOptions::new())
            .to_audit_trace()
    });
    bench(&mut results, "security/metadata_100", 2_000, || {
        let mut calc = engine.from(100_i64)?;
        for i in 0..100_i64 {
            calc = calc.set_metadata(format!("key_{i}"), MetaValue::from(format!("value_{i}")))?;
        }
        calc.commit(&ACCEPT)
    });
    bench(&mut results, "security/metadata_5000", 20, || {
        let mut calc = engine.from(100_i64)?;
        for i in 0..5_000_i64 {
            calc = calc.set_metadata(format!("key_{i}"), MetaValue::from(format!("value_{i}")))?;
        }
        calc.commit(&ACCEPT)
    });
    bench(&mut results, "security/metadata_10000_emoji", 5, || {
        let long = "A".repeat(100);
        let mut calc = engine.from(100_i64)?;
        for i in 0..10_000_i64 {
            calc = calc.set_metadata(format!("🚀_key_{i}"), MetaValue::from(long.clone()))?;
        }
        calc.commit(&ACCEPT)
    });
    let trace_for_hydrate = engine
        .from(100_i64)?
        .add(50_i64)?
        .commit(&ACCEPT)?
        .output(OutputOptions::new())
        .to_audit_trace()?;
    bench(&mut results, "security/hydrate_audit_trace", 2_000, || {
        engine.hydrate(&trace_for_hydrate)
    });
    let trace_integrity = engine
        .from(500_i64)?
        .commit(&ACCEPT)?
        .output(OutputOptions::new())
        .to_audit_trace()?;
    bench(&mut results, "security/check_integrity", 2_000, || {
        engine.hydrate(&trace_integrity)
    });
    bench(
        &mut results,
        "audit/forensic_hibernate_hydrate",
        2_000,
        || {
            let signed = engine
                .from("1234.567")?
                .mul("1.05")?
                .set_metadata("invoice", MetaValue::from("INV-999"))?
                .hibernate()?;
            engine.hydrate(&signed)
        },
    );

    // ───────────────────────── Output ─────────────────────────

    let committed100_calc = engine.from(100_i64)?.add(50_i64)?.commit(&ACCEPT)?;
    let committed100 = committed100_calc.output(OutputOptions::new());
    let money_committed = engine.from("1234567.89")?.commit(&ACCEPT)?;
    let slice_committed = engine.from("1000000.00")?.commit(&ACCEPT)?;
    let pt = realizer_for_code("pt-BR");

    bench(&mut results, "output/toStringNumber", 100_000, || {
        committed100.to_string_decimal()
    });
    bench(&mut results, "output/toScaledBigInt", 100_000, || {
        committed100.to_scaled_bigint(2)
    });
    bench(&mut results, "output/toRawInternalNumber", 100_000, || {
        committed100.to_raw_parts()
    });
    bench(&mut results, "output/toUnicode", 50_000, || {
        committed100.to_unicode()
    });
    bench(&mut results, "output/toLaTeX", 50_000, || {
        committed100.to_latex()
    });
    let money_view = money_committed.output(OutputOptions::new());
    bench(&mut results, "output/toMonetary", 50_000, || {
        money_view.to_monetary()
    });
    let locales = [
        Locale::PtBr,
        Locale::EnUs,
        Locale::DeDe,
        Locale::JaJp,
        Locale::FrFr,
    ];
    let money_locale_views: Vec<_> = locales
        .iter()
        .map(|locale| money_committed.output(OutputOptions::new().with_locale(*locale)))
        .collect();
    bench(&mut results, "output/toMonetary_burst_5_locales", 1, || {
        for i in 0..100_000_usize {
            drop(money_locale_views[i % money_locale_views.len()].to_monetary());
        }
    });
    bench(&mut results, "output/toSlice_3", 50_000, || {
        committed100.to_slice(3)
    });
    let slice_view = slice_committed.output(OutputOptions::new().with_decimals(10));
    bench(&mut results, "output/toSlice_100k", 3, || {
        slice_view.to_slice(100_000)
    });
    bench(&mut results, "output/toSliceByRatio_4", 20_000, || {
        committed100.to_slice_by_ratio_text(&["5%", "70%", "3.64%", "21.36%"])
    });
    bench(&mut results, "output/toVerbalA11y_pt", 20_000, || {
        committed100.to_verbal_a11y(pt.as_ref())
    });
    bench(&mut results, "output/toMermaid_100", 2_000, || {
        committed100.to_mermaid_graph()
    });
    bench(&mut results, "output/toJSON_formats", 20_000, || {
        committed100.to_json_formats(
            &[OutputKey::Monetary, OutputKey::Unicode, OutputKey::Scaled],
            pt.as_ref(),
        )
    });
    bench(&mut results, "output/toCustomOutput_100k", 1, || {
        for _ in 0..100_000 {
            drop(committed100.to_custom_output(&Stringify, (), pt.as_ref()));
        }
    });
    // Cache frio: cada iteração usa uma `Output` distinta.
    let cold_calcs: Vec<_> = (0..=2_000_i64)
        .map(|i| engine.from(100_i64 + i)?.add(50_i64)?.commit(&ACCEPT))
        .collect::<Result<Vec<_>, CalcAuyError>>()?;
    let cold_views: Vec<_> = cold_calcs
        .iter()
        .map(|calc| calc.output(OutputOptions::new()))
        .collect();
    let mut cold_idx = 0_usize;
    bench(&mut results, "output/toLaTeX_cold", 2_000, || {
        let view = &cold_views[cold_idx];
        cold_idx += 1;
        view.to_latex()
    });
    cold_idx = 0;
    bench(&mut results, "output/toUnicode_cold", 2_000, || {
        let view = &cold_views[cold_idx];
        cold_idx += 1;
        view.to_unicode()
    });
    cold_idx = 0;
    bench(&mut results, "output/toMermaid_cold", 2_000, || {
        let view = &cold_views[cold_idx];
        cold_idx += 1;
        view.to_mermaid_graph()
    });
    bench(&mut results, "output/render_nested_100", 500, || {
        let mut builder = AstBuilder::new(engine.config().limits());
        let one = builder.literal(Rational::from_i64(1), "1")?;
        let mut root = one;
        for _ in 0..100 {
            let sum = builder.operation(OperationType::Add, &[root, one])?;
            root = builder.operation(OperationType::Div, &[one, sum])?;
        }
        let ast = builder.finish(root)?;
        let committed = Calculation::from_flat_ast(engine.config(), ast).commit(&ACCEPT)?;
        let output = committed.output(OutputOptions::new());
        Ok::<_, CalcAuyError>(output.to_latex() + &output.to_unicode())
    });
    let meta5000 = {
        let mut calc = engine.from(1000_i64)?;
        for i in 0..5_000_i64 {
            calc = calc.set_metadata(
                format!("audit_log_entry_id_{i}"),
                MetaValue::from(format!("hash_{i:x}")),
            )?;
        }
        calc.commit(&ACCEPT)?
    };
    let meta5000_view = meta5000.output(OutputOptions::new());
    bench(&mut results, "output/mermaid_5000_metadata", 3, || {
        meta5000_view.to_mermaid_graph()
    });
    bench(&mut results, "output/mermaid_pii_redaction", 2_000, || {
        let committed = engine
            .from(100_i64)?
            .set_metadata("user_email", MetaValue::from("user@example.com"))?
            .set_metadata("public_info", MetaValue::from("OK"))?
            .commit(&ACCEPT)?;
        let output = committed.output(OutputOptions::new().with_sensitivity(Sensitivity::Redact));
        Ok::<_, CalcAuyError>(output.to_mermaid_graph())
    });

    // ───────────────────────── Stress ─────────────────────────

    let primes: [i64; 100] = [
        2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
        97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181,
        191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281,
        283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397,
        401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503,
        509, 521, 523, 541,
    ];
    bench(&mut results, "stress/primorial_sum_100", 20, || {
        let mut calc = engine.from(0_i64)?;
        for prime in primes {
            calc = calc.add(format!("1/{prime}"))?;
        }
        calc.commit(&ACCEPT)
    });
    bench(&mut results, "stress/mult_avalanche_900k", 2, || {
        let mut builder = AstBuilder::new(engine.config().limits());
        let part = pow_node(&mut builder, 2, 225_000)?;
        let root = builder.operation(OperationType::Mul, &[part, part, part, part])?;
        commit_ast(&engine, builder, root)
    });
    bench(&mut results, "stress/overflow_detect_1m", 2, || {
        let mut builder = AstBuilder::new(engine.config().limits());
        let first = pow_node(&mut builder, 2, 500_000)?;
        let second = pow_node(&mut builder, 2, 500_001)?;
        let root = builder.operation(OperationType::Mul, &[first, second])?;
        let outcome = commit_ast(&engine, builder, root);
        Ok::<_, CalcAuyError>(is_err(&outcome))
    });
    bench(&mut results, "stress/power_tower", 20, || {
        engine.from("1.1")?.pow(16_i64)?.commit(&ACCEPT)
    });
    bench(&mut results, "stress/roots_nested_huge", 2, || {
        let limits = engine.config().limits();
        let mut builder = AstBuilder::new(limits);
        let inner = pow_node(&mut builder, 2, 450_000)?;
        let base = pow_exp_node(&mut builder, inner, 2)?;
        let root = pow_frac_node(&mut builder, base, 1, 100, limits)?;
        let root = pow_frac_node(&mut builder, root, 1, 2, limits)?;
        let root = pow_frac_node(&mut builder, root, 1, 2, limits)?;
        commit_ast(&engine, builder, root)
    });
    bench(&mut results, "stress/hydra_50x3", 2, || {
        let mut builder = AstBuilder::new(engine.config().limits());
        let root = build_hydra(&mut builder, engine.config().limits(), 3, 50)?;
        let ast = builder.finish(root)?;
        Calculation::from_flat_ast(engine.config(), ast).commit(&ACCEPT)
    });
    bench(&mut results, "stress/supernova_primorial", 10, || {
        let mut calc = engine.from(1_i64)?;
        let mut product = 1_u64;
        for prime in [2_u64, 3, 5, 7, 11, 13, 17, 19, 23, 29] {
            product *= prime;
            calc = calc.add(format!("1/{product}"))?.pow(2_i64)?;
        }
        calc.commit(&ACCEPT)
    });

    // ───────────────────────── Codecs ─────────────────────────

    let deep = {
        let mut calc = engine.from(1_i64)?;
        for i in 0..25_i64 {
            calc = calc
                .add(1_i64)?
                .set_metadata(format!("step_{i}"), MetaValue::from(i))?;
        }
        calc.commit(&ACCEPT)?
    };
    let deep_view = deep.output(OutputOptions::new());
    let payload = deep.payload();
    bench(&mut results, "codec/msgpack_roundtrip", 2_000, || {
        let bytes = Format::MsgPack.encode(payload)?;
        Format::MsgPack.decode(&bytes, &limits)
    });
    bench(&mut results, "codec/protobuf_roundtrip", 2_000, || {
        let bytes = Format::Protobuf.encode(payload)?;
        Format::Protobuf.decode(&bytes, &limits)
    });
    bench(&mut results, "codec/json_audit_trace", 2_000, || {
        deep_view.to_audit_trace()
    });

    // ─────────────────────────────── Saída ───────────────────────────────

    let document = serde_json::json!({
        "engine": "rust",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
        "results": results
            .iter()
            .map(|(name, sample)| {
                (
                    name.clone(),
                    serde_json::json!({ "iters": sample.iters, "total_ms": sample.total_ms }),
                )
            })
            .collect::<serde_json::Map<_, _>>(),
    });
    std::fs::create_dir_all("bench/results").map_err(|error| CalcAuyError::SerializationError {
        message: error.to_string(),
    })?;
    std::fs::write(
        "bench/results/rust.json",
        serde_json::to_string_pretty(&document).map_err(|error| {
            CalcAuyError::SerializationError {
                message: error.to_string(),
            }
        })?,
    )
    .map_err(|error| CalcAuyError::SerializationError {
        message: error.to_string(),
    })?;
    println!(
        "\n[rust] {} benchmarks gravados em bench/results/rust.json",
        results.len()
    );
    Ok(())
}

/// Reexporta o parser de racionais do núcleo para o harness.
fn parse_rational(input: &str, limits: &Limits) -> Result<Rational, CalcAuyError> {
    calc_auy_api::numeric::parse::parse_rational(input, limits)
}
