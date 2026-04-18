# Método: `toRawInternalBigInt()`

O `toRawInternalBigInt()` retorna o resultado final da árvore de cálculo arredondado para o **número inteiro mais próximo**, conforme a estratégia de arredondamento definida.

## ⚙️ Funcionamento Interno

1.  **Arredondamento Forense:** Diferente de uma simples divisão inteira (truncamento), este método chama `getRounded(0)`, aplicando a regra de desempate da estratégia (ex: regra do par da NBR-5891) para a precisão zero.
2.  **Divisão Inteira:** Após o arredondamento para a escala de inteiro, realiza a divisão BigInt final para extrair o valor puro.
3.  **Telemetria:** Monitorado individualmente para auditoria de saída inteira.

## 🎯 Propósito
Obter a unidade discreta final de um cálculo. É o método definitivo para quando o resultado esperado deve ser um número inteiro "justo" e auditável.

## 💼 10 Casos de Uso Reais

1.  **Contagem de Itens Inteiros:** Resultados de rateio que devem retornar unidades (ex: "Quantas pessoas?").
```typescript
// Exemplo 1: Rateio de passageiros por veículo
const peoplePerBus = totalPeople.div(busCapacity).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Quantidade de produtos em estoque
const units = totalVolume.div(unitVolume).commit().toRawInternalBigInt();
```

2.  **Cálculo de Parcelas:** Quando o sistema exige que o valor principal seja um inteiro arredondado.
```typescript
// Exemplo 1: Valor base de prestação arredondada
const baseInstallment = total.div(12).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Ajuste de amortização
installment.principal = res.toRawInternalBigInt();
```

3.  **Conversão para Dias/Horas:** Obtenção de unidades de tempo arredondadas a partir de frações.
```typescript
// Exemplo 1: Estimativa de dias para projeto
const days = totalHours.div(8).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Arredondamento de horas faturáveis
const billableHours = res.toRawInternalBigInt();
```

4.  **Lógica de Quantidade de Loops:** Determinar quantas iterações um processo deve rodar baseado em um cálculo prévio.
```typescript
// Exemplo 1: Definindo tamanho de buffer de processamento
const iterations = dataSize.div(chunkSize).commit().toRawInternalBigInt();
for (let i = 0; i < iterations; i++) { /* ... */ }
```
```typescript
// Exemplo 2: Paginação dinâmica
const totalPages = items.div(perPage).commit().toRawInternalBigInt();
```

5.  **Geração de IDs Numéricos:** Quando o ID é derivado de uma fórmula matemática.
```typescript
// Exemplo 1: Hash-based ID numérico
const numericId = formula.commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Sequencial calculado
const nextSeq = lastSeq.add(increment).commit().toRawInternalBigInt();
```

6.  **Pagamentos de Dividendos (Lotes):** Arredondamento para o lote mínimo de ações (inteiro).
```typescript
// Exemplo 1: Ações a serem creditadas
const sharesToIssue = investment.div(sharePrice).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Cálculo de bonificação em quotas
const bonusQuotas = profit.mult(participation).commit().toRawInternalBigInt();
```

7.  **Sistemas de Ranking:** Conversão de scores decimais em posições inteiras auditáveis.
```typescript
// Exemplo 1: Posição em leaderboard
const rank = rawScore.mult(weight).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Nível de experiência (RPG)
const level = xp.div(levelFactor).commit().toRawInternalBigInt();
```

8.  **Limites de Crédito:** Definição de teto operacional em valores redondos.
```typescript
// Exemplo 1: Teto de cartão de crédito
const limit = salary.mult(0.3).commit().toRawInternalBigInt();
```
```typescript
// Exemplo 2: Margem de consignado
const margin = res.toRawInternalBigInt();
```

9.  **Auditoria de Numerador:** Verificação técnica da parte inteira de uma dízima.
```typescript
// Exemplo 1: Verificação de dízima 10/3
const integerPart = CalcAUY.from(10).div(3).commit().toRawInternalBigInt(); // 3n
```
```typescript
// Exemplo 2: Extração de componente inteiro de fórmula
const component = output.toRawInternalBigInt();
```

10. **Conversão para Tipos C++ / Rust:** Envio de dados via FFI que esperam tipos `int64` ou similares.
```typescript
// Exemplo 1: FFI call para biblioteca nativa
nativeLib.symbols.process_int(res.toRawInternalBigInt());
```
```typescript
// Exemplo 2: Envio para Worker Thread em buffer de Int64
const sharedBuffer = new BigInt64Array(1);
sharedBuffer[0] = output.toRawInternalBigInt();
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| (Nenhuma) | - | Este método foca na precisão 0. | Ignora parâmetros de precisão externos para garantir a integridade do inteiro. |

## 💡 Recomendações
- **Não confunda com `toScaledBigInt`.** Este retorna o valor real arredondado, enquanto o outro retorna o valor multiplicado por uma escala.
- **Use para Auditoria:** É a melhor forma de provar que o arredondamento para o inteiro seguiu a norma técnica correta.

## 🏗️ Considerações de Engenharia
- **NBR-5891 em Inteiros:** Se o resultado for `2.5`, este método retornará `2` (par). Se for `3.5`, retornará `4`. Isso garante justiça estatística mesmo em saídas inteiras.
- **Pureza Matemática:** Mantém a consistência com o rastro de auditoria exibido no LaTeX/Unicode.
