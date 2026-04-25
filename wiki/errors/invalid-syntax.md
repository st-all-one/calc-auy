# Erro: `invalid-syntax` (400 Bad Request)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    App->>Calc: parseExpression("10 + * 5")
    activate Calc
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro de Sintaxe: invalid-syntax<br/>Expressão malformada no parser
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

O erro `invalid-syntax` ocorre quando a string fornecida à CalcAUY não pode ser interpretada matematicamente.
 O Parser de Descida Recursiva falha ao tentar construir uma Árvore de Sintaxe Abstrata (AST) devido a violações gramaticais ou caracteres inesperados.

## 🛠️ Como ocorre
1. **Operadores Adjacentes:** Uso de múltiplos operadores sem operandos entre eles (ex: `10 + * 5`).
2. **Parênteses Desbalanceados:** Abrir um grupo e não fechá-lo, ou vice-versa.
3. **Caracteres Inválidos:** Inclusão de letras, símbolos de moeda ou caracteres especiais não suportados no meio da expressão.

## 💻 Exemplos de Código

### Exemplo 1: Operadores sem operandos
```typescript
// Lança invalid-syntax: o parser espera um número após o '+'
const calc = CalcAUY.parseExpression("10 + / 5");
```

### Exemplo 2: Grupos incompletos
```typescript
// Lança invalid-syntax: parêntese não fechado
const calc = CalcAUY.parseExpression("(10 + 5 * 2");
```

### Exemplo 3: Sujeira na string
```typescript
// Lança invalid-syntax: o parser não sabe lidar com "R$" ou "total"
const calc = CalcAUY.from("R$ 10.50");
```

## ✅ O que fazer
- **Sanitização de Input:** Remova símbolos de moeda, espaços extras ou caracteres não numéricos antes de passar para a lib.
- **Validação Prévia:** Utilize Regex para garantir que a string contém apenas `0-9`, `.`, `_`, `+`, `-`, `*`, `/`, `^`, `(`, `)` e `%`.
- **Try/Catch no Parser:** Sempre envolva chamadas de `parseExpression` em blocos try/catch para lidar com inputs dinâmicos de usuários.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
A CalcAUY adota a filosofia de **Ambiguidade Zero**. Tentar "adivinhar" a intenção do usuário diante de uma sintaxe malformada (ex: transformar `10 ++ 5` em `10 + 5`) é perigoso em contextos financeiros.

Auto-correções ocultam bugs na camada de interface ou na lógica de negócio que gera as fórmulas. Se a biblioteca aceitasse expressões duvidosas, o rastro de auditoria (LaTeX/Verbal) não refletiria a entrada real, quebrando o princípio de **Não-Repúdio Técnico**. Por isso, exigimos que o input seja matematicamente perfeito antes de aceitá-lo na AST.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
