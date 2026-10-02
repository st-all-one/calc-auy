# ADR-012: WASM como Alvo de Primeira Classe

## Status
Aceito

## Contexto
WASM é alvo de alta prioridade.

## Decisão
- Crate `calc-auy-wasm` (`crate-type = ["cdylib", "rlib"]`)
- `Clock` implementado sobre `js_sys::Date::now()` e `web_sys`
- Números grandes trafegam como string
- Sem `rayon` por padrão

## Consequências
- Superfície JS gerada a partir de `calc-auy-api`
- Metas de tamanho medidas no CI
