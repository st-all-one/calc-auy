//! Task runner do CalcAUY: CI, benchmarks, corpus, schema, tile-tune, PGO.

#![allow(
    clippy::expect_used,
    clippy::missing_panics_doc,
    clippy::print_stdout,
    reason = "ferramenta de build interativa; a saída é o produto"
)]

use std::path::Path;
use std::process::Command;
use std::time::Instant;

use anyhow::{Context, Result, ensure};
use clap::{Parser, Subcommand};

use calc_auy_core::{
    AstBuilder, CalcAuyError, CustodyVerifier, FlatAst, Limits, OperationType, Rational,
    RoundingStrategy, Salt, SmallBatch, VerifiedAst, commit, eval_batch,
};

/// Tamanhos de tile candidatos ao ajuste.
const TILE_CANDIDATES: [usize; 8] = [64, 128, 256, 512, 1024, 2048, 4096, 8192];

/// Número de execuções por medição.
const MEASURE_ITERATIONS: usize = 3;

/// Task runner do CalcAUY.
#[derive(Debug, Parser)]
#[command(name = "xtask", about = "Tarefas de build do CalcAUY")]
struct Cli {
    /// Subcomando a executar.
    #[command(subcommand)]
    command: Commands,
}

/// Subcomandos disponíveis.
#[derive(Debug, Subcommand)]
enum Commands {
    /// Executa o pipeline de verificação (fmt, clippy, test).
    Ci,
    /// Executa os benchmarks do workspace.
    Bench,
    /// Ajusta o tamanho de tile e registra o resultado.
    TileTune,
    /// Mede a escala do lote paralelo por número de threads.
    Scale,
    /// Orquestra PGO (profile-guided optimization).
    Pgo,
    /// Orquestra BOLT (se disponível).
    Bolt,
    /// Gera o corpus de conformidade e o executa.
    Corpus,
    /// Gera os processadores a partir do schema (stub).
    Schema,
    /// Relatório de benchmarks vs. orçamentos (T13.5).
    BenchReport,
    /// Prepara o release: versão, licença, hashes (T13.6).
    Release,
}

/// Ponto de entrada do task runner.
///
/// # Errors
///
/// Retorna erro se o subcomando executado falhar.
fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Ci => run_ci(),
        Commands::Bench => run_cargo(&["bench", "--workspace"]),
        Commands::TileTune => run_tile_tune(),
        Commands::Scale => run_scale(),
        Commands::Pgo => run_pgo(),
        Commands::Bolt => run_bolt(),
        Commands::Corpus => run_corpus(),
        Commands::Schema => run_schema(),
        Commands::BenchReport => run_bench_report(),
        Commands::Release => run_release(),
    }
}

/// Verificador permissivo para o workload de escala.
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

/// Executa o pipeline completo de verificação.
///
/// # Errors
///
/// Retorna erro se qualquer etapa do pipeline falhar.
fn run_ci() -> Result<()> {
    run_cargo(&["fmt", "--all", "--", "--check"])?;
    run_cargo(&[
        "clippy",
        "--workspace",
        "--all-targets",
        "--",
        "-D",
        "warnings",
    ])?;
    run_cargo(&["test", "--workspace"])?;
    Ok(())
}

/// Executa o corpus de conformidade (T13.1).
///
/// # Errors
///
/// Retorna erro se os testes do corpus falharem.
fn run_corpus() -> Result<()> {
    run_cargo(&["test", "-p", "calc-auy-api", "--test", "corpus"])?;
    println!("corpus: OK");
    Ok(())
}

/// Mede os orçamentos de performance por camada (T13.5).
///
/// # Errors
///
/// Retorna erro se a escrita do relatório falhar.
fn run_bench_report() -> Result<()> {
    let limits = Limits::default();
    let salt = Salt::new("bench");
    let strategy = RoundingStrategy::Nbr5891;

    let create = per_op(200_000, || {
        drop(std::hint::black_box(Rational::from_i64(42)));
    });
    let left = Rational::new_checked(1, 3, &limits)?;
    let right = Rational::new_checked(1, 7, &limits)?;
    let add = per_op(200_000, || {
        drop(std::hint::black_box(left.add(&right)));
    });
    let parse = per_op(20_000, || {
        drop(std::hint::black_box(calc_auy_parser::parse(
            "10000 * (1 + 14.75%) ^ 3",
            &limits,
        )));
    });
    let verified = build_verified(&limits);
    let commit_ns = per_op(10_000, || {
        drop(std::hint::black_box(commit(
            verified.clone(),
            strategy,
            2,
            &salt,
            &limits,
        )));
    });

    let budgets = serde_json::json!({
        "rational_create_ns": 50,
        "rational_add_ns": 100,
        "parse_ns": 1_000_000,
        "signature_ns": 100_000,
    });
    let passed = create <= 50 && add <= 100 && parse <= 1_000_000 && commit_ns <= 100_000;
    let report = serde_json::json!({
        "rational_create_ns": create,
        "rational_add_ns": add,
        "parse_ns": parse,
        "commit_ns": commit_ns,
        "budgets_ns": budgets,
        "passed": passed,
    });
    let path = Path::new("plan/evidence/E13/T13.5.bench.json");
    std::fs::create_dir_all(path.parent().unwrap_or_else(|| Path::new(".")))?;
    std::fs::write(path, serde_json::to_string_pretty(&report)? + "\n")?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    ensure!(passed, "orçamento de performance violado");
    Ok(())
}

