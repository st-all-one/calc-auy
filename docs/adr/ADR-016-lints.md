# ADR-016: Alinhamento aos Lints do Dia 0

## Status
Aceito

## Contexto
Rigor máximo de qualidade de código.

## Decisão
- `unsafe_code = "deny"` (exceto `core::simd`/`core::ticks`)
- `unwrap_used`, `expect_used`, `panic`, `todo`, `unimplemented` = "deny"
- `indexing_slicing` = "deny"
- `HashMap`/`HashSet` = "deny" (usar `BTreeMap`/`BTreeSet`)
- Rust 1.98 / Edition 2024

## Consequências
- Código seguro por construção
- Sem `unwrap`/`panic` em produção
- Determinismo garantido
