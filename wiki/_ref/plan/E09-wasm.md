# E09 — WASM

> **Depende de**: [E07](./E07-saida.md) e [E08](./E08-lotes-performance.md).
> **Entrega**: `calc-auy-wasm` publicável.
> **Gate**: G9.

## Objetivo

Distribuir a CalcAUY no ecossistema JS (JSR/npm) como `cdylib` wasm-bindgen, com a mesma superfície
da fachada e sem depender de threads.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T09.1 | scaffold | Crate `calc-auy-wasm` (`crate-type=["cdylib","rlib"]`), `wasm-bindgen`, `serde-wasm-bindgen` | T08 | `wasm-pack build` verde |
| T09.2 | code | `Clock` via `js_sys::Date`/`crypto.getRandomValues`; feature `parallel` desligada; `simd128` opcional | T09.1 | Testes wasm com `MockClock` no host |
| T09.3 | code | Bindings da fachada (commit/hydrate/verify/format); números grandes como `string` | T09.2 | Testes JS de roundtrip |
| T09.4 | ci | CI wasm: `wasm-pack test`, `wasm-opt -Oz`, budget de tamanho | T09.3 | Relatório de tamanho; `evidence/E09/T09.4.txt` |
| T09.5 | docs | Guia de uso JS + exemplo (equivalente ao quick-start) | T09.3 | Doc testável/publicável |

---

## Notas

- **ADR-012**: WASM é alvo de primeira classe, não "depois".
- No WASM, tempo/entropia vêm do host; o core permanece determinístico.

## Gate G9 — critérios

- [ ] WASM builda, testa e respeita o budget de tamanho.
- [ ] API JS espelha a fachada; big numbers como string.
- [ ] Evidência: `plan/evidence/G9.md`.

## Rastreabilidade

- **ADRs**: 012 (WASM), 014 (Clock).
- **Docs**: 15 (D5).
