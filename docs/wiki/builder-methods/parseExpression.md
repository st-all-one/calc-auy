# Método: `parseExpression()` (Static)

O `parseExpression()` é o motor de inteligência léxica da CalcAUY. Ele converte strings contendo expressões matemáticas completas em uma Árvore de Sintaxe Abstrata (AST) válida, respeitando todas as regras de precedência.

## ⚙️ Funcionamento Interno

1.  **Lexer (Tokenização):** Quebra a string em unidades atômicas (números, operadores, parênteses, funções).
2.  **Parser de Descida Recursiva:** Constrói a hierarquia da árvore processando os tokens.
3.  **Precedência PEMDAS:**
    -   **P:** Parênteses (Nível máximo).
    -   **E:** Exponenciação (Associatividade à Direita).
    -   **MD:** Multiplicação/Divisão (Associatividade à Esquerda).
    -   **AS:** Adição/Subtração (Menor nível).
4.  **Auto-Agrupamento:** Expressões entre parênteses são automaticamente convertidas em `GroupNodes`.
5.  **Telemetria:** Monitorado por `TelemetrySpan` para identificar o custo computacional de expressões complexas.

## 🎯 Propósito
Permitir a definição de lógica de negócio complexa através de strings legíveis, facilitando a configuração de fórmulas por usuários ou administradores de sistema.

## 💼 10 Casos de Uso Reais

1.  **Fórmulas Configuráveis por Usuário:** Permitir que o cliente defina sua própria regra de markup.
```typescript
// Exemplo 1: Regra de preço dinâmica
const formula = "(custo + frete) * (1 + margem)";
const calc = CalcAUY.parseExpression(formula);
```
```typescript
// Exemplo 2: Cálculo de comissão variável
const commission = CalcAUY.parseExpression("venda * 0.05 + bonus");
```

2.  **Cálculo de Juros Compostos:** Implementação da fórmula de montante acumulado.
```typescript
// Exemplo 1: M = P * (1 + i) ^ n
const m = CalcAUY.parseExpression("1000 * (1 + 0.02) ^ 12");
```
```typescript
// Exemplo 2: Simulação de investimento mensal
const yield = CalcAUY.parseExpression("capital * (1.0085 ^ meses)");
```

3.  **Conversão de Unidades Complexas:** Transformação de escalas (ex: Fahrenheit para Celsius).
```typescript
// Exemplo 1: Fórmula de temperatura
const celsius = CalcAUY.parseExpression("(f - 32) * 5 / 9");
```
```typescript
// Exemplo 2: Conversão de Moeda com Spread
const convert = CalcAUY.parseExpression("valor * taxa * (1 - 0.0038)");
```

4.  **Rateio Proporcional:** Definição de pesos em string.
```typescript
// Exemplo 1: Peso ponderado
const weighted = CalcAUY.parseExpression("(a * 2 + b * 3) / 5");
```
```typescript
// Exemplo 2: Distribuição de lucro
const share = CalcAUY.parseExpression("total * (participacao / 100)");
```

5.  **Validação de Balanço:** Verificação de equações de equilíbrio.
```typescript
// Exemplo 1: Equação patrimonial
const equity = CalcAUY.parseExpression("ativos - passivos");
```
```typescript
// Exemplo 2: Verificação de margem bruta
const margin = CalcAUY.parseExpression("(venda - custo) / venda");
```

6.  **Cálculo de Áreas e Volumes:** Fórmulas geométricas para logística.
```typescript
// Exemplo 1: Volume de caixa
const vol = CalcAUY.parseExpression("altura * largura * profundidade");
```
```typescript
// Exemplo 2: Área de círculo (aproximada)
const area = CalcAUY.parseExpression("3.14159 * raio ^ 2");
```

7.  **Lógica de Engenharia Civil:** Fórmulas de carga e resistência.
```typescript
// Exemplo 1: Cálculo de tensão
const stress = CalcAUY.parseExpression("forca / area");
```
```typescript
// Exemplo 2: Coeficiente de dilatação
const expansion = CalcAUY.parseExpression("l0 * alpha * deltaT");
```

8.  **Sistemas de Ranking e Scores:** Atribuição de pontos em jogos ou avaliações.
```typescript
// Exemplo 1: Score de RPG
const score = CalcAUY.parseExpression("(str * 2 + dex * 1.5) / peso");
```
```typescript
// Exemplo 2: Ranking de crédito
const credit = CalcAUY.parseExpression("renda / (divida + 1) * historical_score");
```

9.  **Precificação de Derivativos:** Fórmulas simplificadas de opções.
```typescript
// Exemplo 1: Valor intrínseco
const intrinsic = CalcAUY.parseExpression("max(0, spot - strike)");
```
```typescript
// Exemplo 2: Cálculo de volatilidade implícita
const vol = CalcAUY.parseExpression("var * sqrt(tempo)");
```

10. **Engenharia de Dados:** Transformação de colunas em pipelines ETL.
```typescript
// Exemplo 1: Normalização de dados
const norm = CalcAUY.parseExpression("(x - min) / (max - min)");
```
```typescript
// Exemplo 2: Aplicação de fator de correção
const corrected = CalcAUY.parseExpression("raw * correction_factor");
```

## 🛠️ Opções Permitidas

- `expression`: `string` (A expressão matemática a ser parseada).

## 🏗️ Anotações de Engenharia
- **Robustez Lógica:** O parser é imune a ataques de injeção de código (XSS/RCE), pois ele apenas entende tokens matemáticos, nunca executando código JavaScript arbitrário.
- **Torre de Potência:** A CalcAUY é uma das poucas bibliotecas que respeita a associatividade à direita para potências (`2^3^2` = `2^9`), mantendo o rigor acadêmico.
- **Divisão Inteira:** Suporta o operador `//` para quociente inteiro diretamente na string.
