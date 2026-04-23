# Método: `checkIntegrity()` (Static)

O `checkIntegrity()` é o componente de validação pura da CalcAUY. Diferente do `hydrate()`, que reconstrói a instância de cálculo, este método foca exclusivamente em verificar se a assinatura digital de um objeto (ou string JSON) é legítima para um determinado **Salt**.

## ⚙️ Funcionamento Interno

1.  **Parsing de Payload:** Aceita o rastro assinado tanto como uma string JSON bruta quanto como um objeto já parseado.
2.  **Extração de Dados:** Isola os dados matemáticos críticos (`ast`, `finalResult`, `roundStrategy`) e a assinatura contida no envelope.
3.  **Confronto Determinístico:** Gera um novo hash BLAKE3 a partir dos dados extraídos utilizando o Salt fornecido e compara com a assinatura recebida.
4.  **Veredito de Integridade:** Retorna `true` se os hashes coincidirem perfeitamente. Lança uma exceção se houver qualquer divergência.

## 🎯 Propósito
Validar a autenticidade de rastros de auditoria em camadas de segurança leves (como middlewares ou gateways) onde a reconstrução total da árvore de cálculo não é necessária, mas a prova de não-adulteração é obrigatória.

## 💼 10 Casos de Uso Reais

### 1. Middleware de API (Gatekeeper)
Verificar a integridade de um rastro recebido em uma requisição antes de permitir que ela chegue à lógica de negócio pesada.
```typescript
app.post("/verify-audit", async (req) => {
    const { signed_trace } = req.body;
    try {
        // Validação rápida sem instanciar a AST
        await CalcAUY.checkIntegrity(signed_trace, { salt: "api-secret-salt" });
        return { status: "valid" };
    } catch (e) {
        return { status: "corrupted", error: e.message };
    }
});
```

### 2. Sanidade de Dados em Lote (Batch Cleanup)
Validar a integridade de milhares de registros históricos em um processo de limpeza de banco de dados.
```typescript
for (const row of historicalData) {
    // Eficiente para checks de integridade em massa
    await CalcAUY.checkIntegrity(row.audit_json, { salt: "historical-salt" });
}
```

### 3. Verificação de Ambiente (Staging vs Prod)
Garantir que um rastro gerado em ambiente de teste não seja acidentalmente processado como produção.
```typescript
// Se o rastro foi gerado com o salt de staging, falhará aqui
const isProd = await CalcAUY.checkIntegrity(data, { salt: "prod-salt" });
```

### 4. Pré-processamento de Audit Trail
Filtrar rastros corrompidos antes de enviá-los para um sistema de BI ou Data Warehouse.
```typescript
const validTraces = logs.filter(async (log) => {
    try {
        return await CalcAUY.checkIntegrity(log.data, { salt: "audit-salt" });
    } catch {
        return false;
    }
});
```

### 5. Validação de Integridade em Webhooks
Validar se o payload recebido de um webhook de terceiros (que use CalcAUY) não foi interceptado e modificado.
```typescript
app.post("/webhook", async (req) => {
    const signature = req.headers["x-calc-signature"];
    const payload = req.body;
    // O salt compartilhado garante a autenticidade
    await CalcAUY.checkIntegrity(payload, { salt: "shared-webhook-salt" });
});
```

### 6. Monitoramento de Segurança em Tempo Real
Um serviço sentinela que sorteia registros aleatórios no banco de dados para verificar se houve bit-rot ou manipulação manual.
```typescript
const sample = await db.random();
await CalcAUY.checkIntegrity(sample.signed_state, { salt: "security-salt" });
```

### 7. Comparação de Versões de Fórmulas
Validar se duas versões de um cálculo persistido mantêm a mesma raiz de confiança (mesmo salt).
```typescript
const v1Valid = await CalcAUY.checkIntegrity(v1, { salt: "v1-salt" });
const v2Valid = await CalcAUY.checkIntegrity(v2, { salt: "v1-salt" });
```

### 8. Validação de Cache em Edge Computing
Verificar se o rastro cacheado em um nó de borda (CDN/Edge) ainda é válido e assinado.
```typescript
const cached = await edgeCache.get(id);
await CalcAUY.checkIntegrity(cached, { salt: "edge-salt" });
```

### 9. Auditoria de Terceiros (Proof of Non-Tampering)
Fornecer a um auditor externo o rastro e o salt público para que ele possa validar a integridade de forma independente.
```typescript
// O auditor usa sua própria ferramenta para rodar:
await CalcAUY.checkIntegrity(providedTrace, { salt: "public-audit-salt" });
```

### 10. Descriptografia e Validação em Camada de Transporte
Validar a integridade de um cálculo logo após ele ser descriptografado em uma camada de transporte segura.
```typescript
const decrypted = decrypt(encryptedPayload);
await CalcAUY.checkIntegrity(decrypted, { salt: "transport-salt" });
```

## 🛠️ Opções Permitidas

- `ast`: `CalculationNode | string | object` (O objeto ou string JSON contendo o campo `signature`).
- `config`: `object`
    - `salt`: `string` (**Obrigatório** - O segredo para confronto).
    - `encoder`: `SignatureEncoder` (Opcional - HEX, BASE64, BASE58, BASE32). Se omitido, utiliza o encoder global definido na política de segurança.

## 🏗️ Anotações de Engenharia
- **Performance:** Por não instanciar classes ou validar a estrutura interna da árvore, o `checkIntegrity()` é significativamente mais rápido que o `hydrate()`.
- **Exceções:** O método não retorna `false` em caso de erro; ele lança um `CalcAUYError` com o código `integrity-critical-violation` para garantir que falhas de segurança não passem despercebidas por falta de tratamento de retorno.
- **Segurança Forense:** Este método é a base da auditabilidade bit-perfect da biblioteca.
