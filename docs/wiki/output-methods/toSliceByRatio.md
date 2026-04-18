# Método: `toSliceByRatio()`

O `toSliceByRatio()` divide o valor total baseado em um array de proporções (pesos), garantindo a integridade da soma total através da distribuição inteligente de arredondamentos residuais.

## ⚙️ Funcionamento Interno

1.  **Normalização de Pesos:** Converte todas as proporções (porcentagens, decimais ou frações) para uma base comum.
2.  **Cálculo Proporcional:** Aplica cada peso sobre o valor total escalado (centavos).
3.  **Algoritmo de Maiores Restos:** Calcula o erro de arredondamento de cada fatia e ordena os restos. Os centavos excedentes são distribuídos para as fatias que tiveram os maiores restos decimais, garantindo a maior justiça estatística possível.
4.  **Reconstrução Decimal:** Retorna o array de strings formatadas com a precisão desejada.

## 🎯 Propósito
Realizar rateios complexos e desiguais (ex: impostos, royalties, comissões) onde as partes possuem participações diferentes, mas o total deve bater exatamente.

## 💼 10 Casos de Uso Reais

1.  **Split de Pagamento (Marketplace):** Enviar 80% para o vendedor, 15% para a plataforma e 5% para o gateway.
```typescript
// Exemplo 1: Rateio fixo de marketplace
const split = res.toSliceByRatio(["80%", "15%", "5%"]);
```
```typescript
// Exemplo 2: Split dinâmico baseado em contrato
const splitVal = output.toSliceByRatio([sellerFee, platformFee, gatewayFee]);
```

2.  **Cálculo de Impostos:** Divisão de um tributo entre esferas Federal (60%), Estadual (30%) e Municipal (10%).
```typescript
// Exemplo 1: Rateio de ICMS/IPI
const taxes = res.toSliceByRatio([0.6, 0.3, 0.1]);
```
```typescript
// Exemplo 2: Divisão de Simples Nacional
const taxSplit = output.toSliceByRatio(taxConfig.weights);
```

3.  **Distribuição de Royalties:** Pagamento de artistas baseado em suas quotas de participação na obra.
```typescript
// Exemplo 1: Royalties de composição (33.33% para cada)
const royalties = res.toSliceByRatio(["33.33%", "33.33%", "33.34%"]);
```
```typescript
// Exemplo 2: Participação minoritária
const payout = output.toSliceByRatio([0.9, 0.1]);
```

4.  **Rateio de Frete:** Dividir o custo do caminhão proporcionalmente ao peso/valor de cada mercadoria.
```typescript
// Exemplo 1: Frete por peso (kg)
const shipping = res.toSliceByRatio([10.5, 20.0, 5.0]);
```
```typescript
// Exemplo 2: Rateio por valor da NF
const perItemShipping = output.toSliceByRatio(invoiceAmounts);
```

5.  **Aportes de Investimento:** Divisão de um aporte entre diferentes ativos de uma carteira.
```typescript
// Exemplo 1: Rebalanceamento de carteira
const rebalance = res.toSliceByRatio(["50%", "25%", "25%"]);
```
```typescript
// Exemplo 2: Aporte em fundo multi-mercado
const allocation = output.toSliceByRatio(targetRatios);
```

6.  **Bonificação por Performance:** Distribuição de lucro baseada em scores variados de funcionários.
```typescript
// Exemplo 1: Bônus por nota (1-10)
const bonuses = res.toSliceByRatio([8, 9, 10, 5]);
```
```typescript
// Exemplo 2: Rateio por horas trabalhadas
const performancePay = output.toSliceByRatio(hoursList);
```

7.  **Sistemas de Billing Cloud:** Rateio de custos de largura de banda proporcional ao uso de cada cliente.
```typescript
// Exemplo 1: Banda consumida (GB)
const bandwidthCost = res.toSliceByRatio([150, 45, 10]);
```
```typescript
// Exemplo 2: API Request count split
const apiCost = output.toSliceByRatio(usageMetrics);
```

8.  **Conversão de Unidades:** Rateio de ingredientes em receitas de escala industrial.
```typescript
// Exemplo 1: Mistura química por partes (1:3:5)
const mixture = res.toSliceByRatio([1, 3, 5]);
```
```typescript
// Exemplo 2: Batch production input
const ingredients = output.toSliceByRatio(compositionPercents);
```

9.  **Planos de Saúde:** Divisão de coparticipação entre beneficiário e empresa.
```typescript
// Exemplo 1: Coparticipação 30/70
const medicalSplit = res.toSliceByRatio(["30%", "70%"]);
```
```typescript
// Exemplo 2: Divisão de franquia de seguro
const insuranceSplit = output.toSliceByRatio([0.2, 0.8]);
```

10. **Seguros:** Distribuição de prêmio entre co-seguradoras.
```typescript
// Exemplo 1: Co-seguro (Líder 40%, Seguradora B 60%)
const premiumSplit = res.toSliceByRatio(["40%", "60%"]);
```
```typescript
// Exemplo 2: Pool de resseguro
const retention = output.toSliceByRatio(poolQuotas);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `ratios` | `(string\|number)[]` | **(Obrigatório)** Pesos. | Podem ser "30%", "0.3" ou "1/3". |
| `decimalPrecision` | `number` | Precisão do rateio. | Define a unidade de ajuste (centavos, milésimos, etc). |

## 💡 Recomendações
- **Use strings para proporções.** `"33.33%"` é mais seguro que `0.3333` para evitar imprecisões do parser de floats do JS.
- **Total não precisa ser 100%.** O algoritmo normaliza os pesos automaticamente (ex: weights `[1, 1]` vira 50%/50%).

## 🏗️ Considerações de Engenharia
- **Justiça Estatística:** Ao contrário do `toSlice` simples (que dá o centavo para os primeiros), este método dá o centavo para quem "perdeu mais" no arredondamento.
- **Rastro de Auditoria:** O rateio é baseado no valor racional exato antes do arredondamento.
