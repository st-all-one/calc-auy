# Método: `pow()`

O método `pow()` anexa uma operação de potenciação à Árvore de Sintaxe Abstrata (AST). Ele suporta tanto expoentes inteiros (potência tradicional) quanto fracionários (raízes), utilizando a precisão interna de 50 casas decimais quando necessário.

## ⚙️ Funcionamento Interno

1.  **Análise do Expoente:** O expoente pode ser qualquer `InputValue`.
2.  **Associatividade à Direita:** A CalcAUY segue o rigor matemático para torres de potência. Ex: `x.pow(y).pow(z)` é avaliado como $x^{(y^z)}$.
3.  **Algoritmo de Exponenciação Rápida:** Para expoentes inteiros positivos, utiliza o algoritmo *Square-and-Multiply*, que é extremamente eficiente ($O(\log n)$).
4.  **Raízes (Expoente Fracionário):** Quando o expoente não é um inteiro (ex: `0.5` ou `1/2`), a engine aciona o cálculo de raiz enésima via Método de Newton, operando com a constante de escala de $10^{50}$ para garantir a precisão interna.
5.  **Imutabilidade:** Retorna uma nova instância com o nó `pow` anexado.

## 🎯 Propósito
Calcular juros compostos, amortizações, fórmulas de física, estatística e extração de raízes quadradas ou cúbicas.

## 💼 10 Casos de Uso Reais

1.  **Juros Compostos (Fórmula de Montante):** $M = P * (1 + i)^n$.
```typescript
// Exemplo 1: Capitalização de 12 meses a 1%
const m = principal.mult(CalcAUY.from("1.01").pow(12));
```
```typescript
// Exemplo 2: Cálculo de taxa efetiva anual
const effective = CalcAUY.from(1).add(monthlyRate).group().pow(12).sub(1);
```

2.  **Cálculo de Valor Presente (Desconto Composto):** Trazer valor futuro ao presente.
```typescript
// Exemplo 1: VP = VF / (1 + i)^n
const vp = vf.div(CalcAUY.from(1).add(rate).group().pow(time));
```
```typescript
// Exemplo 2: Fluxo de caixa descontado
const presentValue = futureValue.mult(CalcAUY.from(1).add(wacc).group().pow(-time));
```

3.  **Extração de Raiz Quadrada:** Elevar à potência de $0.5$ ou $1/2$.
```typescript
// Exemplo 1: Raiz quadrada de 16
const root = CalcAUY.from(16).pow("0.5");
```
```typescript
// Exemplo 2: Lado de um quadrado a partir da área
const side = CalcAUY.from(area).pow("1/2");
```

4.  **Cálculo de Desvio Padrão:** Elevar diferenças ao quadrado.
```typescript
// Exemplo 1: Variância parcial
const variance = diff.pow(2);
```
```typescript
// Exemplo 2: Norma euclidiana (Pitágoras)
const dist = a.pow(2).add(b.pow(2)).group().pow(0.5);
```

5.  **Depreciação Acelerada:** Cálculo de perda de valor de ativos.
```typescript
// Exemplo 1: Depreciação de 20% ao ano
const value = original.mult(CalcAUY.from("0.80").pow(years));
```
```typescript
// Exemplo 2: Valor residual de hardware
const residual = initial.mult(CalcAUY.from("0.5").pow(ageInHalfYears));
```

6.  **Progressões Geométricas:** Fórmulas de crescimento populacional ou de dados.
```typescript
// Exemplo 1: Crescimento de base de usuários
const futureUsers = current.mult(growthFactor.pow(months));
```
```typescript
// Exemplo 2: Lei de Moore (dobro a cada 2 anos)
const performance = initial.mult(CalcAUY.from(2).pow(years.div(2)));
```

7.  **Extração de Raiz Cúbica:** Calcular dimensões volumétricas.
```typescript
// Exemplo 1: Aresta de um cubo
const edge = CalcAUY.from(volume).pow("1/3");
```
```typescript
// Exemplo 2: Raiz cúbica para proporções 3D
const scale = ratio.pow("0.3333333333333333");
```

8.  **Modelagem de Risco (VaR):** Fórmulas de volatilidade de ativos.
```typescript
// Exemplo 1: Escalonamento de volatilidade temporal
const volTime = dailyVol.mult(CalcAUY.from(days).pow(0.5));
```
```typescript
// Exemplo 2: Coeficiente de correlação quadrática
const r2 = correlation.pow(2);
```

9.  **Fórmulas de Física e Engenharia:** Fórmulas de energia ou carga.
```typescript
// Exemplo 1: Energia cinética (1/2 * m * v^2)
const energy = mass.mult(velocity.pow(2)).div(2);
```
```typescript
// Exemplo 2: Queda de tensão por distância ao quadrado
const drop = source.div(distance.pow(2));
```

10. **Conversão de Escala Logarítmica (Simulada):** Aproximações de potências base 10.
```typescript
// Exemplo 1: Magnitude Richter (aproximada)
const intensity = CalcAUY.from(10).pow(mag);
```
```typescript
// Exemplo 2: Decibéis para amplitude
const amplitude = CalcAUY.from(10).pow(db.div(20));
```

## 🛠️ Opções Permitidas

- `value`: `InputValue` (O expoente).

## 🏗️ Anotações de Engenharia
- **Desempenho de Newton:** O cálculo de raízes (`pow` com frações) é a operação mais custosa da engine. Ele é otimizado via **Intelligent Cache**, evitando re-cálculos de raízes comuns (como $\sqrt{2}$ ou $\sqrt{3}$).
- **Precisão de 50 casas:** A CalcAUY não utiliza `Math.pow()` para evitar a imprecisão binária. Toda a exponenciação é feita em aritmética de inteiros escalados.
- **Expoentes Negativos:** São suportados nativamente, transformando $x^{-y}$ em $1 / x^y$ na lógica racional.
