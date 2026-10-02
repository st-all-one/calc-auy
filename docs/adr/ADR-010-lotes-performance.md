# ADR-010: Motor de Execução em Lotes (SoA + Tiles + Multithread)

## Status
Aceito

## Contexto
Performance extrema com paralelismo exato e determinístico.

## Decisão
- Layout SoA para lotes pequenos (`SmallBatch { nums: Vec<u64>, dens: Vec<u64> }`)
- Tiling (L1/L2) com `SMALL_TILE = 1024`
- `rayon` para paralelismo entre cálculos
- Resultados indexados (não ordenados por conclusão) ⇒ determinismo

## Consequências
- Paralelismo é exato e independente de ordem
- Sem locks no caminho quente
- Trabalho por tile fica quente na L1/L2
