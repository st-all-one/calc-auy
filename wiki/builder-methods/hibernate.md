# Método: `hibernate()`

O `hibernate()` é o método de serialização da CalcAUY. Ele converte a Árvore de Sintaxe Abstrata (AST) atual em uma string JSON determinística, permitindo a persistência total da lógica do cálculo.

## ⚙️ Funcionamento Interno

1.  **Traversal de Árvore:** Percorre recursivamente todos os nós da AST (literais, operações e grupos).
2.  **Serialização de BigInt:** Converte as propriedades `n` (numerador) e `d` (denominador) de cada nó em strings, contornando a limitação nativa do `JSON.stringify` com tipos `bigint`.
3. **Preservação de Contexto:** Garante que todos os metadados anexados e o identificador da jurisdição (`contextLabel`) sejam incluídos no JSON.
4. **Imutabilidade de Snapshot:** Gera uma representação estática da árvore naquele exato momento.


## 🎯 Propósito
Fornecer uma forma de "congelar" a lógica matemática para armazenamento em disco, banco de dados ou transmissão via rede, sem perder a capacidade de reidratação futura.

## 💼 10 Casos de Uso Reais

1.  **Salvamento de Rascunho de Fatura:** Persistir um cálculo inacabado para conclusão posterior.
```typescript
// Exemplo 1: Gravação em banco
await db.drafts.update({ id }, { logic: res.hibernate() });
```
```typescript
// Exemplo 2: Salvamento automático em LocalStorage
localStorage.setItem("draft", calc.hibernate());
```

2.  **Log de Auditoria Técnica:** Registrar a estrutura da fórmula em logs de erro.
```typescript
// Exemplo 1: Contexto de erro rico
logger.error("Falha no processamento", { ast: calc.hibernate() });
```
```typescript
// Exemplo 2: Snapshot de depuração
if (debug) fs.writeFileSync("last_op.json", output.hibernate());
```

3.  **Persistência de Regras de Negócio:** Armazenar fórmulas complexas definidas por administradores.
```typescript
// Exemplo 1: Update de política comercial
const jsonRule = builder.add("10%").hibernate();
await configService.save("tax_rule", jsonRule);
```
```typescript
// Exemplo 2: Exportação de configurações de impostos
const exportData = rules.map(r => r.hibernate());
```

4.  **Transferência de Estado em SPAs:** Passar o cálculo entre diferentes páginas ou rotas.
```typescript
// Exemplo 1: Query param (encurtado)
router.push({ path: '/confirm', query: { state: btoa(calc.hibernate()) } });
```
```typescript
// Exemplo 2: Estado de componente global
state.currentCalculation = output.hibernate();
```

5.  **Snapshot para Reconciliação:** Salvar a árvore para comparação de divergências futuras.
```typescript
// Exemplo 1: Histórico de versões de cálculo
await db.history.insert({ version: 2, tree: res.hibernate() });
```
```typescript
// Exemplo 2: Comparação de "antes e depois"
const diff = compare(oldState.hibernate(), newState.hibernate());
```

6.  **Geração de Payloads para Webhooks:** Enviar o rastro lógico para outros sistemas.
```typescript
// Exemplo 1: Disparo de webhook de faturamento
webhook.trigger("BILLING_READY", { logic: calc.hibernate() });
```
```typescript
// Exemplo 2: Integração com sistema de ERP
erpApi.syncCalculation(output.hibernate());
```

7.  **Arquivamento Legal:** Manter a prova documental da fórmula por 5 ou 10 anos.
```typescript
// Exemplo 1: Compactação para cold storage
const archive = gzip(res.hibernate());
```
```typescript
// Exemplo 2: Gravação em fita magnética/WORM
storage.writePermanent(`audit-${id}.json`, output.hibernate());
```

8.  **Sistemas de Templates:** Injetar a lógica serializada em outros geradores.
```typescript
// Exemplo 2: Template de relatório técnico
const report = `Lógica: ${calc.hibernate()}`;
```
```typescript
// Exemplo 2: Atributo de dado em HTML (data-ast)
const div = `<div data-ast='${output.hibernate()}'></div>`;
```

9.  **Cache Distribuído:** Armazenar a AST pronta no Redis para evitar re-parsing.
```typescript
// Exemplo 1: Cache de fórmula de alto custo
await redis.setex("formula_123", 3600, res.hibernate());
```
```typescript
// Exemplo 2: Shared state em cluster
cluster.broadcast({ type: "UPDATE_LOGIC", data: output.hibernate() });
```

10. **Certificação Digital:** Hash da árvore para garantir não-repúdio.
```typescript
// Exemplo 1: Assinatura de rastro
const signature = sign(res.hibernate(), privateKey);
```
```typescript
// Exemplo 2: Verificação de integridade de arquivo salvo
const isValid = verify(fs.readFileSync(file), hash(output.hibernate()));
```

## 🛠️ Opções Permitidas

- (Nenhuma) - O método foca na fidelidade total da estrutura interna.

## 🏗️ Anotações de Engenharia
- **BigInt Compatibility:** O maior desafio da serialização de árvores matemáticas em JS é o `BigInt`. O `hibernate()` resolve isso garantindo que todos os valores racionais sejam strings no JSON, tornando-o compatível com qualquer parser JSON padrão (Python, Go, Java, etc.).
- **Tamanho do Payload:** Para árvores extremamente profundas (> 1000 níveis), o JSON resultante pode crescer consideravelmente. Recomenda-se o uso de compressão (Gzip/Brotli) se o objetivo for transmissão frequente via rede.
- **Determinismo:** A ordem das chaves no JSON é mantida, garantindo que a mesma AST sempre resulte na mesma string de hibernação (útil para hashing).
