# E08 — Lotes e Performance

> **Depende de**: [E07](./E07-saida.md).
> **Entrega**: motor de lotes SoA/tiles/multithread, `unsafe` A/B, PGO.
> **Gate**: G8.

## Objetivo

Explorar o vetor principal de performance extrema: **processar muitos cálculos em paralelo**,
mantendo o conjunto de trabalho na L1/L2, com resultados **determinísticos**. `unsafe`/SIMD só
entram com ganho comprovado.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T08.1 | code | `SmallBatch` em SoA (`Vec<u64>` numeradores/denominadores) + conversão de/para `FlatAst` | T07 | Igualdade com avaliação escalar |
| T08.2 | code | Tiling: `sum_tile`/`prod_tile` com redução exata; `xtask tile-tune` para dimensionar o tile | T08.1 | Parciais == resultado canônico; tile ótimo registrado |
| T08.3 | code | `eval_batch` com `rayon` (feature `parallel`), resultados **indexados** (determinismo) | T08.2 | Igual ao sequencial; escala ~linear (bench) |
| T08.4 | code | Paralelismo intra-operação para operandos longos (redução em árvore, exata) | T08.3 | Sem dependência de ordem (proptest) |
| T08.5 | code | Harness A/B `unsafe`: `core::simd`/`core::ticks` com gêmea `safe`, `// SAFETY:`, Miri; adoção só se ≥ limiar | T08.3 | Relatório A/B; `evidence/E08/T08.5.txt` |
| T08.6 | code | Alocação: arena por thread, `Vec::with_capacity`, opção `tikv-jemallocator`/`mimalloc`; checagem de *false sharing* | T08.3 | Bench antes/depois |
| T08.7 | code | PGO/BOLT para o binário; `-C target-cpu=native` só no bin | T08.6 | Ganho medido; scripts em `xtask` |
| T08.8 | bench | Curvas de escala (1..N núcleos), latência p50/p99.9, trabalho por tile vs. L1/L2 | T08.3 | `evidence/E08/T08.8.bench.json` |

---

## Notas

- **Determinismo exato (ADR-010)**: como a aritmética racional é exata, a redução paralela é
  associativa/comutativa — propriedade exclusiva de tipos exatos.
- **`unsafe` sob contrato (ADR-009)**: confinado, com fallback safe e teste diferencial.

## Gate G8 — critérios

- [ ] Lotes idênticos ao escalar e determinísticos.
- [ ] Escala demonstrada com núcleos.
- [ ] `unsafe` justificado por A/B e Miri.
- [ ] Orçamentos de performance por camada atendidos (ou justificados).
- [ ] Evidência: `plan/evidence/G8.md`.

## Rastreabilidade

- **ADRs**: 009 (unsafe), 010 (lotes).
- **Docs**: 10, 12, brainstorm 01/02.
