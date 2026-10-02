# ADR-0001: Racional Híbrido Small/Large

## Status
Aceito

## Contexto
O CalcAUY precisa de aritmética exata com racionais. A representação deve ser eficiente para valores pequenos (caminho rápido) e suportar precisão arbitrária para valores grandes.

## Decisão
Usar um racional híbrido com duas representações:
- `Small { n: u64, d: u64 }` — caminho rápido, sem alocação
- `Large { n: BigInt, d: BigInt }` — precisão arbitrária

Invariantes (válidos em ambas as variantes):
- `d > 0` (denominador estritamente positivo)
- `gcd(n, d) == 1` (sempre irredutível)

## Consequências
- Operações `Add`, `Sub`, `Mul`, `Neg` são infalíveis (overflow promove para `Large`)
- `Div`, `Rem` retornam `Result` (impossível dividir por zero sem tratar)
- Testes de propriedade provam equivalência `Small == Large`
