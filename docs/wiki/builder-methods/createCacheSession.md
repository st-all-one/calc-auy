# Método: `createCacheSession()` (Static)

O `createCacheSession()` ativa o sistema de gerenciamento de memória escopada da CalcAUY. Ele utiliza o protocolo **Explicit Resource Management** (`using`) para criar caches temporários de alta performance que são destruídos automaticamente ao final de um bloco de código.

## ⚙️ Funcionamento Interno

1.  **Pilha de Sessões:** O método empilha uma nova `RationalCacheSession` na stack global da engine.
2.  **Captura de Referências:** Durante a validade da sessão, todas as chamadas a `RationalNumber.from()` ou `CalcAUY.from()` utilizam um `Map` de referências fortes dentro da sessão, antes de consultarem o cache global ou o Cold Cache.
3.  **Hot Path Optimization:** Diferente do cache inteligente (`WeakRef`), a sessão mantém os objetos vivos (referência forte), garantindo que não haja o overhead de `deref()` ou o risco de coleta pelo GC durante o loop crítico.
4.  **Protocolo de Descarte:** Implementa o `Symbol.dispose`. Ao sair do escopo `using`, a sessão limpa seu `Map` interno e é desempilhada, liberando a memória instantaneamente para o Garbage Collector.

## 🎯 Propósito
Otimizar o uso de memória e a velocidade de execução em processamentos massivos (milhões de iterações), onde o acúmulo de instâncias temporárias poderia degradar a performance do sistema.

## 💼 10 Casos de Uso Reais

1.  **Processamento de Folha de Pagamento:** Milhares de cálculos de impostos com as mesmas alíquotas.
```typescript
// Exemplo 1: Loop de funcionários
{
  using _session = CalcAUY.createCacheSession();
  for (const emp of employees) { calcular(emp); }
}
```
```typescript
// Exemplo 2: Batch de holerites
{
  using _ = CalcAUY.createCacheSession();
  const res = employees.map(e => CalcAUY.from(e.salary).add(bonus).commit());
}
```

2.  **Migração de Dados em Massa:** Ingestão de milhões de linhas de faturamento legado.
```typescript
// Exemplo 1: Importador CSV
{
  using _s = CalcAUY.createCacheSession();
  await pipeline.forEach(row => importRow(row));
}
```
```typescript
// Exemplo 2: Sincronização de Banco de Dados
{
  using _ = CalcAUY.createCacheSession();
  const bulk = await db.raw.findMany();
}
```

3.  **Geração de Relatórios Consolidados:** Agregação de grandes volumes de transações.
```typescript
// Exemplo 1: Soma de GMV anual
{
  using _session = CalcAUY.createCacheSession();
  const total = transactions.reduce((acc, t) => acc.add(t.val), CalcAUY.from(0));
}
```
```typescript
// Exemplo 2: Consolidação por categoria
{
  using _ = CalcAUY.createCacheSession();
  summarize(data);
}
```

4.  **Simulações de Monte Carlo:** Execução repetitiva da mesma fórmula com variações mínimas.
```typescript
// Exemplo 1: Stress test de carteira
{
  using _ = CalcAUY.createCacheSession();
  for (let i=0; i<100000; i++) { runSimulation(); }
}
```
```typescript
// Exemplo 2: Cálculo de probabilidade de risco
{
  using _s = CalcAUY.createCacheSession();
  iterateRiskScenarios();
}
```

5.  **Cálculo de Rateio Complexo:** Distribuição de valores entre milhares de sub-contas.
```typescript
// Exemplo 1: Rateio de dividendos de fundo
{
  using _ = CalcAUY.createCacheSession();
  total.toSlice(shareholders.length);
}
```
```typescript
// Exemplo 2: Divisão de custos compartilhados
{
  using _session = CalcAUY.createCacheSession();
  performBulkSlicing();
}
```

6.  **APIs de Alta Frequência:** Processar múltiplas requisições em um único escopo de worker.
```typescript
// Exemplo 1: Handler de fila assíncrona
async function handleBatch(msgs) {
  using _ = CalcAUY.createCacheSession();
  await Promise.all(msgs.map(m => process(m)));
}
```
```typescript
// Exemplo 2: Middleware de telemetria
{
  using _ = CalcAUY.createCacheSession();
  runBusinessLogic();
}
```

7.  **Reidratação de Grande Volume de ASTs:** Carregar milhares de rastros de auditoria para análise.
```typescript
// Exemplo 1: Crawler de auditoria
{
  using _ = CalcAUY.createCacheSession();
  traces.map(t => CalcAUY.hydrate(t));
}
```
```typescript
// Exemplo 2: Verificação de integridade em massa
{
  using _s = CalcAUY.createCacheSession();
  validateAllHistories();
}
```

8.  **Cálculo de Preços em Tempo Real:** Motores de precificação para trading ou apostas.
```typescript
// Exemplo 1: Update de ticker
{
  using _ = CalcAUY.createCacheSession();
  recalculateAllPrices();
}
```
```typescript
// Exemplo 2: Ajuste de odds dinâmica
{
  using _session = CalcAUY.createCacheSession();
  applyMarketVolatility();
}
```

9.  **Geração de Faturas Mensais:** Ciclos de billing onde números como "taxa de IOF" se repetem.
```typescript
// Exemplo 1: Ciclo de faturamento de cartões
{
  using _ = CalcAUY.createCacheSession();
  billingItems.forEach(i => processTax(i));
}
```
```typescript
// Exemplo 2: Emissão de boletos em lote
{
  using _s = CalcAUY.createCacheSession();
  generateAllPDFs();
}
```

10. **Engenharia de Dados (ETL):** Transformação de fluxos de dados numéricos.
```typescript
// Exemplo 1: Transformer de pipeline
{
  using _ = CalcAUY.createCacheSession();
  stream.pipe(transformer);
}
```
```typescript
// Exemplo 2: Limpeza de dataset financeiro
{
  using _session = CalcAUY.createCacheSession();
  sanitizeNumbers(dataset);
}
```

## 🛠️ Opções Permitidas

- (Nenhuma) - Retorna um objeto `Disposable`.

## 🏗️ Anotações de Engenharia
- **Custo Zero se não usado:** Se o código não estiver dentro de um bloco `using`, a biblioteca utiliza o cache inteligente (`WeakRef`) por padrão, que é resiliente mas possui o overhead do `deref()`.
- **Prevenção de Vazamento:** O uso de `using` garante a limpeza mesmo em caso de erros (`try/catch` implícito do motor JS).
- **Aninhamento:** As sessões podem ser aninhadas. A CalcAUY sempre usará a sessão no topo da pilha, permitindo caches especializados para sub-processos.