/// Constrói uma AST verificada de exemplo para o benchmark de commit.
fn build_verified(limits: &Limits) -> VerifiedAst {
    let mut builder = AstBuilder::new(limits);
    let ten_thousand = builder
        .literal(Rational::from_i64(10_000), "10000")
        .expect("literal");
    let one = builder
        .literal(Rational::from_i64(1), "1")
        .expect("literal");
    let percent = builder
        .literal(
            Rational::new_checked(1475, 10_000, limits).expect("percentual"),
            "14.75%",
        )
        .expect("literal");
    let three = builder
        .literal(Rational::from_i64(3), "3")
        .expect("literal");
    let sum = builder
        .operation(OperationType::Add, &[one, percent])
        .expect("add");
    let group = builder.group(sum).expect("group");
    let pow = builder
        .operation(OperationType::Pow, &[group, three])
        .expect("pow");
    let root = builder
        .operation(OperationType::Mul, &[ten_thousand, pow])
        .expect("mul");
    let ast = builder.finish(root).expect("finish");
    ast.verify_custody(&AcceptAll, limits).expect("custódia")
}

/// Mede o tempo por operação (ns) em `iterations` execuções.
#[allow(
    clippy::disallowed_methods,
    reason = "ferramenta de medição, fora do domínio determinístico"
)]
fn per_op(iterations: u32, mut action: impl FnMut()) -> u128 {
    for _ in 0..(iterations / 10).max(1) {
        action();
    }
    let mut best = u128::MAX;
    for _ in 0..MEASURE_ITERATIONS {
        let start = Instant::now();
        for _ in 0..iterations {
            action();
        }
        let elapsed = start
            .elapsed()
            .as_nanos()
            .checked_div(u128::from(iterations))
            .unwrap_or(0);
        best = best.min(elapsed);
    }
    best
}

/// Prepara o release: versão, licença e hashes de artefatos (T13.6).
///
/// # Errors
///
/// Retorna erro se a licença estiver ausente ou não for MPL-2.0.
fn run_release() -> Result<()> {
    let version = env!("CARGO_PKG_VERSION");
    println!("release: versão {version}");

    let license = std::fs::read_to_string("LICENSE").context("LICENSE ausente")?;
    ensure!(
        license.contains("Mozilla Public License"),
        "LICENSE não é MPL-2.0"
    );
    println!("release: licença MPL-2.0 OK");

    let artifacts = [
        "target/release/calc-auy",
        "target/wasm32-unknown-unknown/release/calc_auy_wasm.wasm",
    ];
    for artifact in artifacts {
        match std::fs::read(artifact) {
            Ok(bytes) => {
                let hash = blake3::hash(&bytes);
                println!(
                    "release: {artifact}: {} bytes, blake3 {}",
                    bytes.len(),
                    hash.to_hex()
                );
            }
            Err(_) => println!("release: {artifact}: ausente (build não executado)"),
        }
    }

    println!(
        "release: publish = false (publicação desabilitada por política; use `cargo package` local)"
    );
    Ok(())
}

/// Executa o `cargo` com os argumentos dados, propagando falhas.
///
/// # Errors
///
/// Retorna erro se o processo não puder ser iniciado ou retornar falha.
fn run_cargo(args: &[&str]) -> Result<()> {
    let status = Command::new("cargo")
        .args(args)
        .status()
        .context("falha ao executar o cargo")?;
    ensure!(status.success(), "comando falhou: cargo {}", args.join(" "));
    Ok(())
}

