# E13 — Hardening e Release

> **Depende de**: [E08](./E08-lotes-performance.md), [E09](./E09-wasm.md), [E10](./E10-cli.md),
> [E11](./E11-processors.md), [E12](./E12-i18n-nlg.md).
> **Entrega**: release oficial (crates.io, npm/JSR, binários, WASM).
> **Gate**: G13.

## Objetivo

Consolidar a **especificação executável** (corpus), endurecer com fuzzing/Miri/deny, provar os
orçamentos de performance e publicar a versão oficial.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T13.1 | test | Corpus de conformidade (vetores por regra: aritmética, rounding, pow, limites, custódia, canonical) no CI | E12 | `evidence/E13/T13.1.txt` |
| T13.2 | test | Differential fuzz de ponta a ponta vs. oráculo `Large`; soak/stress | T13.1 | Sem divergência; `evidence/E13/T13.2.txt` |
| T13.3 | ci | `cargo miri test`, `cargo-deny`, `cargo-audit`, `cargo-semver-checks`, coverage | T13.1 | Pipeline completo verde |
| T13.4 | docs | `rustdoc` sem warnings, mdBook do produto, exemplos executáveis, ADRs completos | T13.1 | `cargo doc` limpo |
| T13.5 | bench | Relatório final de benchmarks vs. orçamentos por camada | T13.2 | `evidence/E13/T13.5.bench.json` |
| T13.6 | release | Versionamento, changelog, hashes, licença MPL-2.0, publicação (crates.io/npm/JSR/binários) | T13.3 | Publicação verificada; `evidence/E13/T13.6.txt` |

---

## Notas

- **Semver** é checado automaticamente; `#[non_exhaustive]` protege a evolução.
- A publicação inclui o binário `calc-auy`, o pacote WASM e as crates de biblioteca.

## Gate G13 — critérios

- [ ] Corpus e fuzz verdes; Miri/deny/audit/semver verdes.
- [ ] Orçamentos de performance atendidos.
- [ ] Docs completos e publicados.
- [ ] Evidência: `plan/evidence/G13.md`.

## Rastreabilidade

- **ADRs**: todos.
- **Docs**: 09, 10, 13 (revisão), 15 (E).
