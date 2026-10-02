# ADR-014: Port Clock e Determinismo

## Status
Aceito

## Contexto
Testes devem ser determinísticos e não depender de tempo real.

## Decisão
- Trait `Clock` com `now_rfc3339()` e `next_uuid_v7()`
- `SystemClock` para produção
- `MockClock` para testes (avança por passo)
- Payload assinado não contém tempo nem aleatoriedade

## Consequências
- Testes reprodutíveis
- `instance` de erro usa o `Clock`
- Feature `deterministic` instala `MockClock` nos testes
