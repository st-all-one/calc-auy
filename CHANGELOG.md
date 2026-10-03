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
- **CLI**: modos `json`, `html` e `svg` em `--params '{"mode":...}'`.
- **Instrumentação**: corrigido o `diag` (`tracing::event!`) para compilar com
  a feature `instrument`; níveis passam a ser literais e o id do evento vira o
  campo `calc_auy_event`.

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
