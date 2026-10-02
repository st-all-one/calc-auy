# E12 — i18n / NLG

> **Depende de**: [E07](./E07-saida.md).
> **Entrega**: realizers por idioma (SRL → linguagem natural).
> **Gate**: G12.

## Objetivo

Implementar a camada de **realização linguística** (não tradução chave-valor): a partir da SRL,
produzir linguagem natural adaptada a ordem, concordância, número, gênero e script de cada idioma.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T12.1 | code | Consolidar `Srl` (E07) e trait `VerbalRealizer`; tabelas de palavras-número como dados | T07.6 | SRL cobre todas as operações/rounding |
| T12.2 | code | Realizer `pt-BR` completo (ordem, "abre parênteses", gênero, vírgula decimal) | T12.1 | Snapshots `insta` |
| T12.3 | code | Realizers `en-US`, `en-EU`, `es-ES`, `fr-FR`, `de-DE` | T12.2 | Snapshots por locale |
| T12.4 | code | Realizers com reordenação forte: `ru-RU`, `zh-CN`, `ja-JP` | T12.3 | Snapshots; verificação de ordem |
| T12.5 | test | Propriedades de acessibilidade (sem perda semântica) + revisão de snapshots | T12.4 | `evidence/E12/T12.5.txt` |
| T12.6 | docs | Guia de extensão de idioma (dados + funções gramaticais) | T12.4 | Doc testável |

---

## Notas

- **ADR-011**: idiomas podem reordenar elementos; a gramática é código, o léxico é dado.
- A camada é plugável: `calc-auy-nlg` (trait/SRL) ← `calc-auy-i18n` (implementações).

## Gate G12 — critérios

- [ ] Locales com snapshots e ordem/concordância corretas.
- [ ] Extensão de idioma documentada.
- [ ] Evidência: `plan/evidence/G12.md`.

## Rastreabilidade

- **ADRs**: 011 (NLG).
- **Docs**: 15 (B6), 06.
