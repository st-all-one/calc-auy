# Método: `commit()`

O `commit()` é o ponto de transição crítico no ciclo de vida da CalcAUY. Ele encerra a fase de construção (Build) e inicia a fase de execução, transformando a estrutura lógica da AST em um resultado numérico final processado.

## ⚙️ Funcionamento Interno

1.  **Avaliação Recursiva:** Invoca o motor de execução (`evaluate`), que percorre a árvore das folhas para a raiz, resolvendo cada operação matemática entre instâncias de `RationalNumber`.
2.  **Colapso de Frações:** Resolve todas as somas, multiplicações e divisões pendentes, mantendo a precisão racional infinita até o último nó.
3.  **Simplificação MDC (GCD):** Durante o percurso, aplica o Máximo Divisor Comum para manter os números em sua menor forma possível, prevenindo o consumo excessivo de memória.
4.  **Escolha de Estratégia:** Recebe a política de arredondamento que será utilizada por todos os métodos de saída subsequentes.
5.  **Instanciação de Output:** Retorna um objeto `CalcAUYOutput`, que contém o `RationalNumber` final consolidado, a AST original (para auditoria) e a estratégia escolhida.
6.  **Telemetria de Fechamento:** Monitorado por `TelemetrySpan` para medir o tempo total de "resolução" do cálculo.

## 🎯 Propósito
Gatilho de execução determinístico. É o momento em que a "fórmula" se torna um "fato matemático".

## 💼 10 Casos de Uso Reais

1.  **Fechamento de Nota Fiscal:** Aplicar arredondamento oficial NBR-5891 antes da emissão.
```typescript
// Exemplo 1: Commit padrão
const res = invoice.commit(); 
```
```typescript
// Exemplo 2: Estratégia explícita
const res = invoice.commit({ roundStrategy: "NBR5891" });
```

2.  **Cálculos Fiscais Conservadores:** Usar truncamento para não favorecer o contribuinte.
```typescript
// Exemplo 1: ICMS com truncagem
const icms = calc.commit({ roundStrategy: "TRUNCATE" });
```
```typescript
// Exemplo 2: Cálculo de imposto de renda
const ir = sal.commit({ roundStrategy: "TRUNCATE" });
```

3.  **Auditoria de Alta Precisão:** Manter a dízima periódica intacta.
```typescript
// Exemplo 1: Modo NONE para reconciliação
const exact = calc.commit({ roundStrategy: "NONE" });
```
```typescript
// Exemplo 2: Comparação científica
if (res.commit({ roundStrategy: "NONE" }).toRawInternalBigInt() === 10n) { /* ... */ }
```

4.  **Sistemas Bancários Internacionais:** Uso de arredondamento bancário (Half-Even).
```typescript
// Exemplo 1: Conversão SWIFT
const payout = res.commit({ roundStrategy: "HALF_EVEN" });
```
```typescript
// Exemplo 2: Cálculo de taxas de câmbio forex
const rate = forex.commit({ roundStrategy: "HALF_EVEN" });
```

5.  **Varejo de Consumo:** Arredondamento comercial para cima (Half-Up).
```typescript
// Exemplo 1: Preço de prateleira
const shelfPrice = price.commit({ roundStrategy: "HALF_UP" });
```
```typescript
// Exemplo 2: Valor de parcela em checkout
const installment = cart.commit({ roundStrategy: "HALF_UP" });
```

6.  **Logística e Fretes:** Arredondamento de teto (Ceil).
```typescript
// Exemplo 1: Peso cubado
const weight = dimensions.commit({ roundStrategy: "CEIL" });
```
```typescript
// Exemplo 2: Cobrança de horas cheias
const billable = hours.commit({ roundStrategy: "CEIL" });
```

7.  **Finalização de Lote de Processamento:** Executar o commit dentro de um loop `ProcessBatchAUY`.
```typescript
// Exemplo 1: Commit em processamento paralelo
const results = await ProcessBatchAUY(data, d => CalcAUY.from(d).commit());
```
```typescript
// Exemplo 2: Redutor de lote com commit final
const total = await batch.reduce((acc, c) => acc.add(c), CalcAUY.from(0)).commit();
```

8.  **Validação de Regras de Negócio:** Realizar o commit para checar limites.
```typescript
// Exemplo 1: Verificação de estouro de conta
if (calc.commit().toFloatNumber() < 0) alert("Saldo insuficiente");
```
```typescript
// Exemplo 2: Trava de valor máximo de transação
if (res.commit().toScaledBigInt() > MAX) throw new Error();
```

9.  **Integração com Sistemas de Relatórios:** Gerar o output para exportação.
```typescript
// Exemplo 1: PDF Generation trigger
const docData = calc.commit().toJSON();
```
```typescript
// Exemplo 2: Email de confirmação
sendEmail(res.commit().toMonetary());
```

10. **Ajuste Dinâmico de Estratégia:** Decidir como arredondar baseado em metadados.
```typescript
// Exemplo 1: Estratégia por tipo de operação
const strategy = isTax ? "TRUNCATE" : "NBR5891";
const final = calc.commit({ roundStrategy: strategy });
```
```typescript
// Exemplo 2: Política de arredondamento por país
const res = calc.commit({ roundStrategy: countryConfig.rounding });
```

## 🛠️ Opções Permitidas

- `options`: `object`
    - `roundStrategy`: `RoundingStrategy` (`"NBR5891" | "TRUNCATE" | "HALF_UP" | "HALF_EVEN" | "CEIL" | "NONE"`)

## 🏗️ Anotações de Engenharia
- **Idempotência:** O `commit()` é uma operação pura. Chamar `commit()` várias vezes em instâncias idênticas da AST sempre resultará no mesmo output.
- **Ponto de Não Retorno:** Após o `commit()`, você sai da API fluida do Builder (`CalcAUY`) e entra na API de representação (`CalcAUYOutput`). Para adicionar novas operações matematicas, você precisará usar o método `.hydrate()` no resultado ou continuar a partir da instância original do builder.
- **Prevenção de Spam de Log:** O `commit()` possui seu próprio span de telemetria, permitindo rastrear o tempo exato que o motor de execução levou para colapsar a árvore, independente do tempo de construção.
