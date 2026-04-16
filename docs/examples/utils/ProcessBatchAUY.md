# Utilitário: `ProcessBatchAUY()`

O `ProcessBatchAUY` é um engine de processamento massivo assíncrono. Ele foi projetado para lidar com volumes industriais de dados (1M+ registros) sem travar o **Event Loop** do servidor, utilizando técnicas de *Yielding* e *Logical Parallelism*.

## Por que é necessário?
Em ambientes Deno ou Node.js, cálculos matemáticos complexos são síncronos e pesados. Se você rodar um loop simples (`.map`) com 100.000 cálculos, o servidor parará de responder a qualquer requisição HTTP ou pings de saúde até terminar. O `ProcessBatchAUY` pausa brevemente a cada lote para deixar o sistema "respirar".

## Assinatura
```ts
export async function ProcessBatchAUY<InputType, ResultType>(
    items: InputType[],
    task: (item: InputType, index: number) => ResultType | Promise<ResultType>,
    options?: BatchOptions
): Promise<ResultType[] | ResultType>
```

## Exemplos de Uso

### 1. Processamento de Folha de Pagamento (Anti-Bloqueio)
Processar 10.000 salários mantendo o servidor responsivo para outros usuários.
```ts
import { CalcAUY, ProcessBatchAUY } from "@st-all-one/calc-auy";

const salarios = [/* 10.000 itens */];

const resultados = await ProcessBatchAUY(salarios, (valor) => {
    return CalcAUY.from(valor).mult("1.10").commit();
}, { 
    batchSize: 1000,
    onProgress: (p) => console.log(`Progresso do Faturamento: ${p}%`)
});
```

### 2. Consolidação Massiva com Reducer (Economia de RAM)
Ao usar um `reducer`, o utilitário não mantém um array gigante na memória, acumulando o resultado conforme processa.
```ts
const totalGeral = await ProcessBatchAUY(vendas, (v) => v.valor, {
    accumulator: 0,
    reducer: (acc, val) => acc + val
});
```

### 3. Paralelismo Lógico (Workers)
Para tarefas extremamente pesadas de CPU, você pode dividir o trabalho em chunks concorrentes.
```ts
await ProcessBatchAUY(dados, tarefa, {
    logicalWorkers: 4 // Divide o array em 4 partes processadas via Promise.all
});
```

## Opções (`BatchOptions`)
| Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `batchSize` | `number` | `1000` | Tamanho do lote antes do yielding. |
| `logicalWorkers` | `number` | `0` | Número de fluxos concorrentes. |
| `onProgress` | `Function` | `-` | Callback de progresso (0-100). |
| `reducer` | `Function` | `-` | Função de acúmulo de massa. |
| `accumulator` | `any` | `-` | Valor inicial do acúmulo. |
