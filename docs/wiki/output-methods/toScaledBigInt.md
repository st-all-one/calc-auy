# Método: `toScaledBigInt()`

O `toScaledBigInt()` transforma o valor racional em um `bigint` "escalado" (scaled integer). Ele multiplica o resultado por uma potência de 10 e retorna a parte inteira.

## ⚙️ Funcionamento Interno

1.  **Cálculo da Escala:** Determina o fator multiplicador baseado em `decimalPrecision` (ex: precisão 2 = escala 100).
2.  **Arredondamento:** Aplica a estratégia de arredondamento definida no commit para a escala solicitada.
3.  **Transformação Inteira:** Executa a operação $(n * 10^p) / d$ utilizando aritmética de inteiros pura.
4.  **Telemetria:** Monitorado por `TelemetrySpan`.

## 🎯 Propósito
Preparar valores financeiros para armazenamento em bancos de dados (como colunas `BIGINT` do PostgreSQL) eliminando a necessidade de tipos `DECIMAL` que podem variar entre dialetos SQL.

## 💼 10 Casos de Uso Reais

1.  **Persistência SQL:** Armazenar centavos como inteiros (R$ 15,50 vira `1550`).
```typescript
// Exemplo 1: Salvando no banco via ORM (Prisma)
await db.transaction.create({ data: { amount: res.toScaledBigInt({ decimalPrecision: 2 }) } });
```
```typescript
// Exemplo 2: Query SQL nativa
const query = `INSERT INTO sales (val) VALUES (${output.toScaledBigInt()})`;
```

2.  **Blockchain / Smart Contracts:** Envio de valores para redes que operam apenas com inteiros (ex: Wei em Ethereum).
```typescript
// Exemplo 1: Conversão para Wei (18 casas)
const wei = res.toScaledBigInt({ decimalPrecision: 18 });
```
```typescript
// Exemplo 2: Chamada de contrato via ethers.js
contract.transfer(to, res.toScaledBigInt({ decimalPrecision: 8 }));
```

3.  **Protocolos Binários (Protobuf/Avro):** Serialização eficiente de valores monetários.
```typescript
// Exemplo 1: Encoding Protobuf
const msg = PaymentMessage.create({ amount: res.toScaledBigInt() });
```
```typescript
// Exemplo 2: Buffer binary write
buffer.writeBigInt64BE(output.toScaledBigInt({ decimalPrecision: 4 }));
```

4.  **Reconciliação Bancária:** Comparação de saldo onde a unidade mínima é o centavo.
```typescript
// Exemplo 1: Verificação exata
const isMatch = res.toScaledBigInt() === bankBalanceInCents;
```
```typescript
// Exemplo 2: Consolidação em loop
totalCents += output.toScaledBigInt();
```

5.  **Sistemas de Pontuação:** Conversão de moedas em "pontos" ou "créditos" inteiros.
```typescript
// Exemplo 1: Cálculo de pontos (1 real = 10 pontos)
const points = res.toScaledBigInt({ decimalPrecision: 1 });
```
```typescript
// Exemplo 2: Atribuição de bônus
user.credits += output.toScaledBigInt({ decimalPrecision: 0 });
```

6.  **Otimização de Indexação:** Consultas SQL `SUM` em colunas de inteiros são significativamente mais rápidas que em decimais.
```typescript
// Exemplo 1: Definição de esquema de alto desempenho
// SQL: ALTER TABLE orders ADD COLUMN amount_scaled BIGINT;
const scaledVal = res.toScaledBigInt();
```
```typescript
// Exemplo 2: Agregação rápida no BD
const fastSum = await db.query("SELECT SUM(amount_scaled) FROM orders");
```

7.  **Transferência de Arquivos Fixed-Width:** Geração de arquivos CNAB onde valores não possuem vírgula.
```typescript
// Exemplo 1: Preenchimento de campo CNAB 240
const field = res.toScaledBigInt().toString().padStart(15, "0");
```
```typescript
// Exemplo 2: Formatação de remessa bancária
const remessaLine = `001${output.toScaledBigInt().toString()}`;
```

8.  **Sistemas de Estoque:** Contagem de itens que podem ser fracionados em milésimos (ex: gramas).
```typescript
// Exemplo 1: Peso em miligramas
const weightMg = res.toScaledBigInt({ decimalPrecision: 3 });
```
```typescript
// Exemplo 2: Volume em microlitros
const volumeUl = output.toScaledBigInt({ decimalPrecision: 6 });
```

9.  **Hardware / Microcontroladores:** Envio de dados para dispositivos que não possuem unidade de ponto flutuante (FPU).
```typescript
// Exemplo 1: Envio via Serial para Arduino
serial.print(res.toScaledBigInt().toString());
```
```typescript
// Exemplo 2: Controle de atuador via PWM (inteiro)
setDutyCycle(output.toScaledBigInt({ decimalPrecision: 0 }));
```

10. **Criptografia:** Geração de payloads numéricos para algoritmos que exigem entrada de inteiros gigantes.
```typescript
// Exemplo 1: RSA Blinding factor
const blind = crypto.blind(res.toScaledBigInt());
```
```typescript
// Exemplo 2: Diffie-Hellman secret derivation
const secret = dh.computeSecret(output.toScaledBigInt());
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Define a escala (10^N). | Determina quantos zeros à direita o valor terá (ex: 2 = centavos, 8 = satoshis). |

## 💡 Recomendações
- **Documente a escala no banco de dados.** Um valor `1550` no banco é inútil se você não souber que ele foi escalado por 100.
- **Use o padrão da indústria:** 2 casas para moedas fiat, 8 ou mais para ativos digitais.

## 🏗️ Considerações de Engenharia
- **Escala Direta:** Diferente do numerador bruto (`toRawInternalBigInt`), este método garante que o valor retornado seja proporcional à base decimal 10.
- **Overflow:** Embora o `bigint` seja ilimitado em teoria, a CalcAUY possui guardas de 1 milhão de bits para evitar ataques de negação de serviço (DoS) via memória.
