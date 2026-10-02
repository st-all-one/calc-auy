# ADR-0006: Limites como Invariantes

## Status
Aceito

## Contexto
Prevenir DoS por payloads maliciosos ou expressões excessivamente complexas.

## Decisão
`Limits` com valores padrão do doc 11:
- `max_bits: 1_000_000`
- `max_depth: 500`
- `max_nodes: 1000`
- `max_operands: 100`
- `max_metadata_bytes: 16_384`

Limites aplicados dentro de construtores e desserializadores.

## Consequências
- Verificar na construção, nunca no call-site
- Hidratação nunca constrói AST inválida
