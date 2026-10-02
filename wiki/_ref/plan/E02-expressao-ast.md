# E02 — Expressão (AST)

> **Depende de**: [E01](./E01-nucleo-numerico.md).
> **Entrega**: `FlatAst` (arena), tipos de nó, flattening, serde com limites.
> **Gate**: G2.

## Objetivo

Representar o cálculo como uma **árvore de arrays** cache-friendly, com `Rational` tipado, nós
indexados por `NodeId` e limites aplicados na construção. A forma recursiva é apenas a projeção de
wire.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T02.1 | code | Enums `OperationType`, `RoundingStrategy` (`#[non_exhaustive]`, serde `snake_case`) + `NodeId(NonZeroU32)` | T01 | Serde roundtrip; `Option<NodeId>` com niche (assert de tamanho) |
| T02.2 | code | `FlatAst`: `Vec<NodeData>`, pool de filhos, `Arc<Metadata>`; acessores (`child`, `operands`, `kind`) | T02.1 | Testes de construção e travessia sequencial |
| T02.3 | code | `NodeData::{Literal(Rational), Operation, Group, Control}` com `SmallVec<[NodeId;4]>` | T02.2 | Sem heap até 4 operandos (bench de alloc) |
| T02.4 | code | Enforce de limites na construção: profundidade (`max_depth`), nós (`max_nodes`), operandos, bytes de metadata | T02.3 | Testes de rejeição nos limites (off-by-one) |
| T02.5 | code | **Flattening hierárquico** (`max_operands`) para cadeias de mesma operação | T02.4 | Profundidade O(log N) para N termos; teste com 100k operandos |
| T02.6 | code | Serialização wire: projeção recursiva + `Deserialize` com visitors de limite (streaming) | T02.3 | Roundtrip byte-estável; payload hostil rejeitado |
| T02.7 | test | Proptest de invariantes da arena (todo `NodeId` válido; ranges coerentes) | T02.6 | `evidence/E02/T02.7.txt` |
| T02.8 | bench | Travessia sequencial vs. árvore recursiva de referência (alocação/tempo) | T02.3 | `evidence/E02/T02.8.bench.json` |

---

## Notas

- **Prevenção (A2/A6)**: limites são invariantes de construção/deserialização; a AST nunca é
  construída inválida.
- **Arena (doc 15 B1)**: `Arc<FlatAst>` clona em O(1) — base para o motor de lotes (E08).
- **Metadata partilhada (doc 15 B3)**: `Arc<Metadata>` com `Arc::make_mut` na mutação.

## Gate G2 — critérios

- [ ] AST canônica e limitada; roundtrip de serde estável.
- [ ] Flattening com profundidade logarítmica comprovado.
- [ ] Travessia com localidade demonstrada em bench.
- [ ] Evidência: `plan/evidence/G2.md`.

## Rastreabilidade

- **ADRs**: 002 (wire), 006 (limites), 007 (tipos).
- **Docs**: 04 (superado), 15 (A1/B1/B3/C3).
