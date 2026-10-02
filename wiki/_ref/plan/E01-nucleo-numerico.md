# E01 — Núcleo Numérico

> **Depende de**: [E00](./E00-fundacao.md).
> **Entrega**: racional híbrido, backend numérico, GCD, `pow`, rounding, parse numérico.
> **Gate**: G1.

## Objetivo

Implementar a **aritmética exata** que é o coração do produto, com o caminho rápido `Small`
provado equivalente ao oráculo `Large`, e com baselines de performance registrados desde o início.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T01.1 | code | `Numeric` trait selado + backends `u64`, `u128`, `BigInt` com ops verificadas (`checked_add/mul` etc.) | T00 | Testes de overflow retornando `None`/promoção |
| T01.2 | code | Binary GCD branchless para `u64`/`u128` + `gcd` para `BigInt` | T01.1 | Igualdade com oráculo de Euclides em proptest; `bench` |
| T01.3 | code | `Rational` híbrido: `Repr::{Small,Large}`, invariantes (`d>0`, `gcd=1`), `ZERO`/`ONE` const, `from_i64/u64`, `new_checked(&Limits)` | T01.2 | Todos os construtores mantêm invariantes; `debug_assert!` presente |
| T01.4 | code | Aritmética: `Add`/`Sub`/`Mul`/`Neg` infalíveis (promoção), `Ord`, `Hash`; `checked_div`/`checked_rem` (sem `std::ops::Div`) | T01.3 | `Div`/`Rem` só via `checked_*`; testes de sinal e simplificação |
| T01.5 | code | `pow`: caminho inteiro com **orçamento de bits**; raiz enésima exata; `IrrationalResult`; casos `0^0`, negativos | T01.4 | Sem `todo!`; testes de borda; `evidence/E01/T01.5.txt` |
| T01.6 | code | Rounding: `Nbr5891`, `HalfUp`, `HalfEven`, `Truncate`, `Ceil`, `None` operando sobre `Rational` | T01.4 | Vetores-tabela por estratégia; testes de empate |
| T01.7 | code | Parse numérico exato: inteiro, decimal, `%`, fração `a/b`, notação científica, `_` separador | T01.4 | Sem `parse::<f64>`; testes por formato |
| T01.8 | test | Proptest de equivalência `Small == Large`; axiomas de corpo (comutatividade/associatividade/distributividade) | T01.4 | `evidence/E01/T01.8.txt` |
| T01.9 | bench | Baselines `criterion` + `cputicks` por operação (Small e Large) | T01.4 | `evidence/E01/T01.9.bench.json` |

---

## Notas

- **Prevenção (A1/A5)**: o oráculo `Large` é a especificação; `Small` nunca altera o resultado
  observável. Isso é testado, não documentado apenas.
- **Prevenção de overflow**: nenhuma operação trunca; overflow é sinal de promoção.
- **Sem `f64`**: o parse e a aritmética jamais usam ponto flutuante (trait selado em E06).

## Gate G1 — critérios

- [ ] `Rational` híbrido com equivalência provada (`small_e_large_concordam`).
- [ ] Limites de bits aplicados em `new_checked`/`pow`.
- [ ] Rounding com vetores por estratégia.
- [ ] Baselines de benchmark registrados.
- [ ] Evidência: `plan/evidence/G1.md`.

## Rastreabilidade

- **ADRs**: 001 (híbrido), 004 (pow), 006 (limites), 007 (tipos/ops).
- **Docs**: 03 (superado), 12, brainstorm 02/03/04.
