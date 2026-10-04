# Changelog

Todas as mudanças relevantes do CalcAUY são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- **`calc-auy-render`**: motor puro sobre LaTeX com HTML (`KaTeX`, CSS
  auto-contido), SVG e PNG (`latex-rust`), com fontes/contexto carregados uma
  única vez (`OnceLock`) e instrumentação opcional (`diag`).
- **`calc-auy-output`**: feature `render` com `Output::to_html`/`to_svg`/
  `to_png`, e `Output::to_json_formats` (JSON multi-formato com `OutputKey`).
- **Paridade com o rascunho**: raízes fracionárias (`\sqrt`, `√`, `∛`, `∜`,
  `ⁿ√`) em LaTeX/Unicode/verbal; Mermaid completo (multi-contexto, agrupamento
  de ingestões, timestamps, PII, localizado em 9 locales); `to_raw_parts`;
  `to_slice_by_ratio_text` (razões `"5%"`); `OutputProcessor`/`to_custom_output`;
  processador de persistência; locales `en-EU`/`ru-RU`/`zh-CN`/`ja-JP` e moedas
  `RUB`/`CNY`/`JPY`; parâmetro `currency` na CLI; rótulos de arredondamento
  `NBR-5891`/`HALF-UP`.
- **CLI**: modos `json`, `html` e `svg` em `--params '{"mode":...}'`.
- **Benchmark Rust × TypeScript**: harness reproduzível (`bench/`) com 63
  cargas derivadas de todos os testes de `_REF/tests/`; evidência em
  `plan/evidence/bench/` (speedup geométrico global ~1,6× a favor do Rust).
- **Instrumentação**: corrigido o `diag` (`tracing::event!`) para compilar com
  a feature `instrument`; níveis passam a ser literais e o id do evento vira o
  campo `calc_auy_event`.

### Melhorado

- **Saída memoizada**: `Output` agora memoiza LaTeX, Unicode, Mermaid, monetário,
  rastro de auditoria, decimal efetivo, inteiro escalonado e a SRL por instância
  (`OnceLock`), espelhando o `#outputCache` do rascunho.
- **Cache quente de parsing**: `parse_rational` mantém um cache global bounded
  (`Mutex<BTreeMap>`, 256 entradas ≤ 64 bytes), validando os limites na leitura
  — espelha o `HOT_CACHE` do `RationalNumber`.
- **Orçamento de bits em `mul`**: o produto é rejeitado **antes** de ser
  computado quando a soma dos bits dos operandos excede `max_bits` (defesa
  contra `DoS` análoga à de `pow`).
- **Metadados O(1)**: `AstBuilder::insert_metadata` passou de O(n) por inserção
  (clone + recomputação do mapa inteiro) para O(log n + |valor|), com
  contabilidade incremental de bytes por nó.
- **GCD híbrido Stein/Lehmer/Half-GCD**: `gcd_bigint` saiu do Euclides
  clássico (com `%` de precisão total, ~8× mais lento) para um dispatcher
  medido — Stein até 4 kbit, Lehmer de 4 kbit a 200 kbit e Half-GCD algébrico
  (matrizes SL(2,ℤ)) acima disso. Estudo completo em `plan/evidence/gcd/`.
- **Redução de frações "gcd-least"**: `pow_int` não reduz (base irredutível),
  `add` usa `gcd(b,d)` em vez de `gcd(num, b·d)` e `mul` usa redução cruzada.
  `supernova_primorial` 11,7× e `primorial_sum_100` 7,4× mais rápidos.
- **Onda 1 do plano A/B** (`plan/AB-plan-otimizacoes.md`): rateio `toSlice` em
  aritmética inteira (**14×**), `OutputContext` preguiçoso/zero-copy (**12×** no
  `toCustomOutput`), memoização DAG no avaliador, colapso de operandos iguais
  na redução, fast path de potência de 2 e `format_fixed` com alocação única.
  Speedup global do benchmark **6,9× → 7,8×** (60 de 62 workloads).
- **Benchmark Rust × TypeScript** (`bench/`): as otimizações elevaram o
  speedup geométrico global de ~1,6× para ~7,8× (60 dos 62 workloads).

## [0.1.0] — 2024-01-01

Primeira versão oficial. Especificação executável (corpus), hardening e
release preparado.

### Adicionado

- **Núcleo numérico**: racional híbrido `Small`/`Large` com `gcd` exato,
  parsing determinístico e `RoundingStrategy` (NBR 5891, half-up, half-even,
  truncate, ceil, none).
- **AST em arena** (`FlatAst`), projeção *wire* com limites como invariantes.
- **Integridade**: `#[derive(Canonical)]`, BLAKE3 *keyed*, `SignaturePayload`
  (`trace_version`), cadeia de custódia (`chain_log`/`verify_log`).
- **Motor**: avaliador iterativo, `EvalCache`, `commit` assinado; `eval` exige
  `VerifiedAst`.
- **Parser** Pratt com desambiguação de `%` (pós-fixo vs. módulo).
- **Builder/API**: typestate `Draft → Committed → Verified` e fachada
  `CalcAuy`; ingestão sem `f64`.
- **Saída**: decimal, monetário, LaTeX, Unicode, Mermaid, rateio e rastro de
  auditoria.
- **Lotes/performance**: SoA, tiles, redução em árvore e `rayon` determinístico.
- **WASM**: bindings `WasmCalc` com relógio do host.
- **CLI `calc-auy`**: `BODY` posicional, `--params` JSON, `--batch` NDJSON,
  subcomandos `verify`/`hydrate`/`repl`/`schema`/`man`.
- **Processadores**: Protobuf, CBOR e MessagePack determinísticos a partir do
  schema versionado.
- **i18n/NLG**: SRL + `VerbalRealizer` para 9 idiomas.
- **Hardening**: corpus de conformidade, differential fuzzing vs. oráculo
  `BigInt`, `cargo-deny`, `cargo-audit`, rustdoc sem warnings e mdBook.

### Notas

- `publish = false` por política; a publicação em crates.io/npm/JSR é feita
  externamente com credenciais.
- Miri é **experimental e opcional** (não bloqueia o release).
- `cargo-fuzz`, `cargo-semver-checks` e `cargo-llvm-cov` não fazem parte do
  toolchain atual; differential/proptest e `cargo-deny` cobrem os mesmos
  riscos.

[0.1.0]: https://github.com/calc-auy/calc-auy/releases/tag/v0.1.0
