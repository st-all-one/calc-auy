# Método: `toStringNumber()`

O `toStringNumber()` é o método fundamental de exportação decimal da CalcAUY. Ele converte a representação racional interna (fração $n/d$) em uma string numérica plana, garantindo que a precisão solicitada seja respeitada através da estratégia de arredondamento definida no `commit()`.

## ⚙️ Funcionamento Interno

1.  **Resolução de Precisão:** O método utiliza o helper `getEffectivePrecision`. Se a estratégia de arredondamento for `NONE` e nenhuma precisão for informada, ele assume **50 casas decimais**. Caso contrário, usa a precisão informada ou o padrão de **2 casas**.
2.  **Arredondamento Tardio:** Ele solicita ao cache de arredondamento (`getRounded`) uma versão do `RationalNumber` já processada pela estratégia escolhida (ex: NBR 5891).
3.  **Conversão de Base:** A fração é convertida para string decimal sem nunca passar pelo tipo `number` do JavaScript, evitando qualquer contaminação por ponto flutuante (IEEE 754).
4.  **Limpeza (Modo NONE):** Se a estratégia for `NONE`, o método remove zeros à direita desnecessários e o ponto decimal residual para entregar o valor "mais limpo" possível.
5.  **Telemetria:** Inicia um `TelemetrySpan` individual para medir o custo da conversão e do cache, sem gerar spam recursivo.

## 🎯 Propósito
Fornecer uma representation decimal segura, legível e pronta para transporte (JSON, CSV, APIs) que preserve o rastro de arredondamento forense.

## 💼 10 Casos de Uso Reais

1.  **APIs REST:** Envio de valores financeiros para front-ends ou outros microserviços.
```typescript
// Exemplo 1: Resposta em um controlador de API
res.json({ total: output.toStringNumber({ decimalPrecision: 2 }) });
```
```typescript
// Exemplo 2: Payload para serviço externo
const payload = JSON.stringify({ amount: res.toStringNumber() });
```

2.  **Exportação CSV/Excel:** Geração de relatórios de faturamento onde os valores devem ser colunas numéricas planas.
```typescript
// Exemplo 1: Linha de CSV formatada
const csvLine = `${id},${date},${output.toStringNumber()}`;
```
```typescript
// Exemplo 2: Mapeamento de dados para biblioteca de planilhas
const row = data.map(d => d.result.toStringNumber({ decimalPrecision: 4 }));
```

3.  **Integração com Gateways de Pagamento:** Envio de valores para Stripe ou Adyen que aceitam strings decimais.
```typescript
// Exemplo 1: Integração com Stripe (via string decimal)
const session = await stripe.checkout.sessions.create({ line_items: [{ amount_decimal: res.toStringNumber() }] });
```
```typescript
// Exemplo 2: Requisição para Adyen
const paymentReq = { amount: { value: res.toStringNumber({ decimalPrecision: 0 }), currency: "BRL" } };
```

4.  **Geração de XML (NF-e):** Preenchimento de tags de valor unitário e total em Notas Fiscais Eletrônicas.
```typescript
// Exemplo 1: Tag de XML de Nota Fiscal
const xml = `<vProd>${res.toStringNumber({ decimalPrecision: 2 })}</vProd>`;
```
```typescript
// Exemplo 2: Atributo de imposto em XML
const taxXml = `<vICMS v=" ${output.toStringNumber({ decimalPrecision: 4 })}" />`;
```

5.  **Logs de Auditoria:** Registro do valor final de uma transação em bancos de dados de log.
```typescript
// Exemplo 1: Log estruturado
logger.info("Transação concluída", { value: res.toStringNumber() });
```
```typescript
// Exemplo 2: Registro em tabela de auditoria SQL
await db.execute("INSERT INTO audit (val) VALUES (?)", [res.toStringNumber()]);
```

6.  **Inputs de Formulários:** Preenchimento automático de campos de valor em interfaces de usuário.
```typescript
// Exemplo 1: Valor inicial em formulário React
const [value, setValue] = useState(output.toStringNumber());
```
```typescript
// Exemplo 2: Atribuição direta via DOM
document.getElementById("amount-input").value = res.toStringNumber();
```

7.  **Comparação de Strings:** Validação rápida de resultados em testes automatizados.
```typescript
// Exemplo 1: Asserção simples em testes
assertEquals(res.toStringNumber(), "15.0000");
```
```typescript
// Exemplo 2: Verificação de snapshot de saída
expect(output.toStringNumber({ decimalPrecision: 2 })).toBe("10.51");
```

8.  **Geração de Hashes:** Criação de assinaturas digitais de documentos financeiros baseadas no valor exato.
```typescript
// Exemplo 1: Hash de integridade do valor
const hash = crypto.createHash('sha256').update(res.toStringNumber()).digest('hex');
```
```typescript
// Exemplo 2: Payload para assinatura digital (JWS)
const jwsPayload = { sub: "auth", val: output.toStringNumber() };
```

9.  **Sistemas de Mensageria:** Envio de valores para filas (RabbitMQ/SQS) em payloads JSON.
```typescript
// Exemplo 1: Publicação em fila RabbitMQ
channel.sendToQueue("payments", Buffer.from(res.toStringNumber()));
```
```typescript
// Exemplo 2: Mensagem para SQS
const sqsMsg = { MessageBody: JSON.stringify({ amount: output.toStringNumber() }) };
```

10. **Data Science:** Ingestão de dados em Dataframes que preferem strings para evitar erros de precisão iniciais.
```typescript
// Exemplo 1: Exportação para formato compatível com Pandas
const dfInput = rows.map(r => r.result.toStringNumber( { decimalPrecision: 10 }));
```
```typescript
// Exemplo 2: Alimentação de modelo estatístico via string
const modelData = { input_feature: parseFloat(res.toStringNumber()) };
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Define o número de casas decimais. | Força o arredondamento para a precisão N. Se omitido e strategy for `NONE`, mostra 50 casas. |
| `locale` | `string` | Localidade (ex: 'pt-BR'). | **Nenhum.** Este método sempre usa o ponto `.` como separador decimal por padrão técnico. |

## 💡 Recomendações
- **Sempre informe a precisão** se o destino final for um sistema financeiro rígido (ex: 2 casas para BRL).
- **Use `NONE`** apenas para cálculos intermediários ou auditoria científica onde o arredondamento é indesejado.

## 🏗️ Considerações de Engenharia
- **Zero IEEE 754:** O método é imune a erros como `0.1 + 0.2 = 0.30000000000000004`.
- **Custo de Cache:** O resultado é armazenado em um `outputCache` interno da instância. Chamadas repetidas com a mesma precisão têm custo quase zero ($O(1)$).
- **GC Friendly:** Ao usar `using` na telemetria e evitar closures, o método minimiza a pressão sobre o coletor de lixo.
