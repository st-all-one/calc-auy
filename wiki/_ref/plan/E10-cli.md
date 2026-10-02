# E10 — CLI (Binário `calc-auy`)

> **Depende de**: [E08](./E08-lotes-performance.md) e [E09](./E09-wasm.md).
> **Entrega**: binário final com CLI completa.
> **Gate**: G10.

## Objetivo

Entregar o **binário oficial** `calc-auy` com tudo embutido, incluindo processamento em lote por
streaming com backpressure e ordem preservada.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T10.1 | scaffold | Crate `calc-auy` (`[[bin]]`), `clap` derive; subcomandos `commit`, `hydrate`, `verify`, `sign`, `format`, `batch`, `repl`, `schema` | T09 | `calc-auy --help`; testes de CLI (`assert_cmd`) |
| T10.2 | code | Erros do CLI com `anyhow` + `.context`; render de `ProblemDetails` (JSON e legível); `exit codes` na borda | T10.1 | Testes de exit code e formato |
| T10.3 | code | `batch` NDJSON em streaming: produtor → canal **bounded** → pool `rayon` → coletor **ordenado** → escritor | T10.2 | Ordem preservada; memória limitada sob 10⁶ linhas |
| T10.4 | code | Config por arquivo/env (com `Clock` real); `--deterministic` usa `MockClock` | T10.2 | Testes de config e determinismo |
| T10.5 | docs | `man`/completions (clap); README de uso | T10.1 | Artefatos gerados |

---

## Notas

- **`panic = "abort"` só no binário** (doc 15 E1).
- O CLI é uma casca fina sobre `calc-auy-api`; nenhuma lógica de negócio duplicada.

## Gate G10 — critérios

- [ ] CLI completa e testada.
- [ ] `batch` determinístico, ordenado e com memória limitada.
- [ ] Evidência: `plan/evidence/G10.md`.

## Rastreabilidade

- **ADRs**: 008 (bin é CLI), 010 (lotes), 015 (erros).
- **Docs**: 15 (B4/D3).
