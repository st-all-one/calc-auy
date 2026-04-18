# Método: `toAuditTrace()`

O `toAuditTrace()` fornece o rastro técnico definitivo em formato JSON. Ele exporta o estado bruto da engine, permitindo a reconstrução e validação forense do cálculo por sistemas externos.

## ⚙️ Funcionamento Interno

1.  **Serialização de AST:** Converte a estrutura completa da árvore de sintaxe abstrata em um objeto JSON aninhado.
2.  **Snapshot Racional:** Inclui o resultado final em formato racional bruto (`{ n: bigint, d: bigint }`).
3.  **Identidade de Estratégia:** Registra a estratégia de arredondamento exata aplicada no momento do commit.
4.  **Preservação de Metadados:** Exporta todos os metadados de negócio associados a cada nó da árvore.

## 🎯 Propósito
Garantir a **imutabilidade do rastro**. É a peça central para conformidade regulatória, onde não basta saber o resultado, é preciso provar o processo.

## 💼 10 Casos de Uso Reais

1.  **Conformidade Bancária (Compliance):** Armazenamento do rastro de cálculos de taxas de juros para auditoria do Banco Central.
```typescript
// Exemplo 1: Snapshot de transação financeira
const complianceLog = { timestamp: new Date(), trace: res.toAuditTrace() };
```
```typescript
// Exemplo 2: Envio para endpoint de regulação
await axios.post("https://regulator.gov/audit", { payload: output.toAuditTrace() });
```

2.  **Sistemas Jurídicos:** Registro eletrônico de cálculos de indenizações.
```typescript
// Exemplo 1: Salvando rastro em sistema de processos
await processRepo.saveAudit(processId, res.toAuditTrace());
```
```typescript
// Exemplo 2: Snapshot para laudo pericial (JSON)
const legalSnapshot = JSON.parse(output.toAuditTrace());
```

3.  **Arquivamento Forense:** Salvar o rastro em colunas `JSONB` para consultas históricas.
```typescript
// Exemplo 1: Inserção PostgreSQL JSONB
await db.query("INSERT INTO history (id, trace) VALUES ($1, $2)", [id, res.toAuditTrace()]);
```
```typescript
// Exemplo 2: Auditoria de longa duração (S3)
s3.upload({ Bucket: "audits", Key: `trace-${id}.json`, Body: output.toAuditTrace() });
```

4.  **Reconciliação entre Microserviços:** Um serviço calcula e envia o rastro para que outro valide a integridade.
```typescript
// Exemplo 1: Payload de evento entre microserviços
const event = { type: "CALCULATION_DONE", trace: res.toAuditTrace() };
```
```typescript
// Exemplo 2: Verificação em serviço de contabilidade
if (validator.isInvalid(output.toAuditTrace())) { throw new AuditError(); }
```

5.  **Logs de Segurança:** Detecção de manipulações de valores entre a entrada e a saída.
```typescript
// Exemplo 1: Log de segurança (SIEM)
securityLogger.alert("VERIFY_INTEGRITY", { trace: res.toAuditTrace() });
```
```typescript
// Exemplo 2: Hash de rastro para blockchain
const integrityHash = sha256(output.toAuditTrace());
```

6.  **Geração de Certificados Digitais:** Assinatura do rastro de auditoria para garantir que ele não foi alterado.
```typescript
// Exemplo 1: Assinatura digital do JSON
const signature = sign(res.toAuditTrace(), privateKey);
```
```typescript
// Exemplo 2: Envelope criptográfico de auditoria
const envelope = { data: output.toAuditTrace(), signature };
```

7.  **Debugging de Engine:** Análise técnica da estrutura da árvore em casos de erro.
```typescript
// Exemplo 1: Log técnico para desenvolvedores
if (err) console.log("Erro na árvore detectado:", res.toAuditTrace());
```
```typescript
// Exemplo 2: Exportação para ferramenta de inspeção visual
fs.writeFileSync("ast_debug.json", output.toAuditTrace());
```

8.  **Sistemas de Votação/Ranking:** Prova matemática da consolidação de resultados.
```typescript
// Exemplo 1: Snapshot de apuração de votos
const voteTrace = { round: 1, detail: res.toAuditTrace() };
```
```typescript
// Exemplo 2: Rastro de cálculo de ranking ELO
rankHistory.push(output.toAuditTrace());
```

9.  **Integração com BI Avançado:** Análise da profundidade e complexidade das fórmulas utilizadas pela empresa.
```typescript
// Exemplo 1: Dataset para análise de complexidade
const biData = rows.map(r => ({ complexity: JSON.parse(r.trace).ast.depth }));
```
```typescript
// Exemplo 2: Identificação de metadados de negócio (agrupamento)
const metadataAnalysis = extractAllMetadata(output.toAuditTrace());
```

10. **Reidratação Técnica:** Uso do rastro para reconstruir o estado em ambientes de teste.
```typescript
// Exemplo 1: Re-instanciação de cálculo a partir de trace
const restored = CalcAUY.hydrate(res.toAuditTrace());
```
```typescript
// Exemplo 2: Teste de mutação (verificar divergência)
const diverged = restored.add(1).commit();
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| (Nenhuma) | - | Exportação técnica total. | Este método não aceita opções de formatação, pois foca na fidelidade técnica absoluta. |

## 💡 Recomendações
- **Armazene junto com a transação.** Nunca salve apenas o valor final; salve o `toAuditTrace()`.
- **Use para auditoria externa.** Envie este JSON para peritos ou auditores independentes.

## 🏗️ Considerações de Engenharia
- **BigInt em JSON:** Como o JSON nativo não suporta `bigint`, a CalcAUY converte os numeradores e denominadores para `strings` dentro do objeto para garantir a transportabilidade.
- **Rastro Hierárquico:** A estrutura reflete exatamente as chamadas da Fluent API, mantendo a semântica do desenvolvedor original.
