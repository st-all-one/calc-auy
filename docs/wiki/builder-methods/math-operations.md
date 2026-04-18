# Métodos: `mod()` e `divInt()`

Estes métodos anexam operações de aritmética inteira e modular à AST. Enquanto o restante da biblioteca foca na precisão racional infinita, o `mod()` e o `divInt()` lidam com a divisão euclidiana (quociente e resto).

---

## Método: `mod()` (Módulo / Resto)

Retorna o resto da divisão entre o valor atual e o divisor fornecido.

### ⚙️ Funcionamento Interno
1.  **Aritmética de Inteiros:** No momento do commit, a engine colapsa os operandos para inteiros (truncando se necessário) e aplica o operador `%` do BigInt.
2.  **Sinal do Resultado:** O sinal do resto segue o sinal do dividendo (comportamento padrão do JavaScript/Deno).

### 🎯 Propósito
Verificação de paridade, cálculos de ciclos (calendários), validação de dígitos verificadores (DV) e algoritmos de criptografia.

### 💼 Casos de Uso Reais
1.  **Validação de CPF/CNPJ:** Cálculo de pesos e restos base 11.
```typescript
// Exemplo 1: Resto base 11
const dv = soma.mod(11);
```
```typescript
// Exemplo 2: Verificação de paridade
const isEven = val.mod(2); // 0 se par, 1 se ímpar
```

2.  **Cálculo de Dias da Semana:** Determinar o deslocamento em um ciclo de 7 dias.
```typescript
// Exemplo 1: Dia futuro
const weekDay = daysElapsed.mod(7);
```
```typescript
// Exemplo 2: Ciclo de turnos de trabalho
const shift = currentDay.mod(numShifts);
```

---

## Método: `divInt()` (Divisão Inteira / Quociente)

Retorna a parte inteira (quociente) da divisão, descartando completamente o resto.

### ⚙️ Funcionamento Interno
1.  **Colapso Racional:** Executa a divisão BigInt $(n1 * d2) / (d1 * n2)$, que nativamente descarta a parte decimal no JavaScript para tipos `bigint`.
2.  **Diferença para `div()`:** O `div()` mantém o resto como uma fração; o `divInt()` o joga fora, transformando o resultado em um número inteiro (com denominador 1).

### 🎯 Propósito
Cálculo de quantidades discretas (itens que não podem ser fracionados), paginação e conversão de unidades de tempo.

### 💼 Casos de Uso Reais
1.  **Paginação de Resultados:** Determinar o número total de páginas.
```typescript
// Exemplo 1: Total de páginas (itens por página)
const pages = totalItems.divInt(itemsPerPage);
```
```typescript
// Exemplo 2: Salto de registros em lote
const offset = currentPage.mult(pageSize).divInt(1);
```

2.  **Conversão de Tempo (Horas/Minutos):** Extrair unidades inteiras de um total de segundos.
```typescript
// Exemplo 1: Horas inteiras em um total de minutos
const hours = totalMinutes.divInt(60);
```
```typescript
// Exemplo 2: Meses completos em um período de dias
const fullMonths = days.divInt(30);
```

## 🛠️ Opções Permitidas
- `value`: `InputValue` (O divisor).

## 🏗️ Anotações de Engenharia
- **Rigor Euclidiano:** Ambas as operações são realizadas utilizando as garantias de segurança do `BigInt`, suportando dividendos de proporções astronômicas sem estouro de pilha.
- **Representação Visual:** No LaTeX, o `divInt` é representado pelo símbolo `//` e o `mod` pelo símbolo `%`, diferenciando-os claramente da divisão racional clássica.
