# Método: `div()`

O método `div()` anexa uma operação de divisão racional à Árvore de Sintaxe Abstrata (AST). É a funcionalidade que define a alma da CalcAUY, permitindo divisões complexas sem a contaminação por dízimas periódicas prematuras.

## ⚙️ Funcionamento Interno

1.  **Divisão por Multiplicação Inversa:** Dividir por $n/d$ é matematicamente equivalente a multiplicar por $d/n$. O motor da CalcAUY utiliza esta inversão para manter a árvore como uma série de multiplicações racionais simplificadas.
2.  **Proteção de Runtime:** Valida o divisor em tempo de construção. Se um literal `0` for detectado, um `CalcAUYError` é lançado imediatamente.
3.  **Preservação Racional:** Ao dividir `10` por `3`, a biblioteca armazena exatamente a fração $10/3$. Nenhuma aproximação decimal é feita até o momento do output final, eliminando erros de truncamento em cálculos em cadeia.
4.  **Auto-Agrupamento do Divisor:** O divisor é automaticamente envolvido em um `GroupNode` se for uma instância de `CalcAUY` com operações de menor precedência, protegendo a integridade da divisão.

## 🎯 Propósito
Unitarizar preços, calcular médias, realizar conversões de ativos e distribuir montantes de forma proporcional.

## 💼 10 Casos de Uso Reais (Engenharia de Proporção)

1.  **Divisão por Sub-Fórmula de Quantidade:** Dividir um total pelo resultado de uma soma aninhada.
```typescript
// Exemplo 1: Total / (Qtd_A + Qtd_B)
const unit = total.div(CalcAUY.from(qtyA).add(qtyB).group());
```
```typescript
// Exemplo 2: Preço_Medio = Receita / (Vendidos + Brindes)
const avg = rev.div(sold.add(gifts).group());
```

2.  **Unitarização de Custo Industrial:** Dividir custo bruto por pack e unidades.
```typescript
// Exemplo 1: Custo / (12 * 500g)
const costPerGram = bruteCost.div(CalcAUY.from(12).mult(500).group());
```
```typescript
// Exemplo 2: Custo por comprimido em lote
const pillCost = batchCost.div(CalcAUY.from(blisters).mult(pillsPerBlister).group());
```

3.  **Cálculo de Proporção Relativa:** Valor / Soma_Total.
```typescript
// Exemplo 1: Participação de mercado
const marketShare = myRev.div(totalMarketRev.add(myRev).group());
```
```typescript
// Exemplo 2: Peso atômico em molécula
const weight = elementMass.div(totalMoleculeMass);
```

4.  **Inversão de Conversão de Moeda:** Local / (Taxa * (1 + Spread)).
```typescript
// Exemplo 1: Quantos dólares eu compro?
const usd = brl.div(CalcAUY.from(rate).mult("1.02").group());
```
```typescript
// Exemplo 2: Retorno de cota de fundo
const back = currentBalance.div(initialQuotaValue);
```

5.  **Cálculo de Média Ponderada Complexa:** (Σ val*peso) / Σ pesos.
```typescript
// Exemplo 1: Média de notas com pesos variados
const final = val1.mult(2).add(val2.mult(3)).group().div(CalcAUY.from(2).add(3).group());
```
```typescript
// Exemplo 2: Ticket médio ponderado por categoria
const tkt = revenueNode.div(totalVolumeNode);
```

6.  **Cálculo de Velocidade Proporcional:** Distância / (Tempo_Base * Fator).
```typescript
// Exemplo 1: Km/h ajustado por tráfego
const speed = dist.div(CalcAUY.from(time).mult(trafficFactor).group());
```
```typescript
// Exemplo 2: Débito de banda por usuário
const mbps = totalBandwidth.div(CalcAUY.from(users).mult(concurrencyRate).group());
```

7.  **Redimensionamento de Ativos (Split/Reverse):** Divisão de valor unitário.
```typescript
// Exemplo 1: Grupamento de ações 10 para 1
const newPrice = oldPrice.div(0.1); // Multiplica por 10
```
```typescript
// Exemplo 2: Split de herança entre ramos familiares
const share = total.div(CalcAUY.from(branches).mult(heirsPerBranch).group());
```

8.  **Distribuição de Custos Fixos:** Custo / (Dias_Uteis / Horas).
```typescript
// Exemplo 1: Custo de servidor por minuto
const costMin = monthlyBill.div(CalcAUY.from(30).mult(1440).group());
```
```typescript
// Exemplo 2: Taxa de condomínio por fração ideal
const unitFee = totalExp.div(totalBuildingArea).mult(myArea);
```

9.  **Lógica de Eficiência Energética:** Output / (Input * Perda).
```typescript
// Exemplo 1: Eficiência de motor
const eff = usefulPower.div(totalPower.mult(lossFactor).group());
```
```typescript
// Exemplo 2: ROI ajustado por inflação
const roi = netProfit.div(initialInvest.mult(inflationIndex).group());
```

10. **Ajuste de Receita Industrial:** Massa / (Volume / Densidade).
```typescript
// Exemplo 1: Concentração de solução
const conc = solute.div(CalcAUY.from(vol).div(density).group());
```
```typescript
// Exemplo 2: Rendimento por hectare
const yield = totalHarvest.div(CalcAUY.from(area).mult(qualityFactor).group());
```

## 🛠️ Opções Permitidas
- `value`: `InputValue` (`string | number | bigint | CalcAUY`).

## 🏗️ Anotações de Engenharia
- **Dízimas Infinitas:** A CalcAUY é imune ao erro de $1/3 = 0.3333333333333333$. Ela mantém o objeto como a fração racional exata. O arredondamento só ocorre no `commit()`, garantindo que se você fizer `res.div(3).mult(3)`, o resultado será **exatamente 1**, e não `0.9999999999999999`.
- **Rastro Forense:** No output LaTeX, as divisões aninhadas são renderizadas como frações dentro de frações, preservando a hierarquia visual da fórmula.
- **Divisão Inteira vs Racional:** Use `div()` para manter a precisão total. Use `divInt()` apenas quando o negócio exigir explicitamente o descarte do resto (quociente).