/// Mede o menor tempo (em nanossegundos) de `MEASURE_ITERATIONS` execuções.
#[allow(
    clippy::disallowed_methods,
    reason = "ferramenta de medição, fora do domínio determinístico"
)]
fn measure(mut action: impl FnMut()) -> u128 {
    let mut best = u128::MAX;
    for _ in 0..MEASURE_ITERATIONS {
        let start = Instant::now();
        action();
        best = best.min(start.elapsed().as_nanos());
    }
    best
}

/// Constrói um lote canônico de `size` frações pequenas.
fn build_batch(size: usize, limits: &Limits) -> SmallBatch {
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

/// Constrói um lote de ASTs verificadas para o workload de escala.
///
/// # Errors
///
/// Retorna erro se a construção falhar.
fn build_verified_batch(count: usize, limits: &Limits) -> Result<Vec<VerifiedAst>> {
    let mut batch = Vec::with_capacity(count);
    for index in 0..count {
        let ast: FlatAst = build_chain(index.saturating_add(8), limits)?;
        batch.push(ast.verify_custody(&AcceptAll, limits)?);
    }
    Ok(batch)
}

/// Constrói uma cadeia de somas de `terms` literais.
///
/// # Errors
///
/// Retorna erro se um limite for excedido.
fn build_chain(terms: usize, limits: &Limits) -> Result<FlatAst> {
    let mut builder = AstBuilder::with_capacity(limits, terms.saturating_add(1));
    let mut operands = Vec::with_capacity(terms);
    for index in 0..terms {
        let value = Rational::from_i64(i64::try_from(index).unwrap_or(0).saturating_add(1));
        operands.push(builder.literal(value.clone(), value.to_string())?);
    }
    let root = builder.flattened_operation(OperationType::Add, &operands)?;
    Ok(builder.finish(root)?)
}

/// Ajusta o tamanho de tile e registra o resultado em JSON.
///
/// # Errors
///
/// Retorna erro se a escrita do relatório falhar.
fn run_tile_tune() -> Result<()> {
    let limits = Limits::default();
    let batch = build_batch(1 << 14, &limits);
    let mut timings = Vec::with_capacity(TILE_CANDIDATES.len());
    for tile in TILE_CANDIDATES {
        let nanos = measure(|| {
            drop(batch.sum_tiled(tile, &limits));
        });
        timings.push((tile, nanos));
    }
    let best = timings
        .iter()
        .min_by_key(|(_, nanos)| *nanos)
        .map(|(tile, _)| *tile);
    let document = serde_json::json!({
        "best_tile": best,
        "timings": timings
            .iter()
            .map(|(tile, nanos)| serde_json::json!({ "tile": tile, "nanos": nanos }))
            .collect::<Vec<_>>(),
    });
    write_evidence("tile-tune.json", &document)?;
    println!("tile-tune: melhor tile = {best:?}");
    Ok(())
}

/// Mede a escala do lote paralelo por número de threads.
///
/// # Errors
///
/// Retorna erro se a construção do pool ou a escrita do relatório falhar.
fn run_scale() -> Result<()> {
    let limits = Limits::default();
    let asts = build_verified_batch(256, &limits)?;
    let mut results = Vec::new();
    for threads in [1_usize, 2, 4, 8, 16] {
        let pool = rayon::ThreadPoolBuilder::new()
            .num_threads(threads)
            .build()
            .context("falha ao criar o pool de threads")?;
        let nanos = measure(|| {
            drop(pool.install(|| eval_batch(&asts, &limits)));
        });
        results.push((threads, nanos));
    }
    let document = serde_json::json!({
        "results": results
            .iter()
            .map(|(threads, nanos)| serde_json::json!({ "threads": threads, "nanos": nanos }))
            .collect::<Vec<_>>(),
    });
    write_evidence("scale.json", &document)?;
    println!("scale: {results:?}");
    Ok(())
}

/// Escreve um relatório JSON em `plan/evidence/E08/`.
///
/// # Errors
///
/// Retorna erro se a criação do diretório ou a escrita falhar.
fn write_evidence(name: &str, document: &serde_json::Value) -> Result<()> {
    let directory = Path::new("plan/evidence/E08");
    std::fs::create_dir_all(directory).context("falha ao criar plan/evidence/E08")?;
    let path = directory.join(name);
    let text = serde_json::to_string_pretty(document).context("falha ao serializar JSON")?;
    std::fs::write(&path, text).with_context(|| format!("falha ao escrever {}", path.display()))?;
    Ok(())
}

/// Gera os arquivos de schema (CDDL/JSON Schema) a partir da fonte.
///
/// # Errors
///
/// Retorna erro se a escrita falhar.
fn run_schema() -> Result<()> {
    let mut changed = write_if_changed(
        "schema/calc_auy.schema.json",
        calc_auy_processors::schema::json_schema(),
    )?;
    changed |= write_if_changed("schema/calc_auy.cddl", calc_auy_processors::schema::cddl())?;
    if changed {
        println!("schema: arquivos atualizados");
    } else {
        println!("schema: em sincronia (idempotente)");
    }
    Ok(())
}

/// Escreve `content` em `path` se for diferente; retorna se houve mudança.
///
/// # Errors
///
/// Retorna erro se a escrita falhar.
fn write_if_changed(path: &str, content: &str) -> Result<bool> {
    let existing = std::fs::read_to_string(path).unwrap_or_default();
    if existing == content {
        return Ok(false);
    }
    std::fs::write(path, content).with_context(|| format!("falha ao escrever {path}"))?;
    Ok(true)
}

/// Verifica se uma ferramenta está disponível no `PATH`.
fn tool_available(name: &str) -> bool {
    Command::new(name).arg("--version").output().is_ok()
}

/// Orquestra PGO, se `llvm-profdata` estiver disponível.
///
/// # Errors
///
/// Retorna erro se alguma etapa de build falhar.
fn run_pgo() -> Result<()> {
    let profile_dir = "target/pgo";
    let merged = "target/pgo/merged.profdata";
    if !tool_available("llvm-profdata") {
        println!("PGO indisponível: `llvm-profdata` não encontrado.");
        println!("Instale com: rustup component add llvm-tools-preview");
        println!(
            "Etapas: RUSTFLAGS=\"-Cprofile-generate={profile_dir}\" cargo test -p calc-auy-core --release"
        );
        println!("        llvm-profdata merge -o {merged} {profile_dir}");
        println!("        RUSTFLAGS=\"-Cprofile-use={merged}\" cargo build --release -p calc-auy");
        return Ok(());
    }
    let generate = format!("-Cprofile-generate={profile_dir}");
    run_cargo_env(
        &["test", "-p", "calc-auy-core", "--release"],
        "RUSTFLAGS",
        &generate,
    )?;
    run_tool("llvm-profdata", &["merge", "-o", merged, profile_dir])?;
    let use_profile = format!("-Cprofile-use={merged}");
    run_cargo_env(
        &["build", "--release", "-p", "calc-auy"],
        "RUSTFLAGS",
        &use_profile,
    )?;
    println!("PGO concluído com perfil {merged}");
    Ok(())
}

/// Orquestra BOLT, se `llvm-bolt` estiver disponível.
///
/// # Errors
///
/// Retorna erro se a etapa de build falhar.
fn run_bolt() -> Result<()> {
    if !tool_available("llvm-bolt") {
        println!("BOLT indisponível: `llvm-bolt` não encontrado no PATH.");
        println!(
            "Etapas: llvm-bolt target/release/calc-auy -o target/release/calc-auy.bolt \
             -data=perf.fdata -reorder-blocks=ext-tsp -reorder-functions=hfsort"
        );
        return Ok(());
    }
    run_cargo(&["build", "--release", "-p", "calc-auy"])?;
    run_tool(
        "llvm-bolt",
        &[
            "target/release/calc-auy",
            "-o",
            "target/release/calc-auy.bolt",
        ],
    )?;
    println!("BOLT concluído: target/release/calc-auy.bolt");
    Ok(())
}

/// Executa o `cargo` com uma variável de ambiente.
///
/// # Errors
///
/// Retorna erro se o processo não puder ser iniciado ou retornar falha.
fn run_cargo_env(args: &[&str], key: &str, value: &str) -> Result<()> {
    let status = Command::new("cargo")
        .args(args)
        .env(key, value)
        .status()
        .context("falha ao executar o cargo")?;
    ensure!(
        status.success(),
        "comando falhou: cargo {} ({key}={value})",
        args.join(" ")
    );
    Ok(())
}

/// Executa uma ferramenta externa.
///
/// # Errors
///
/// Retorna erro se o processo não puder ser iniciado ou retornar falha.
fn run_tool(name: &str, args: &[&str]) -> Result<()> {
    let status = Command::new(name)
        .args(args)
        .status()
        .with_context(|| format!("falha ao executar {name}"))?;
    ensure!(
        status.success(),
        "comando falhou: {name} {}",
        args.join(" ")
    );
    Ok(())
}
