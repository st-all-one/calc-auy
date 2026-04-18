# Método: `hydrate()` (Static)

O `hydrate()` é o mecanismo de restauração de estado da CalcAUY. Ele permite reconstruir uma instância funcional do builder a partir de dados serializados (JSON), garantindo a continuidade do cálculo e do rastro de auditoria.

## ⚙️ Funcionamento Interno

1.  **Análise de Entrada:** Detecta se a entrada é uma `string` JSON, um objeto literal de AST ou um snapshot completo de auditoria.
2.  **Extração Inteligente:** Se detectar um objeto gerado pelo `toAuditTrace()`, o método extrai automaticamente a chave `ast`, ignorando os resultados finais já calculados para permitir novas operações.
3.  **Validação Estrutural:** Invoca o `validateASTNode()`, verificando se todos os nós possuem os campos obrigatórios (`kind`, `value`, etc.) e se a hierarquia é válida.
4.  **Re-instanciação:** Cria uma nova instância de `CalcAUY` com a árvore reconstruída, mantendo todos os metadados originais.

## 🎯 Propósito
Permitir o transporte de cálculos entre diferentes serviços, rastro de auditoria persistente e a retomada de operações complexas que foram interrompidas ou salvas em banco de dados.

## 💼 10 Casos de Uso Reais

1.  **Retomada de Fluxo de Aprovação:** Um cálculo iniciado por um analista e finalizado por um gerente.
```typescript
// Exemplo 1: Carregando do banco de aprovações
const calc = CalcAUY.hydrate(approval.math_state);
```
```typescript
// Exemplo 2: Continuidade de cálculo após aprovação
const final = CalcAUY.hydrate(pendingJson).add(50).commit();
```

2.  **Audit Trail Rehydration:** Validar um cálculo meses depois a partir do rastro JSON.
```typescript
// Exemplo 1: Verificação de auditoria
const trace = await db.logs.find(id);
const isValid = CalcAUY.hydrate(trace).commit().toRawInternalBigInt() === trace.expected;
```
```typescript
// Exemplo 2: Re-geração de rastro visual (LaTeX) de anos atrás
const visual = CalcAUY.hydrate(oldTrace).commit().toLaTeX();
```

3.  **Comunicação entre Microserviços:** Envio da lógica do cálculo via fila (RabbitMQ/Kafka).
```typescript
// Exemplo 1: Consumo de mensagem de fila
const calc = CalcAUY.hydrate(msg.content.toString());
```
```typescript
// Exemplo 2: Envio para serviço de relatórios
axios.post(reportUrl, { state: res.hibernate() });
```

4.  **Caches de Estado Temporário:** Salvar o progresso de um cálculo longo no Redis.
```typescript
// Exemplo 1: Recuperação de cache
const state = await redis.get(`session:${userId}`);
const calc = CalcAUY.hydrate(state);
```
```typescript
// Exemplo 2: Snapshot de progresso em Step-by-Step UI
localStorage.setItem("wizard_calc", calc.hibernate());
```

5.  **Testes de Regressão Automatizados:** Reconstrução de cenários de erro reportados por clientes.
```typescript
// Exemplo 1: Setup de teste via JSON de produção
const reproduction = CalcAUY.hydrate(bugReport.json_ast);
```
```typescript
// Exemplo 2: Teste de mutação de árvore
const mutated = CalcAUY.hydrate(baseAST).mult(2);
```

6.  **Migração de Dados:** Transformação de registros legados para o formato CalcAUY.
```typescript
// Exemplo 1: Conversão de sistema antigo
const calc = CalcAUY.hydrate({ kind: "literal", value: { n: "10", d: "1" } });
```
```typescript
// Exemplo 2: Importação em lote de faturas
const faturas = jsonList.map(j => CalcAUY.hydrate(j));
```

7.  **Sistemas de "Undo/Redo":** Navegação no histórico de versões de um cálculo.
```typescript
// Exemplo 1: Restaurar versão anterior
const prev = CalcAUY.hydrate(history.pop());
```
```typescript
// Exemplo 2: Time-travel debugging
const stateAtT5 = CalcAUY.hydrate(timeline[5]);
```

8.  **Persistência em Documentos (MongoDB):** Armazenamento de fórmulas aninhadas em documentos.
```typescript
// Exemplo 1: Recuperação de documento
const doc = await collection.findOne({ _id: id });
const formula = CalcAUY.hydrate(doc.logic);
```
```typescript
// Exemplo 2: Update parcial de lógica
const newLogic = CalcAUY.hydrate(doc.logic).add(tax);
```

9.  **Integração com Front-end State (Redux/Pinia):** Manter a AST no estado da aplicação.
```typescript
// Exemplo 1: Hidratação de estado global
const calc = CalcAUY.hydrate(store.state.calculation);
```
```typescript
// Exemplo 2: Serialização para persistência de aba
const storeData = output.getAST();
```

10. **Geração de Provas Forenses:** Envio da árvore para perícia técnica independente.
```typescript
// Exemplo 1: Envelope de auditoria
const envelope = { method: "CalcAUY", logic: res.getAST() };
```
```typescript
// Exemplo 2: Validação por perito
const peritoCalc = CalcAUY.hydrate(envelope.logic);
```

## 🛠️ Opções Permitidas

- `ast`: `CalculationNode | string | object` (A estrutura serializada).

## 🏗️ Anotações de Engenharia
- **Detecção de Envelope:** O método é resiliente. Ele sabe distinguir entre `{ "kind": "literal", ... }` e `{ "ast": { "kind": "literal" }, "finalResult": ... }`. Isso simplifica muito a vida do desenvolvedor que não precisa tratar o objeto antes de hidratar.
- **Segurança Forense:** Ao hidratar, a CalcAUY revalida toda a estrutura. Se um JSON malicioso for injetado com chaves inválidas ou tipos não suportados, o método lançará um `CalcAUYError` imediato.
- **BigInt Safety:** Lida corretamente com numeradores e denominadores salvos como strings (padrão de hibernação).
