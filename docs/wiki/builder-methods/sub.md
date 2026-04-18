# Método: `sub()`

O método `sub()` anexa uma operação de subtração à Árvore de Sintaxe Abstrata (AST). Ele representa a redução do valor atual por um operando, suportando a dedução de sub-árvores complexas e a gestão de saldos negativos com precisão racional.

## ⚙️ Funcionamento Interno

1.  **Isolamento de Subtraendo:** Ao subtrair uma instância de `CalcAUY`, o builder aplica um `group()` automático para garantir que a inversão do sinal não corrompa a precedência interna da sub-fórmula.
2.  **Representação Algébrica:** Matematicamente, $A - B$ é tratado pela engine como $A + (-B)$, onde o numerador do racional $B$ é invertido. Isso mantém a consistência em operações encadeadas.
3.  **Preservação de Sinal:** A CalcAUY não trunca valores negativos automaticamente. Um resultado negativo permanece como uma fração de numerador negativo, sendo formatado corretamente apenas no output final.

## 🎯 Propósito
Aplicar deduções, estornos, descontos progressivos e calcular margens de erro ou variações (Deltas) entre estados.

## 💼 10 Casos de Uso Reais (Arquitetura de Dedução)

1.  **Dedução de Sub-Expressão de Impostos:** Subtrair o resultado de um cálculo de tributo aninhado.
```typescript
// Exemplo 1: Líquido = Bruto - (Bruto * Taxa)
const net = CalcAUY.from(gross).sub(CalcAUY.from(gross).mult(tax).group());
```
```typescript
// Exemplo 2: Saldo = Total - (Soma de Deduções)
const balance = total.sub(d1.add(d2).add(d3).group());
```

2.  **Cálculo de Delta Percentual:** $(V_{atual} - V_{anterior}) / V_{anterior}$.
```typescript
// Exemplo 1: Crescimento nominal
const delta = CalcAUY.from(current).sub(previous).group().div(previous);
```
```typescript
// Exemplo 2: Margem de erro relativa
const error = real.sub(expected).group().div(expected);
```

3.  **Gestão de Saldo de Crédito com Reserva:** Subtrair o usado e uma reserva técnica.
```typescript
// Exemplo 1: Disponível = Limite - (Gasto + Reserva)
const avail = limit.sub(spent.add(reserve).group());
```
```typescript
// Exemplo 2: Saldo após múltiplas baixas
const final = current.sub(loss1).sub(loss2).sub(CalcAUY.from(loss3).mult(1.1).group());
```

4.  **Dedução de Potência (Depreciação):** Subtrair o valor depreciado acumulado.
```typescript
// Exemplo 1: Atual = Original - (Original * (1 - fator^tempo))
const val = orig.sub(orig.mult(CalcAUY.from(1).sub(f.pow(t)).group()).group());
```
```typescript
// Exemplo 2: Redução por escala logarítmica
const adj = base.sub(CalcAUY.from(10).pow(scale).group());
```

5.  **Estorno de Operação Composta:** Subtrair uma sub-árvore que representa um lote cancelado.
```typescript
// Exemplo 1: Global - (Lote * Preço_Unitário)
const current = global.sub(CalcAUY.from(qty).mult(price).group());
```
```typescript
// Exemplo 2: Reversão de juros aplicados
const clean = total.sub(principal.mult(rate).mult(time).group());
```

6.  **Cálculo de Spread Bancário:** Valor final menos o custo de aquisição.
```typescript
// Exemplo 1: Receita - Custo_Fixo - (Receita * Variavel)
const profit = rev.sub(fixed).sub(CalcAUY.from(rev).mult(varRate).group());
```
```typescript
// Exemplo 2: Lucro após impostos retidos
const final = gross.sub(irrf).sub(csll).sub(pispasep);
```

7.  **Ajuste de Cota de Participação:** Subtrair a quota de terceiros do total.
```typescript
// Exemplo 1: Meu_Lucro = Total - (Total * Quota_Socio)
const mine = total.sub(total.mult(partnerRatio).group());
```
```typescript
// Exemplo 2: Divisão de prêmio com desconto de taxa
const netPrize = prize.sub(CalcAUY.from(prize).mult(platformFee).group());
```

8.  **Cálculo de Distância Euclidiana (Termo):** Isolar o quadrado da diferença.
```typescript
// Exemplo 1: (x2 - x1)^2
const distSq = CalcAUY.from(x2).sub(x1).group().pow(2);
```
```typescript
// Exemplo 2: Raiz da diferença de áreas
const diff = a1.sub(a2).group().pow(0.5);
```

9.  **Lógica de "Grace Period" (Carência):** Subtrair tempo ou valor de carência.
```typescript
// Exemplo 1: Dias_Faturaveis = Total - Carencia
const billable = totalDays.sub(graceDays).group().mult(dailyRate);
```
```typescript
// Exemplo 2: Valor com isenção parcial
const toPay = total.sub(exemptionAmount);
```

10. **Sanitização de Resíduos de Batch:** Remover centavos excedentes calculados.
```typescript
// Exemplo 1: Valor - (Rateio * Partes)
const residue = total.sub(CalcAUY.from(slice).mult(parts).group());
```
```typescript
// Exemplo 2: Ajuste de precisão em dízimas
const corrected = val.sub("1/1000000000");
```

## 🛠️ Opções Permitidas
- `value`: `InputValue` (`string | number | bigint | CalcAUY`).

## 🏗️ Anotações de Engenharia
- **Underflow Imune:** Diferente de tipos `unsigned`, a CalcAUY lida com números negativos de magnitude arbitrária.
- **Rastro Forense:** O `sub()` preserva o `originalInput` do valor subtraído. Se você subtrair `CalcAUY.from("10.00")`, o LaTeX exibirá exatamente `- 10.00`, mantendo a clareza da auditoria sobre o que foi deduzido.
- **Performance:** Subtrações sucessivas não degradam a performance, pois são apenas nós adicionais na AST. O custo de processamento é linear ao número de nós no momento do `commit()`.
