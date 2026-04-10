# Método: `CalcAUY.parseExpression()`

Permite converter strings contendo fórmulas matemáticas complexas diretamente em uma árvore de cálculo (AST) auditável.

## Assinatura
```ts
public static parseExpression(expression: string): CalcAUY
```

## Exemplos de Uso

### 1. Fórmulas Simples
O parser respeita a precedência matemática padrão (PEMDAS).
```ts
// 10 + 5 * 2 = 20 (Multiplicação antes da adição)
const calc = CalcAUY.parseExpression("10 + 5 * 2");
```

### 2. Uso de Parênteses
```ts
// (10 + 5) * 2 = 30
const calc = CalcAUY.parseExpression("(10 + 5) * 2");
```

### 3. Cenário Real: Cálculo Financeiro
```ts
const formula = "5000 * (1 + 0.02) ^ 12"; // Juros Compostos
const montante = CalcAUY.parseExpression(formula).commit();
```

## Diferenciais
- **Auto-Agrupamento:** Se você injetar uma expressão dentro de outra via API fluida, a biblioteca protege a integridade da fórmula com parênteses automáticos.
- **Rigor:** O Lexer valida cada caractere, impedindo injeções de sintaxe inválida.
