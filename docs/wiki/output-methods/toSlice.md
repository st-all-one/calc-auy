# Método: `toSlice()`

O `toSlice()` divide o valor final do cálculo em partes iguais, utilizando o **Algoritmo de Maior Resto** para garantir que a soma das fatias seja matematicamente idêntica ao total original, sem perda ou ganho de centavos.

## ⚙️ Funcionamento Interno

1.  **Escalonamento:** Converte o valor racional para um inteiro escalado (centavos) baseado na `decimalPrecision` (padrão 2).
2.  **Divisão Inteira:** Calcula o valor base de cada fatia através de uma divisão `bigint`.
3.  **Cálculo do Resto:** Identifica quantos centavos sobraram da divisão não exata.
4.  **Distribuição de Centavos:** Aplica o resto acumulado nas primeiras parcelas (um centavo por parcela) até que o saldo seja zero.
5.  **Formatação:** Converte os resultados de volta para strings decimais.
6.  **Telemetria:** Monitorado individualmente via `TelemetrySpan`.

## 🎯 Propósito
Resolver o dilema de dividir valores que não possuem divisão exata em base decimal (ex: R$ 10,00 dividido por 3), garantindo conformidade fiscal e contábil.

## 💼 10 Casos de Uso Reais

1.  **Parcelamento de Compras:** Dividir um total de carrinho em N vezes sem juros.
```typescript
// Exemplo 1: 100.00 em 3 parcelas
const parcelas = res.toSlice(3); // ["33.34", "33.33", "33.33"]
```
```typescript
// Exemplo 2: Parcelamento dinâmico
const installments = output.toSlice(numInstallments, { decimalPrecision: 2 });
```

2.  **Rateio de Despesas:** Divisão de conta de restaurante ou condomínio entre participantes.
```typescript
// Exemplo 1: Conta de R$ 50,00 entre 3 amigos
const fatias = res.toSlice(3); // ["16.67", "16.67", "16.66"]
```
```typescript
// Exemplo 2: Condomínio por unidades iguais
const quotas = output.toSlice(totalUnits);
```

3.  **Folha de Pagamento:** Distribuição de bônus fixo entre uma equipe.
```typescript
// Exemplo 1: Bônus de R$ 1000,00 para 7 funcionários
const bonuses = res.toSlice(7); 
```
```typescript
// Exemplo 2: PLR distribuído em partes iguais
const plrSlices = output.toSlice(employeeCount, { decimalPrecision: 2 });
```

4.  **Sistemas de Bilhetagem:** Rateio de custos de infraestrutura entre sub-contas.
```typescript
// Exemplo 1: Rateio de custo fixo de servidor
const serverCosts = res.toSlice(accountCount);
```
```typescript
// Exemplo 2: Distribuição de taxa de API
const apiFees = output.toSlice(10, { decimalPrecision: 4 });
```

5.  **Divisão de Heranças/Bens:** Distribuição de valores monetários entre herdeiros.
```typescript
// Exemplo 1: Herança de R$ 1.000.000,00 para 3 herdeiros
const inheritance = res.toSlice(3);
```
```typescript
// Exemplo 2: Partilha de bens líquidos
const shares = output.toSlice(legalHeirs);
```

6.  **Cashback:** Rateio de um montante de recompensa entre usuários qualificados.
```typescript
// Exemplo 1: Pool de cashback de R$ 500,00
const reward = res.toSlice(qualifiedUsers);
```
```typescript
// Exemplo 2: Distribuição de milhas (inteiro)
const miles = output.toSlice(userCount, { decimalPrecision: 0 });
```

7.  **Sistemas de Assinatura:** Divisão de uma anuidade em mensalidades.
```typescript
// Exemplo 1: Anuidade de R$ 299,90 em 12 meses
const monthly = res.toSlice(12);
```
```typescript
// Exemplo 2: Plano trimestral
const quarterly = output.toSlice(3, { decimalPrecision: 2 });
```

8.  **Vendas em Co-autoria:** Distribuição de royalties iguais para criadores.
```typescript
// Exemplo 1: Divisão de lucro de ebook (50/50)
const payout = res.toSlice(2);
```
```typescript
// Exemplo 2: Royalties de banda (5 membros)
const bandShare = output.toSlice(5);
```

9.  **Reembolsos:** Divisão de um estorno entre múltiplas notas fiscais originais.
```typescript
// Exemplo 1: Estorno parcial de R$ 45,55 em 2 notas
const refundSlices = res.toSlice(2);
```
```typescript
// Exemplo 2: Reembolso de taxa de entrega
const shippingRefund = output.toSlice(itemsInBox);
```

10. **Sistemas de Crédito:** Cálculo de amortização constante de principal.
```typescript
// Exemplo 1: Amortização de capital em 24 meses
const principalSlices = res.toSlice(24);
```
```typescript
// Exemplo 2: Pagamento de cupom de debênture
const coupons = output.toSlice(paymentCycles);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `parts` | `number` | **(Obrigatório)** Número de fatias. | Define o tamanho do array de retorno. |
| `decimalPrecision` | `number` | Precisão das fatias. | Define a unidade mínima de distribuição (ex: 2 = centavo, 0 = real). |

## 💡 Recomendações
- **Use precisão 2 para moedas.** É o padrão esperado por gateways de pagamento.
- **Sempre some o resultado** para validar. Embora o algoritmo garanta a soma, é uma boa prática de teste.

## 🏗️ Considerações de Engenharia
- **Soma Determinística:** `array.reduce((a, b) => a + b) === total`. Esta invariante é mantida em 100% dos casos.
- **Eficiência de Memória:** O algoritmo opera sobre `BigInt`, evitando estouros em valores de grande magnitude.
- **Estratégia NONE:** Se a estratégia for `NONE`, as fatias terão 50 casas decimais cada.
