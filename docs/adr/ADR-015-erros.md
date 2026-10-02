# ADR-015: Modelo de Erro (RFC 7807)

## Status
Aceito

## Contexto
Respostas de erro padronizadas para HTTP.

## Decisão
- `ProblemDetails` com `type`, `title`, `status`, `detail`, `instance`, `context`
- `CalcAuyError` com variantes tipadas
- Conversão `CalcAuyError -> ProblemDetails` centralizada

## Consequências
- CLI e WASM serializam `ProblemDetails`
- Erros `Send + Sync` para multithread
