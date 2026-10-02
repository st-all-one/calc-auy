# ADR-0004: pow Racional — Raiz Enésima Exata ou Erro

## Status
Aceito

## Contexto
`(n/d)^(p/q)` é racional somente se `n` e `d` forem potências `q`-ésimas perfeitas.

## Decisão
- `pow_int` para expoentes inteiros (com orçamento de bits)
- Para `q > 1`: exige raiz `q`-ésima exata
- Base negativa só permitida se `q` for ímpar
- `0^0 = 1`, `0^n = 0` (n>0), `0^-n = DivisionByZero`

## Consequências
- Nunca computa `n^p` antes de verificar a raiz (evita explosão de bits)
- Retorna `IrrationalResult` quando a raiz não é exata
