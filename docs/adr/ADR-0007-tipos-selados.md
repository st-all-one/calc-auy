# ADR-0007: Tipos Selados e Aritmética Infalível

## Status
Aceito

## Contexto
Entrada sem `f64` e operadores que não podem falhar silenciosamente.

## Decisão
- Trait selado `IntoRational`: só tipos exatos podem virar `Rational`
- `f64`/`f32` NÃO implementam (erro de compilação)
- `Add`, `Sub`, `Mul`, `Neg`: infalíveis
- `Div`, `Rem`: apenas `checked_div`/`checked_rem` → `Result`

## Consequências
- Impossível perder precisão silenciosamente
- Impossível dividir por zero sem tratar
