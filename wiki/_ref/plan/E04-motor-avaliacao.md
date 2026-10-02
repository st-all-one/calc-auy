# E04 — Motor de Avaliação

> **Depende de**: [E03](./E03-integridade.md).
> **Entrega**: avaliação iterativa, commit, memoização.
> **Gate**: G4.

## Objetivo

Colapsar a AST em um `Rational` de forma **iterativa** (sem recursão), com aplicação de operações
sem alocação desnecessária, aplicação de arredondamento e memoização opcional por conteúdo.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T04.1 | code | Avaliação pós-ordem iterativa sobre `FlatAst` (pilha de `NodeId` + pilha de valores) | T03.6 | Sem recursão; teste com profundidade no limite |
| T04.2 | code | Aplicação de operações com slices de operandos (sem `Vec` por operação) e acumuladores in-place | T04.1 | Bench sem alocação por operação |
| T04.3 | code | Pipeline de commit: `eval` → `rounding` → canônico; produz `Committed` | T04.2 | Teste end-to-end com assinatura |
| T04.4 | code | Orçamento de segurança durante a avaliação (bits/nós/depth) e erros tipados | T04.3 | Testes de DoS (bits, nós, profundidade) |
| T04.5 | code | Memoização por `value_hash` com cache limitado e escopo de sessão | T04.4 | Resultado idêntico com/sem cache; hit-rate medido |
| T04.6 | test | Oráculo de referência (avaliador recursivo simples) + proptest de equivalência | T04.1 | `evidence/E04/T04.6.txt` |
| T04.7 | bench | Eval por profundidade/nº de nós; overhead da memoização | T04.5 | `evidence/E04/T04.7.bench.json` |

---

## Notas

- **Prevenção (A4)**: memoização usa `value_hash` (ignora metadata), preservando a integridade
  (que usa `trace_hash`).
- **Determinismo**: a redução exata é associativa/comutativa — base para paralelismo em E08.

## Gate G4 — critérios

- [ ] Engine iterativo equivalente ao oráculo recursivo.
- [ ] Sem alocação no caminho quente de operação.
- [ ] Memoização opcional e correta.
- [ ] Evidência: `plan/evidence/G4.md`.

## Rastreabilidade

- **ADRs**: 005 (VerifiedAst), 010 (lotes — preparação), 015 (erros).
- **Docs**: 04 (superado), 15 (A4/D1).
