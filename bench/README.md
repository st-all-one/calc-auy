# Benchmark comparativo — Rust × TypeScript

Comparação *head-to-head* entre a implementação Rust (`calc-auy-*`) e o rascunho
TypeScript de referência (`_REF/`), com as cargas derivadas de **todos** os
arquivos de `_REF/tests/` (core, builder, security, output, performance, stress,
audit e `bench_rigor`).

## Como reproduzir

```bash
bash bench/run.sh
```

Ou manualmente (a partir da raiz do repositório):

```bash
# Rust (release)
env RUSTUP_TOOLCHAIN=stable cargo run --release -p calc-auy-api --example bench_compare

# TypeScript (Deno)
deno run --allow-all --no-check --config bench/deno.jsonc bench/ts/compare.ts

# Relatório
python3 bench/report.py
```

Saídas em `bench/results/`: `rust.json`, `ts.json`, `compare.md`, `compare.json`.

## Metodologia

- **Cargas**: 62 workloads derivados de `_REF/tests/` (ver
  `bench/ts/compare.ts` e `crates/calc-auy-api/examples/bench_compare.rs`).
- **Aquecimento**: 1 execução descartada por workload.
- **Medição**: um único timer por lote (`performance.now()` no TS,
  `std::time::Instant` no Rust), amortizando o custo do relógio.
- **Iterações**: fixas por workload (de 1 a 200 000), iguais nos dois lados.
- **Rust**: `--release`, toolchain 1.98.1.
- **TypeScript**: Deno 2.9.5 (V8 15.0.245.2), sem `--check`.
- **Hardware**: AMD Ryzen 5 5500U (12 threads), 18 GiB, Linux 7.2.7.

`Rust/TS > 1` significa Rust mais rápido.

## Resultado (última execução)

**Speedup geométrico global: ~6,9× a favor do Rust** (59 dos 62 workloads Rust;
3 TS).

| Categoria | Speedup geométrico |
|---|---:|
| `security` (assinatura, metadados) | ~22× |
| `perf` (lotes, árvores profundas) | ~9,8× |
| `audit` | ~8,9× |
| `output` (renderização) | ~7,4× |
| `core` (racionais, arredondamento) | ~4,7× |
| `codec` (MessagePack/Protobuf/JSON) | ~4,4× |
| `builder` (lexer/parser/fluxo) | ~4,2× |
| `stress` (números gigantes) | ~3,9× |

Tabela completa em `plan/evidence/bench/compare.md`.

## Otimizações aplicadas após o benchmark inicial

O primeiro *run* apontou gargalos; todos foram corrigidos:

| Gargalo | Correção | Antes (Rust/TS) | Depois |
|---|---|---|---|
| Renderização re-executada a cada chamada | **Memoização por `Output`** (`OnceLock` para LaTeX/Unicode/Mermaid/monetário/auditoria) | 0,4–0,5× | 30–75× |
| `toStringNumber`/`toScaledBigInt` re-calculados | **Memoização** do decimal efetivo e do inteiro escalonado | 0,7–0,8× | ~40× |
| Verbal re-construía a SRL a cada chamada | **Memoização da SRL** (`OnceLock<Srl>`) | 0,6× | 1,2× |
| `mul` computava o produto antes de checar bits | **Pré-checagem de orçamento** (`check_mul_budget`) | 0,00× | 2,3× |
| `set_metadata` clonava/recomputava o mapa inteiro (O(n²)) | **Contabilidade incremental** de bytes por nó | 0,12× | 48–70× |
| `parse_rational` sem cache (o TS tem `HOT_CACHE`) | **Cache quente global** de parsing (bounded, `Mutex<BTreeMap>`) | 0,3–0,7× | 6–12× |
| GCD em Euclides clássico (O(n²) com `%` total) | **Híbrido Stein/Lehmer/Half-GCD** com limiares medidos | 0,04–0,5× | 0,5–3,9× |
| `pow`/`add`/`mul` reduziam sempre por um GCD grande | **Redução gcd-least** (menos chamadas, operandos menores) | — | supernova 11,7× / primorial 7,4× |

Impacto agregado: **1,58× → ~6,9×** (vitórias Rust: 37 → 59).

O estudo A/B dos algoritmos de GCD (Euclides × Stein × Lehmer × Half-GCD)
está em `plan/evidence/gcd/`.

## Principais achados

**Rust muito mais rápido**

- **Assinatura/hidratação BLAKE3 síncrona**: `hydrate_audit_trace` **~160×**,
  `check_integrity` **~100×** (o rascunho usa `crypto.subtle.digest`, assíncrono).
- **Metadados em massa**: `metadata_10000_emoji` **~70×**, `metadata_5000` **~48×**.
- **Renderização memoizada**: `toMonetary` **~75×**, `toMermaid` **~44×**,
  `toLaTeX` **~39×**, `toUnicode` **~31×**, `toStringNumber`/`toScaledBigInt` **~40×**.
  A frio (`*_cold`) o Rust também ganha (LaTeX 4,6×, Mermaid 3,1×, Unicode 2×).
- **Parsing de racionais**: `rational_from` **~12×** (cache quente).
- **MessagePack** **~18×**; Protobuf 1,5×.
- **Motor de lotes / árvores**: `balanced_width_100` **~14×**,
  `batch_5000_mult` **~9,6×**, `hydra_50x3` **~9,9×**, `deep_tree_500` **~6,5×**.
- **Parser**: `parse_chain_100` **~2,7×**, `lex_chain_100` **~3,6×**.
- **Canonicalização JSON (JCS)**: **~11×**.

**TypeScript mais rápido**

- **`supernova_primorial`** (0,51×): soma+elevação de primoriais até ~6 kbit. O
  Rust já fechou de 0,04× para 0,51× com o GCD híbrido + redução gcd-least; a
  diferença residual é a multiplicação/GCD nativos do V8.
- **`toSliceByRatio`** (~1,8×) e **`toSlice(100k)`** (~1,1×): próximos da paridade.

## Ressalvas

- **Variância**: microbenchmarks (`core/*`) variam ±50% entre execuções; os
  resultados de ordem de grandeza (assinatura, lotes, metadados, render) são
  estáveis.
- **Cache**: ambos os lados memoizam representações por instância de `Output`;
  o Rust também mantém um cache quente global de parsing (bounded, 256 entradas,
  só entradas ≤ 64 bytes) e valida os limites na leitura.
- **Diferenças de API**: o Rust não expõe `toLiveTrace` nem
  `fromExternalInstance`; as cargas de números gigantes usam `AstBuilder` para
  evitar a conversão decimal de um racional pré-computado. O workload
  `blackhole_roots` foi removido por não ser comparável (o builder TS associa
  potências à direita, computando um valor diferente).
- **Limites**: o Rust usa limites generosos para permitir as cargas do rascunho
  (o padrão do Rust é conservador: 1000 nós / profundidade 500).
- O rascunho TS é *referência de comportamento*, não uma base de código
  otimizada; números do TS incluem o overhead de async/Promise.
