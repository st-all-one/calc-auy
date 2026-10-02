# ADR-0002: Wire Format Rust-Native (snake_case)

## Status
Aceito

## Contexto
Não há obrigação de compatibilidade de wire com TypeScript. Seguimos o padrão Rust.

## Decisão
Formato oficial v1 com `snake_case`:
- `trace_version` obrigatório no topo
- `RationalValue` serializado como `{ n: String, d: String }` (strings decimais)
- Chaves de metadata ordenadas (`BTreeMap`) para determinismo

## Consequências
- Serialização determinística
- Sem ambiguidade de representação numérica
- Facilita assinatura canônica
