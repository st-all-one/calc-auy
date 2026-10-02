# ADR-013: Schema Versionado e Evolução

## Status
Aceito

## Contexto
Todo artefato serializado carrega `trace_version`.

## Decisão
- `schema/` mantém JSON Schema + CDDL
- Processadores gerados de `schema/calc_auy.cddl`
- Adicionar campos é OK; renomear/remover exige *major*

## Consequências
- Política de evolução clara
- Funções de migração `migrate(vN -> vN+1)` com testes
