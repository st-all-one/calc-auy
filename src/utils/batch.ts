/**
 * CalcAUY - Utilitário de Processamento em Lotes (Batch Processing)
 * @module
 */

/** Opções para configuração do processamento em lote. */
export interface BatchOptions {
    /**
     * Tamanho de cada lote antes de ceder a execução (yielding).
     * @default 1000
     */
    batchSize?: number;
    /**
     * Callback opcional chamado a cada lote concluído com o percentual de progresso (0-100).
     */
    onProgress?: (progress: number) => void;
}

/**
 * Processa um array de itens de forma assíncrona e em lotes, cedendo o controle
 * para o Event Loop a cada intervalo definido para evitar travamentos (UI/Server).
 *
 * @typeParam T - Tipo dos dados de entrada.
 * @typeParam R - Tipo do resultado gerado.
 * @param items Array de itens a serem processados.
 * @param task Função a ser executada para cada item.
 * @param options Configurações de lote e progresso.
 * @returns Promise que resolve com o array de resultados processados.
 */
export async function processBatch<T, R>(
    items: T[],
    task: (item: T, index: number) => R,
    options: BatchOptions = {},
): Promise<R[]> {
    const { batchSize = 1000, onProgress } = options;
    const results: R[] = new Array(items.length);
    const total = items.length;

    for (let i = 0; i < total; i++) {
        results[i] = task(items[i], i);

        // A cada fim de lote, cedemos a CPU
        if ((i + 1) % batchSize === 0 && i < total - 1) {
            if (onProgress) {
                onProgress(Math.round(((i + 1) / total) * 100));
            }

            // Mecanismo de Yielding (Respiração do Event Loop)
            // @ts-ignore: scheduler.yield is available in Deno and modern browsers
            if (typeof globalThis.scheduler?.yield === "function") {
                // @ts-ignore: scheduler API
                // deno-lint-ignore no-await-in-loop
                await globalThis.scheduler.yield();
            } else {
                // Fallback para ambientes sem Scheduler API (Node.js antigo/Polyfills)
                // deno-lint-ignore no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 0));
            }
        }
    }

    if (onProgress) { onProgress(100); }
    return results;
}
