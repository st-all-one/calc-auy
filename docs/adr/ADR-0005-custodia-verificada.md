# ADR-0005: Custódia Verificada (Verified AST)

## Status
Aceito

## Contexto
Um `Control` não pode ser avaliado sem verificação de custódia.

## Decisão
- `VerifiedAst` só pode ser construído por `Ast::verify_custody`
- `eval` só aceita `&VerifiedAst`
- `cross_context_add` exige operandos `Control` verificados

## Consequências
- Impossível avaliar um `Control` sem checar a assinatura
- Padrão "parse, don't validate"
