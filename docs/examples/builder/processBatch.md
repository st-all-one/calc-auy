# Método: `CalcAUY.processBatch()`

Processa grandes volumes de dados de forma assíncrona, evitando o bloqueio do Event Loop do servidor através do mecanismo de *Yielding*.

## Assinatura
```ts
public static async processBatch<T, R>(
    items: T[],
    task: (item: T, index: number) => R,
    options?: BatchOptions
): Promise<R[]>
```

## Exemplos de Uso

### 1. Processamento de Folha de Pagamento
Processar 10.000 salários sem travar as requisições HTTP do seu servidor.
```ts
const salarios = [/* 10.000 itens */];

const resultados = await CalcAUY.processBatch(salarios, (valor) => {
    return CalcAUY.from(valor).mult("1.10").commit();
}, { 
    batchSize: 1000,
    onProgress: (p) => console.log(`Progresso: ${p}%`)
});
```

### 2. Uso com Interface de Progresso
```ts
await CalcAUY.processBatch(dados, tarefa, {
    onProgress: (percent) => {
        updateProgressBar(percent);
    }
});
```

## Por que usar?
Em ambientes Deno ou Node.js, cálculos pesados são síncronos. Se você rodar um loop simples com 100.000 cálculos, o servidor parará de responder a tudo (incluindo pings de saúde) até terminar. O `processBatch` pausa brevemente a cada lote (ex: 1.000 itens) para deixar o sistema operacional "respirar".
