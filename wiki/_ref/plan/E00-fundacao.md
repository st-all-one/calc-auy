# E00 — Fundação do Repositório

> **Depende de**: nada.
> **Entrega**: workspace, lints, CI, instrumentação, `Clock`, `Limits`, erros, `MetaValue`.
> **Gate**: [G0](./README.md#gates-de-qualidade-bloqueantes).

## Objetivo

Criar a base sobre a qual todo o restante será construído, de modo que **cada épico seguinte já
nasça instrumentado, rigoroso, determinístico e performático**. Nada de regra de negócio aqui.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T00.1 | scaffold | Criar workspace Cargo + `rust-toolchain.toml` (1.98, Edition 2024) + esqueletos dos crates (`core`, `parser`, `builder`, `output`, `i18n`, `processors`, `api`, `wasm`, `calc-auy`, `macros`, `nlg`, `xtask`) | — | `cargo check --workspace` verde; `evidence/E00/T00.1.txt` |
| T00.2 | ci | Configurar `[workspace.lints]`, `clippy.toml`, `rustfmt.toml`, `.cargo/config.toml` (doc 11, ADR-016); `[lints] workspace = true` em cada crate | T00.1 | `cargo clippy -- -D warnings` e `cargo fmt --check` verdes |
| T00.3 | ci | CI: `fmt`, `clippy`, `check`, `test`, `test --doc`, `nextest`, `cargo-deny`, `cargo-audit` | T00.2 | Pipeline verde; `deny.toml` com allowlist MPL/MIT/Apache/BSD e **deny LGPL** |
| T00.4 | code | `diag`: setup `tracing` + `tracing-subscriber`, features `max_level_off`/`release_max_level_off`, catálogo de eventos constantes, `fingerprint` (FNV-1a com fragmentos prefixados por tamanho), `redact` (chaves/valores sensíveis) | T00.2 | Testes de fingerprint determinístico e redação; `evidence/E00/T00.4.txt` |
| T00.5 | code | `Clock`: trait + `SystemClock` + `MockClock` (avanço por passo). Feature `deterministic` instala `MockClock` nos testes | T00.2 | Testes: mesma sequência → mesmos timestamps/UUIDs; `evidence/E00/T00.5.txt` |
| T00.6 | code | `Limits` (defaults do doc 11) + construtores com validação; `CalcAuyError` (`thiserror`, `Send + Sync`) + `ProblemDetails` (RFC 7807) + mapeamento; `instance` via `Clock` | T00.5 | Testes de mapeamento erro→problem; `instance` determinístico sob `MockClock` |
| T00.7 | code | `MetaValue` (sem `f64`, `Eq + Hash`) com `Deserialize` que impõe limites de bytes/nós/profundidade **durante** o streaming | T00.6 | Testes de rejeição de payloads hostis; `evidence/E00/T00.7.txt` |
| T00.8 | scaffold | `xtask` com subcomandos `ci`, `bench`, `tile-tune`, `corpus`, `schema` (stubs) | T00.1 | `cargo xtask ci` executa o pipeline |
| T00.9 | docs | Registro de ADRs (`docs/adr/ADR-0001…`) refletindo os docs 14/15 | T00.2 | ADRs commitadas e linkadas no README do plano |

---

## Notas

- A instrumentação usa `tracing` (ADR-015 / doc 15 B2); o catálogo de eventos permanece como
  constantes estáveis para consultas.
- `MetaValue` é a **prevenção estrutural** do bug A7 e do risco A3: sem `f64` no domínio assinado.
- O `MockClock` é obrigatório desde já para que nenhum teste futuro dependa de tempo real.

## Gate G0 — critérios

- [ ] Workspace compila com `clippy -D warnings` e `fmt --check`.
- [ ] CI completo (incl. `cargo-deny` e `cargo-audit`) verde.
- [ ] `fingerprint`, `redact`, `Clock`, `Limits`, `ProblemDetails`, `MetaValue` com testes.
- [ ] Nenhum `unwrap`/`panic`/`todo` no código de produção.
- [ ] Evidência: `plan/evidence/G0.md`.

## Rastreabilidade

- **ADRs**: 014 (Clock), 015 (erros), 016 (lints), 003 (MetaValue/canonical seam).
- **Docs**: 11 (preparação), 15 (B2/B4/C1/C2).
