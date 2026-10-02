# E07 — Saída (Outputs)

> **Depende de**: [E06](./E06-builder-api.md).
> **Entrega**: formatos de saída + *seam* de NLG.
> **Gate**: G7.

## Objetivo

Traduzir o resultado selado em representações úteis (decimal, monetário, LaTeX, Unicode, Mermaid,
rateio, audit trace), com **snapshots** e sem bloquear a i18n completa (E12).

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T07.1 | code | `Output` sobre `Committed`: `to_string_decimal` (ciente do rounding), `to_scaled_bigint`, `to_raw` | T06.5 | Testes de precisão/escala |
| T07.2 | code | `to_monetary` com tabelas de locale/moeda (dados, não NLG) | T07.1 | Snapshots (`insta`) pt-BR/en-US |
| T07.3 | code | `to_latex`, `to_unicode` (subscritos), `to_mermaid_graph` | T07.1 | Snapshots por formato |
| T07.4 | code | `to_slice` (Maior Resto) e `to_slice_by_ratio` | T07.1 | Propriedade: soma dos rateios == total |
| T07.5 | code | `to_audit_trace` (JSON v1/v2) e `to_json` multi-formato | T07.1 | Snapshot + validação contra schema |
| T07.6 | code | Crate `calc-auy-nlg`: `Srl` (representação semântica) + trait `VerbalRealizer`; `to_verbal_a11y` ligado a um realizer padrão (pt-BR) | T07.1 | Seam definido; teste com SRL fixa |
| T07.7 | test | Snapshots `insta` de todos os outputs + doc tests | T07.6 | `evidence/E07/T07.7.txt` |

---

## Notas

- **Seam de NLG (ADR-011)**: a SRL e o trait nascem aqui; a implementação linguística completa fica
  em E12, sem bloquear os demais outputs.
- Todos os outputs dependem de `Committed`, nunca de estado não selado.

## Gate G7 — critérios

- [ ] Todos os formatos com snapshots estáveis.
- [ ] Rateio verificado por propriedade.
- [ ] `Srl` + `VerbalRealizer` definidos.
- [ ] Evidência: `plan/evidence/G7.md`.

## Rastreabilidade

- **ADRs**: 011 (NLG), 013 (schema).
- **Docs**: 06, 15 (A6/B6).
