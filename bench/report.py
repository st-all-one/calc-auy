#!/usr/bin/env python3
"""Gera o relatório comparativo Rust x TypeScript a partir dos JSONs do harness.

Uso: python3 bench/report.py
Saída: bench/results/compare.md e bench/results/compare.json
"""

import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
RESULTS = ROOT / "bench" / "results"


def load(name: str) -> dict:
    with (RESULTS / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def per_op_us(entry: dict) -> float:
    return entry["total_ms"] / entry["iters"] * 1000.0


def main() -> None:
    ts = load("ts.json")["results"]
    rust = load("rust.json")["results"]
    names = sorted(set(ts) & set(rust))

    rows = []
    for name in names:
        ts_us = per_op_us(ts[name])
        rust_us = per_op_us(rust[name])
        speedup = ts_us / rust_us if rust_us else float("inf")
        rows.append(
            {
                "name": name,
                "category": name.split("/", 1)[0],
                "iters": ts[name]["iters"],
                "ts_us": ts_us,
                "rust_us": rust_us,
                "speedup": speedup,
                "winner": "rust" if speedup >= 1 else "ts",
            }
        )

    def geomean(values):
        positives = [v for v in values if v > 0]
        return math.exp(sum(math.log(v) for v in positives) / len(positives)) if positives else 0.0

    overall = geomean([r["speedup"] for r in rows])
    by_category = {}
    for row in rows:
        by_category.setdefault(row["category"], []).append(row["speedup"])

    lines = []
    lines.append("# Benchmark comparativo — Rust × TypeScript (CalcAUY)\n")
    lines.append(f"Cargas derivadas de `_REF/tests/` — {len(rows)} workloads.\n")
    lines.append(
        f"- **Rust** (`calc-auy-api`, release): `cargo run --release -p calc-auy-api --example bench_compare`\n"
        f"- **TypeScript** (`_REF`, Deno {load('ts.json')['version']} / V8 {load('ts.json')['v8']}): `deno run ... bench/ts/compare.ts`\n"
    )
    lines.append(f"**Speedup geométrico global (Rust/TS): {overall:.2f}×**\n")
    lines.append("## Por categoria\n")
    lines.append("| Categoria | Workloads | Speedup geométrico |")
    lines.append("|---|---:|---:|")
    for category in sorted(by_category):
        values = by_category[category]
        lines.append(f"| `{category}` | {len(values)} | {geomean(values):.2f}× |")

    lines.append("\n## Detalhe (µs/op)\n")
    lines.append("| Workload | Rust µs/op | TS µs/op | Rust/TS | Vencedor |")
    lines.append("|---|---:|---:|---:|---|")
    for row in sorted(rows, key=lambda r: r["speedup"]):
        lines.append(
            f"| `{row['name']}` | {row['rust_us']:.3f} | {row['ts_us']:.3f} | "
            f"{row['speedup']:.2f}× | {row['winner']} |"
        )

    rust_wins = sum(1 for r in rows if r["winner"] == "rust")
    ts_wins = len(rows) - rust_wins
    lines.append(f"\n**Vitórias:** Rust {rust_wins} · TypeScript {ts_wins}.\n")
    lines.append(
        "> `Rust/TS > 1` significa que o Rust é mais rápido; `< 1` que o TypeScript é mais rápido.\n"
        "> Ambos memoizam representações por instância de saída; as cargas `*_cold`\n"
        "> isolam a renderização sem cache. Assinatura/hidratação favorecem o BLAKE3\n"
        "> síncrono do Rust; números gigantes favorecem o BigInt nativo do V8.\n"
    )

    (RESULTS / "compare.md").write_text("\n".join(lines), encoding="utf-8")
    with (RESULTS / "compare.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "overall_speedup": overall,
                "by_category": {k: geomean(v) for k, v in by_category.items()},
                "rows": rows,
            },
            handle,
            indent=2,
        )
        handle.write("\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
