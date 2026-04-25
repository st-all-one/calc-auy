# 18 - Processamento em Lotes (Batch Processing)

```mermaid
sequenceDiagram
    participant Batch as ProcessBatchAUY
    participant Loop as Event Loop
    participant CPU as Engine
    
    Batch->>CPU: Calc Lote N
    CPU-->>Batch: Ok
    Batch->>Loop: scheduler.yield()
    Note right of Loop: Processa IO/UI
    Loop-->>Batch: Retoma
    Batch->>CPU: Calc Lote N+1
```

## Objetivo
Permitir o processamento massivo de cálculos sem comprometer a responsividade do servidor ou da interface do usuário (UI). Esta funcionalidade ajuda os desenvolvedores a seguirem boas práticas em ambientes single-threaded (Deno/Node.js), evitando o bloqueio do Event Loop durante operações intensivas de CPU.

## O Problema do Bloqueio
Cálculos que utilizam BigInt, recursão de AST e Newton-Raphson (raízes) são síncronos e pesados. Se um desenvolvedor tentar processar 100.000 cálculos em um loop simples (`Array.map`), o servidor parará de responder a requisições HTTP até que o último cálculo termine.

## A Solução: Yielding
O utilitário `ProcessBatchAUY` utiliza o mecanismo de **Yielding** (ceder a CPU). A cada lote de tamanho N, o processamento pausa brevemente para permitir que o Event Loop execute outras tarefas pendentes (como I/O, timers ou requisições de rede).

- **Prioridade:** Utiliza `scheduler.yield()` em ambientes modernos para uma transição suave.
- **Fallback:** Utiliza `setTimeout(0)` em ambientes sem suporte à Scheduler API.

## API

### `ProcessBatchAUY<T, R>`
Utilitário para processamento assíncrono independente do core.

**Parâmetros:**
- `items: T[]`: Array de dados a serem processados.
- `task: (item: T, index: number) => R`: Função que realiza o cálculo para cada item.
- `options: BatchOptions`:
    - `batchSize: number` (Padrão: 1000): Quantidade de itens por lote.
    - `onProgress: (p: number) => void`: Callback de progresso (0-100).

**Exemplo de Uso:**

```ts
const invoices = [/* milhares de itens */];

const results = await ProcessBatchAUY(invoices, (inv) => {
    return CalcAUY.from(inv.amount)
        .mult(inv.taxRate)
        .commit();
}, {
    batchSize: 500,
    onProgress: (p) => console.log(`Calculando faturas: ${p}%`)
});
```

## Benefícios
1. **Server-Friendly:** O servidor continua aceitando novas conexões HTTP durante cálculos longos.
2. **UI-Friendly:** Em aplicações front-end, evita que a interface "congele" ou mostre o aviso de "Página sem resposta".
3. **Auditabilidade de Massa:** Facilita a geração de grandes volumes de rastros de auditoria sem picos de latência no sistema.
