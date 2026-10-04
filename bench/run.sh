#!/usr/bin/env bash
# Executa o benchmark comparativo Rust × TypeScript e gera o relatório.
#
# Uso: bash bench/run.sh
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p bench/results plan/evidence/bench

echo "==> Rust (release)"
env RUSTUP_TOOLCHAIN=stable cargo run --release -p calc-auy-api --example bench_compare \
    | tee bench/results/rust.log

echo "==> TypeScript (Deno)"
deno run --allow-all --no-check --config bench/deno.jsonc bench/ts/compare.ts \
    | tee bench/results/ts.log

echo "==> Relatório"
python3 bench/report.py | tee bench/results/compare.md

cp bench/results/compare.md bench/results/compare.json plan/evidence/bench/
cp bench/results/rust.json bench/results/ts.json plan/evidence/bench/
echo "==> Evidência em plan/evidence/bench/"
