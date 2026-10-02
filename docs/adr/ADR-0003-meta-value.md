# ADR-0003: MetaValue sem f64

## Status
Aceito

## Contexto
O bug A7 (`serde_json::Value` não é `Eq`/`Hash`) e o risco A3 (f64 no domínio assinado) precisam de prevenção estrutural.

## Decisão
`MetaValue` é um enum sem variante de ponto flutuante:
- `Null`, `Bool`, `Int(i64)`, `Uint(u64)`, `Str(String)`, `Array`, `Object`
- Decimais devem ser representados como string ou racional
- `Deserialize` rejeita `f64` durante o streaming

## Consequências
- `MetaValue` é `Eq + Hash`
- Canonicalização trivial e determinística
- Impossível perder precisão silenciosamente
