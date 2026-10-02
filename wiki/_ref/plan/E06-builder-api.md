# E06 — Builder e Fachada de API

> **Depende de**: [E05](./E05-parser.md) e [E03](./E03-integridade.md).
> **Entrega**: typestate, fluent API, hibernate/hydrate, crate `calc-auy-api`.
> **Gate**: G6.

## Objetivo

Expor a superfície pública única (`calc-auy-api`) com **estados inválidos impossíveis**, ingestão
sem `f64` e persistência íntegra (hibernate/hydrate).

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T06.1 | code | Typestate `Calculation<Draft/Committed/Verified>` (PhantomData) | T04.3 | Métodos inválidos por estado não compilam (`trybuild`) |
| T06.2 | code | Fluent API: `from`, `add`, `sub`, `mul`, `div`, `pow`, `mod`, `div_int`, `group`, `set_metadata`, `cross_context_add` | T06.1 | Espelha a semântica do produto; doc tests |
| T06.3 | code | `IntoRational` selado (i64/u64/i128/u128/BigInt/&str/Rational) — **sem `f64`** | T06.2 | `f64` não compila; teste `trybuild` |
| T06.4 | code | `hibernate`/`hydrate` com verificação de custódia e limites | T06.2 | Roundtrip íntegro; adulteração rejeitada |
| T06.5 | code | Crate `calc-auy-api`: re-exports, config de instância (`salt`, `encoder`, `round_strategy`, `context_label`), erros | T06.3 | API estável; doc de uso |
| T06.6 | test | Integração end-to-end (build → commit → sign → verify → hydrate) | T06.5 | `evidence/E06/T06.6.txt` |
| T06.7 | bench | Custo do builder (construção de AST por N operações) | T06.2 | `evidence/E06/T06.7.bench.json` |

---

## Notas

- **Prevenção (A2/E1)**: typestate + trait selado eliminam o uso incorreto em tempo de compilação.
- A fachada é a **única** superfície pública; CLI (E10) e WASM (E09) dependem dela.

## Gate G6 — critérios

- [ ] Typestate completo e verificado por `trybuild`.
- [ ] `f64` barrado na ingestão.
- [ ] Hibernate/hydrate íntegro.
- [ ] Evidência: `plan/evidence/G6.md`.

## Rastreabilidade

- **ADRs**: 005, 007, 008 (topologia), 015.
- **Docs**: 02 (superado), 15 (A2).
