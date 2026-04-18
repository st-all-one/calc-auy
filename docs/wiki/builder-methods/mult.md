# Método: `mult()`

O método `mult()` anexa uma operação de multiplicação à Árvore de Sintaxe Abstrata (AST). É o operador central para escalonamento, aplicação de alíquotas complexas e capitalização, suportando a composição de sub-árvores multiplicativas com precisão BigInt absoluta.

## ⚙️ Funcionamento Interno

1.  **Multiplicação Racional:** Multiplicar $n1/d1$ por $n2/d2$ resulta em $(n1 * n2) / (d1 * d2)$. A engine utiliza a natureza ilimitada do `BigInt` para evitar o *overflow* que ocorreria com tipos de 64 bits em multiplicações sucessivas.
2.  **Precedência Alta:** O builder garante que a multiplicação seja agrupada antes de qualquer adição ou subtração adjacente (PEMDAS), a menos que o agrupamento manual seja definido.
3.  **Auto-Agrupamento:** Se você multiplicar uma instância de `CalcAUY` que contém somas, ela será automaticamente envolvida em parênteses. Ex: `10 * (2 + 3)`.
4.  **Imutabilidade:** Retorna uma nova instância com a árvore expandida pelo nó de operação `mul`.

## 🎯 Propósito
Escalar valores, aplicar taxas percentuais em cascata, calcular áreas/volumes e realizar capitalizações compostas.

## 💼 10 Casos de Uso Reais (Engenharia de Escalonamento)

1.  **Aplicação de Taxas em Cascata:** Multiplicar o resultado de um cálculo por múltiplos fatores.
```typescript
// Exemplo 1: Preço * Margem * Imposto
const final = CalcAUY.from(cost).mult("1.30").group().mult("1.18");
```
```typescript
// Exemplo 2: Escalonamento recursivo
const res = CalcAUY.from(100).mult(CalcAUY.from(1.1).mult(1.2).group());
```

2.  **Cálculo de Capitalização Discreta:** $(1 + i) * (1 + j) * (1 + k)$.
```typescript
// Exemplo 1: Acúmulo de inflação trimestral
const factor = CalcAUY.from("1.005").mult("1.008").mult("1.004");
```
```typescript
// Exemplo 2: Juros variáveis compostos
const total = principal.mult(rate1.mult(rate2).group());
```

3.  **Cálculo de Área com Fator de Perda:** (Base * Altura) * Coeficiente.
```typescript
// Exemplo 1: Área de piso com 10% de quebra
const needed = CalcAUY.from(l).mult(w).group().mult("1.10");
```
```typescript
// Exemplo 2: Volume de concreto com desperdício
const vol = areaNode.mult(depth).group().mult(1.05);
```

4.  **Escalonamento de Unidade Industrial:** Multiplicar pack por unidades e por peso.
```typescript
// Exemplo 1: 10 caixas * 12 unidades * 0.5kg
const weight = CalcAUY.from(10).mult(12).mult("0.5");
```
```typescript
// Exemplo 2: Carga total de pallets
const total = CalcAUY.from(pallets).mult(CalcAUY.from(rows).mult(cols).group());
```

5.  **Aplicação de Fator de Risco (Probabilidade):** Valor * Probabilidade * Impacto.
```typescript
// Exemplo 1: Perda esperada
const exposure = CalcAUY.from(totalValue).mult(prob).mult(impactFactor);
```
```typescript
// Exemplo 2: Ajuste de score por confiança
const score = raw.mult(CalcAUY.from(confidence).mult(0.9).group());
```

6.  **Conversão de Moeda com Spread:** Valor * (Taxa * (1 - Spread)).
```typescript
// Exemplo 1: Compra de Dólar
const brl = usd.mult(CalcAUY.from(rate).mult(CalcAUY.from(1).sub(spread).group()).group());
```
```typescript
// Exemplo 2: Câmbio com taxa fixa anexa
const total = amount.mult(rate).group().add(fee);
```

7.  **Cálculo de Potência Inteira Manual:** Multiplicação repetitiva (para fins didáticos ou específicos).
```typescript
// Exemplo 1: Cubo manual (x * x * x)
const cube = CalcAUY.from(x).mult(x).mult(x);
```
```typescript
// Exemplo 2: Quadrado de uma soma
const res = a.add(b).group().mult(a.add(b).group());
```

8.  **Normalização por Coeficiente:** Valor * (1 / Total).
```typescript
// Exemplo 1: Peso relativo
const weight = val.mult(CalcAUY.from(1).div(total).group());
```
```typescript
// Exemplo 2: Percentual de participação
const perc = part.mult(CalcAUY.from(100).div(global).group());
```

9.  **Lógica de Multas Progressivas:** Base * (Dias * Fator_Diario).
```typescript
// Exemplo 1: Multa por atraso faturado
const penalty = base.mult(CalcAUY.from(days).mult("0.0033").group());
```
```typescript
// Exemplo 2: Taxa de custódia pro-rata
const fee = val.mult(CalcAUY.from(rate).div(360).group()).mult(days);
```

10. **Ajuste de Magnitude de Dízima:** Multiplicar por frações para isolar numeradores.
```typescript
// Exemplo 1: (10 / 3) * 3 = 10
const res = CalcAUY.from(10).div(3).group().mult(3);
```
```typescript
// Exemplo 2: Reversão de divisão racional
const back = val.mult(divisor);
```

## 🛠️ Opções Permitidas
- `value`: `InputValue` (`string | number | bigint | CalcAUY`).

## 🏗️ Anotações de Engenharia
- **Precisão IEEE 754 vs CalcAUY:** Em JS, `0.1 * 0.2` é `0.020000000000000004`. Na CalcAUY, o resultado interno é a fração exata $2/100$, garantindo que após 1 milhão de multiplicações, o erro acumulado seja rigorosamente **zero**.
- **Gestão de BigInt:** Multiplicar numeradores pode gerar números de milhares de dígitos. A CalcAUY gerencia isso via **Hot Caches** e simplificação MDC automática para manter a memória sob controle.
- **Rastro em LaTeX:** Renderizado com o ponto médio `\cdot` ou adjacência, seguindo as normas de publicação científica.
