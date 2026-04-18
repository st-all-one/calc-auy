# Método: `toJSON()`

O `toJSON()` é o consolidador universal da CalcAUY. Ele gera uma string JSON contendo múltiplas representações do cálculo (numérica, visual, verbal, técnica) em uma única chamada.

## ⚙️ Funcionamento Interno

1.  **Iteração de Chaves:** Percorre a lista de métodos solicitados (ou usa o padrão de auditoria).
2.  **Injeção de Dependência:** Se `toHTML` ou `toImageBuffer` forem solicitados, utiliza a instância do KaTeX fornecida.
3.  **Chamada de Métodos Internos:** Utiliza as versões `Internal` de cada método para preencher o objeto de resposta, garantindo que apenas UM log de telemetria ("toJSON") seja gerado, em vez de um para cada campo.
4.  **Serialização Segura:** Converte valores `bigint` para `string` automaticamente e formata o JSON final.

## 🎯 Propósito
Facilitar a integração com APIs e front-ends, entregando tudo o que é necessário para exibir e auditar o valor em um único payload de rede.

## 💼 10 Casos de Uso Reais

1.  **Respostas de API REST:** Retornar o valor monetário e o rastro LaTeX para um aplicativo mobile.
```typescript
// Exemplo 1: Payload para Front-end
const response = res.toJSON(["toMonetary", "toLaTeX"]);
```
```typescript
// Exemplo 2: Retorno de API Express
res.send(output.toJSON(["toMonetary", "toHTML"], katex));
```

2.  **Persistência em Bancos NoSQL:** Salvar o estado consolidado do cálculo em documentos MongoDB/DynamoDB.
```typescript
// Exemplo 1: Documento MongoDB
await db.collection("orders").insertOne({ detail: JSON.parse(res.toJSON()) });
```
```typescript
// Exemplo 2: Salvar histórico consolidado
history.push(output.toJSON(["toScaledBigInt", "toAuditTrace"]));
```

3.  **Integração com Webhooks:** Enviar o rastro completo para sistemas de terceiros após uma transação.
```typescript
// Exemplo 1: Envio para parceiro
await axios.post(partnerWebhook, { calculation: res.toJSON() });
```
```typescript
// Exemplo 2: Webhook de notificação
notify({ payload: output.toJSON(["toUnicode", "toVerbalA11y"]) });
```

4.  **BFF (Backend for Frontend):** Preparar o dado formatado para consumo imediato por componentes React/Vue.
```typescript
// Exemplo 1: Component props de servidor
const props = { calcData: JSON.parse(res.toJSON(["toHTML", "toStringNumber"], katex)) };
```
```typescript
// Exemplo 2: Geração de página estática
const pageData = items.map(i => i.res.toJSON());
```

5.  **Caches de Aplicação (Redis):** Armazenar a representação pronta de um cálculo complexo.
```typescript
// Exemplo 1: Redis cache set
await redis.set(`calc:${id}`, res.toJSON());
```
```typescript
// Exemplo 2: TTL based cache
cache.set(key, output.toJSON(), 3600);
```

6.  **Sistemas de Mensageria:** Envio de eventos financeiros ricos para filas de processamento.
```typescript
// Exemplo 1: Mensagem RabbitMQ
channel.sendToQueue("events", Buffer.from(res.toJSON()));
```
```typescript
// Exemplo 2: Kafka message value
producer.send({ topic: "fin", messages: [{ value: output.toJSON() }] });
```

7.  **Geração de Relatórios Dinâmicos:** Envio de dados para geradores de templates (Mustache/Handlebars).
```typescript
// Exemplo 1: Template view data
const view = { amount: JSON.parse(res.toJSON()) };
```
```typescript
// Exemplo 2: PDF template input
const html = mustache.render(template, JSON.parse(output.toJSON(["toMonetary"])));
```

8.  **Snapshot de UI:** Salvar exatamente o que o usuário viu na tela no momento da aprovação.
```typescript
// Exemplo 1: Registro de aprovação do cliente
const snapshot = { ui_view: res.toJSON(["toHTML", "toVerbalA11y"], katex) };
```
```typescript
// Exemplo 2: Log de consentimento
consentStore.save(output.toJSON(["toUnicode"]));
```

9.  **Ferramentas de ETL:** Transferência de dados entre sistemas com rastro de auditoria embutido.
```typescript
// Exemplo 1: Row transformation
const row = { ...source, math_audit: res.toJSON() };
```
```typescript
// Exemplo 2: Exportação para Data Warehouse
pipeline.push(output.toJSON(["toStringNumber", "toAuditTrace"]));
```

10. **LocalStorage:** Salvar o estado temporário de uma simulação no navegador do usuário.
```typescript
// Exemplo 1: Salvando rastro localmente
localStorage.setItem("last_calc", res.toJSON());
```
```typescript
// Exemplo 2: Auto-save de rascunho
const draft = output.toJSON(["toLaTeX"]);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `outputs` | `OutputKey[]` | Lista de campos desejados. | Filtra quais métodos serão incluídos no JSON. |
| `katex` | `IKatex` | Instância do KaTeX. | Obrigatório para renderização de HTML/Imagem. |
| `options` | `OutputOptions` | Configurações globais. | Aplica a mesma precisão e locale a todos os campos do JSON. |

## 💡 Recomendações
- **Especifique as chaves.** Solicitar apenas o que você vai usar reduz o tamanho do payload e economiza CPU.
- **Padrão de Auditoria:** Se não passar chaves, a lib retorna os 7 campos fundamentais para uma auditoria completa.

## 🏗️ Considerações de Engenharia
- **Anti-Spam:** A arquitetura de métodos `Internal` permite que o `toJSON` seja extremamente rápido e silencioso nos logs.
- **Type-Safe:** Refatorado para garantir que chaves inválidas sejam capturadas em tempo de compilação.
