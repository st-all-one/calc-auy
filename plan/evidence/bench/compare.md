# Benchmark comparativo — Rust × TypeScript (CalcAUY)

Cargas derivadas de `_REF/tests/` — 62 workloads.

- **Rust** (`calc-auy-api`, release): `cargo run --release -p calc-auy-api --example bench_compare`
- **TypeScript** (`_REF`, Deno 2.9.5 / V8 15.0.245.2-rusty): `deno run ... bench/ts/compare.ts`

**Speedup geométrico global (Rust/TS): 7.81×**

## Por categoria

| Categoria | Workloads | Speedup geométrico |
|---|---:|---:|
| `audit` | 1 | 8.95× |
| `builder` | 9 | 4.14× |
| `codec` | 3 | 4.42× |
| `core` | 8 | 5.13× |
| `output` | 20 | 10.07× |
| `perf` | 6 | 9.46× |
| `security` | 8 | 22.09× |
| `stress` | 7 | 4.50× |

## Detalhe (µs/op)

| Workload | Rust µs/op | TS µs/op | Rust/TS | Vencedor |
|---|---:|---:|---:|---|
| `stress/supernova_primorial` | 184.000 | 89.900 | 0.49× | ts |
| `output/toSliceByRatio_4` | 5.054 | 2.938 | 0.58× | ts |
| `core/round_nbr5891` | 0.380 | 0.410 | 1.08× | rust |
| `stress/mult_avalanche_900k` | 36265.000 | 40140.529 | 1.11× | rust |
| `output/toVerbalA11y_pt` | 0.814 | 0.981 | 1.21× | rust |
| `builder/parse_chain_1000` | 454.495 | 597.064 | 1.31× | rust |
| `core/round_half_up` | 0.335 | 0.482 | 1.44× | rust |
| `codec/protobuf_roundtrip` | 57.220 | 86.298 | 1.51× | rust |
| `output/mermaid_5000_metadata` | 3.333 | 5.285 | 1.59× | rust |
| `builder/parse_expression_pemdas` | 3.416 | 5.623 | 1.65× | rust |
| `builder/parse_chain_100` | 18.006 | 45.467 | 2.53× | rust |
| `output/toSlice_3` | 0.661 | 1.975 | 2.99× | rust |
| `codec/json_audit_trace` | 0.075 | 0.238 | 3.17× | rust |
| `builder/build_chain_10` | 2.102 | 7.216 | 3.43× | rust |
| `stress/primorial_sum_100` | 439.500 | 1554.682 | 3.54× | rust |
| `security/audit_trace_100` | 72.380 | 257.428 | 3.56× | rust |
| `builder/lex_chain_100` | 2.200 | 8.273 | 3.76× | rust |
| `core/rational_div` | 0.106 | 0.465 | 4.38× | rust |
| `output/toJSON_formats` | 0.545 | 2.841 | 5.22× | rust |
| `output/toLaTeX_cold` | 0.850 | 4.650 | 5.47× | rust |
| `output/toUnicode_cold` | 0.425 | 2.337 | 5.50× | rust |
| `security/sign_chain_450` | 193.600 | 1084.200 | 5.60× | rust |
| `core/rational_add` | 0.082 | 0.464 | 5.65× | rust |
| `core/rational_mul` | 0.088 | 0.502 | 5.72× | rust |
| `output/toMermaid_cold` | 1.580 | 9.486 | 6.00× | rust |
| `security/sign_chain_100` | 45.795 | 287.154 | 6.27× | rust |
| `perf/depth_10000` | 7754.000 | 49904.968 | 6.44× | rust |
| `output/mermaid_pii_redaction` | 3.790 | 26.953 | 7.11× | rust |
| `output/toRawInternalNumber` | 0.025 | 0.182 | 7.34× | rust |
| `builder/commit_chain_10` | 7.392 | 55.823 | 7.55× | rust |
| `security/metadata_100` | 40.075 | 310.928 | 7.76× | rust |
| `builder/basic_ops_chain` | 7.458 | 58.163 | 7.80× | rust |
| `output/render_nested_100` | 183.420 | 1444.840 | 7.88× | rust |
| `stress/hydra_50x3` | 66670.000 | 537216.031 | 8.06× | rust |
| `perf/deep_tree_500` | 222.650 | 1800.077 | 8.08× | rust |
| `builder/commit_chain_100` | 45.325 | 368.727 | 8.14× | rust |
| `audit/forensic_hibernate_hydrate` | 4.295 | 38.420 | 8.95× | rust |
| `core/canonical_json` | 0.238 | 2.152 | 9.04× | rust |
| `perf/pow_div_2_100` | 4.725 | 43.321 | 9.17× | rust |
| `perf/batch_5000_mult` | 11866.667 | 121585.578 | 10.25× | rust |
| `stress/power_tower` | 3.000 | 31.069 | 10.36× | rust |
| `builder/group_precedence` | 3.031 | 31.798 | 10.49× | rust |
| `perf/batch_1000_tax` | 2313.333 | 25010.866 | 10.81× | rust |
| `core/rational_from` | 0.020 | 0.241 | 11.76× | rust |
| `output/toSlice_100k` | 5530.000 | 67625.871 | 12.23× | rust |
| `perf/balanced_width_100` | 46.000 | 621.980 | 13.52× | rust |
| `stress/roots_nested_huge` | 400.000 | 5747.711 | 14.37× | rust |
| `output/toCustomOutput_100k` | 7320.000 | 113773.060 | 15.54× | rust |
| `stress/overflow_detect_1m` | 5.000 | 81.226 | 16.25× | rust |
| `codec/msgpack_roundtrip` | 56.420 | 1022.890 | 18.13× | rust |
| `core/rational_pow_small` | 0.056 | 1.145 | 20.46× | rust |
| `output/toScaledBigInt` | 0.011 | 0.284 | 25.61× | rust |
| `output/toUnicode` | 0.011 | 0.370 | 34.87× | rust |
| `output/toStringNumber` | 0.009 | 0.337 | 39.15× | rust |
| `output/toLaTeX` | 0.008 | 0.348 | 42.44× | rust |
| `output/toMermaid_100` | 0.015 | 0.644 | 42.92× | rust |
| `security/metadata_5000` | 2834.500 | 137509.746 | 48.51× | rust |
| `output/toMonetary` | 0.008 | 0.567 | 74.65× | rust |
| `security/metadata_10000_emoji` | 10688.000 | 818569.963 | 76.59× | rust |
| `security/check_integrity` | 0.295 | 28.858 | 97.83× | rust |
| `output/toMonetary_burst_5_locales` | 510.000 | 50426.611 | 98.88× | rust |
| `security/hydrate_audit_trace` | 0.285 | 45.939 | 161.19× | rust |

**Vitórias:** Rust 60 · TypeScript 2.

> `Rust/TS > 1` significa que o Rust é mais rápido; `< 1` que o TypeScript é mais rápido.
> Ambos memoizam representações por instância de saída; as cargas `*_cold`
> isolam a renderização sem cache. Assinatura/hidratação favorecem o BLAKE3
> síncrono do Rust; números gigantes favorecem o BigInt nativo do V8.
