# Método: `from()` (Static)

O método `from()` é a porta de entrada universal para a ingestão de valores na CalcAUY. Sua função técnica é normalizar entradas heterogêneas em uma representação racional absoluta (`RationalNumber`) encapsulada em um `LiteralNode`.

## ⚙️ Funcionamento Interno

1.  **Detecção de Tipo:** Identifica o tipo primitivo da entrada (`string`, `number`, `bigint`, ou instância de `CalcAUY`).
2.  **Conversão Racional:** Converte imediatamente o valor para a estrutura fracionária interna ($n/d$). Entradas decimais são expandidas para frações de base 10 para evitar perdas do padrão IEEE 754.
3.  **Normalização de Percentuais:** Identifica sufixos `%` e converte `"10.5%"` em `"10.5/100"`, preservando o rastro original.
4.  **Sistema de Cache Híbrido:**
    -   Verifica a **Sessão Ativa** (referência forte).
    -   Verifica o **Hot Cache** (referência forte, limite 512).
    -   Verifica o **Cold Cache** (`WeakRef`, gerenciado pelo GC).
5.  **Encapsulamento AST:** Gera um novo `LiteralNode` contendo o valor racional serializado e a string de entrada original (`originalInput`).

## 🎯 Propósito
Garantir que a imprecisão numérica nunca contamine a engine, preservando a intenção original do usuário desde o primeiro byte inserido.

## 💼 10 Casos de Uso Reais

1.  **Ingestão de Inputs de Formulário:** Recebimento de strings vindas de campos de texto.
```typescript
// Exemplo 1: Captura direta de input HTML
const val = CalcAUY.from(inputElement.value);
```
```typescript
// Exemplo 2: Tratamento de campo de preço em React
const price = CalcAUY.from(formData.get("price") as string);
```

2.  **Cálculos Baseados em Percentuais:** Ingestão direta de taxas e alíquotas.
```typescript
// Exemplo 1: Alíquota de imposto
const tax = CalcAUY.from("18%");
```
```typescript
// Exemplo 2: Desconto progressivo
const discount = CalcAUY.from("5.25%");
```

3.  **Integração com BigInt Nativo:** Uso de valores inteiros de alta magnitude.
```typescript
// Exemplo 1: Valor em Satoshis
const satoshis = CalcAUY.from(2100000000000000n);
```
```typescript
// Exemplo 2: Contador de alta precisão
const count = CalcAUY.from(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
```

4.  **Uso de Notação Científica:** Suporte a valores extremamente pequenos ou grandes.
```typescript
// Exemplo 1: Constante física
const boltzmann = CalcAUY.from("1.380649e-23");
```
```typescript
// Exemplo 2: Massa astronômica
const earthMass = CalcAUY.from("5.972e24");
```

5.  **Composição de Builders:** Iniciar um cálculo a partir do resultado parcial de outro.
```typescript
// Exemplo 1: Reuso de sub-fórmula
const base = CalcAUY.from(subCalc);
```
```typescript
// Exemplo 2: Encadeamento de fluxos de decisão
const final = CalcAUY.from(isA ? calcA : calcB).add(tax);
```

6.  **Ingestão de Frações Puras:** Manutenção do rastro de divisão sem conversão decimal precoce.
```typescript
// Exemplo 1: Divisão de herança (um terço)
const third = CalcAUY.from("1/3");
```
```typescript
// Exemplo 2: Proporção de mistura química
const ratio = CalcAUY.from("7/22");
```

7.  **Leitura de Bancos de Dados:** Processamento de valores vindos de colunas `DECIMAL` ou `NUMERIC`.
```typescript
// Exemplo 1: Coluna de banco via ORM
const dbVal = CalcAUY.from(row.amount.toString());
```
```typescript
// Exemplo 2: Valor recuperado de cache Redis
const cached = CalcAUY.from(await redis.get("total"));
```

8.  **Tratamento de Números com Underscores:** Suporte a legibilidade de grandes números.
```typescript
// Exemplo 1: Grande montante financeiro
const million = CalcAUY.from("1_000_000.00");
```
```typescript
// Exemplo 2: Configuração de hardware (bits)
const maxBits = CalcAUY.from("1_048_576n");
```

9.  **Normalização de Tipos Legados:** Conversão segura de tipos `number` (float).
```typescript
// Exemplo 1: Conversão de constante legada
const legacyVal = CalcAUY.from(10.5);
```
```typescript
// Exemplo 2: Valor de sensor analógico
const sensor = CalcAUY.from(sensor.readFloat());
```

10. **Geração de Árvores Dinâmicas:** Ingestão recursiva em algoritmos de mapeamento.
```typescript
// Exemplo 1: Mapeador de árvore de custos
const nodes = data.map(item => CalcAUY.from(item.val));
```
```typescript
// Exemplo 2: Redutor de array de entradas
const total = items.reduce((acc, cur) => acc.add(CalcAUY.from(cur)), CalcAUY.from(0));
```

## 🛠️ Opções Permitidas

O método `from()` é uma assinatura de argumento único:
- `value`: `string | number | bigint | CalcAUY`.

## 🏗️ Anotações de Engenharia
- **Preservação de Identidade:** O `originalInput` é mantido como string pura. Se você passar `"1.00"`, o rastro será `"1.00"`. Se passar `1`, será `"1"`. Isso é vital para a auditabilidade visual (LaTeX/Unicode).
- **Eficiência de Cache:** O método é o principal cliente do sistema de `WeakRef`. Cálculos que utilizam os mesmos valores literais repetidamente (ex: taxas de 1.18 em um loop de 1M de itens) terão custo de alocação próximo de zero.
- **Segurança de Memória:** Literais excessivamente grandes em `string` são convertidos mas não cacheados no Hot Cache para evitar fragmentação excessiva do heap.
