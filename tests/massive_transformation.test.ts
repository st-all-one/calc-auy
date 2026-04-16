import { CalcAUY } from "@calcauy";
import { ProcessBatchAUY } from "@src/utils/batch.ts";
import { CalcAUYOutput } from "@src/output.ts";
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

const TOTAL_ITEMS = 1_000_000;
const WORKERS = 15;

describe("Benchmark Massivo: Transformação de Dados", () => {
    it(`deve transformar ${TOTAL_ITEMS.toLocaleString()} itens usando ${WORKERS} workers lógicos`, async () => {
        const input = Array.from({ length: TOTAL_ITEMS }, (_, i) => i);
        const start = performance.now();

        const resultados = await ProcessBatchAUY(input, (num: number) => {
            return CalcAUY.from(num).add(1).group().mult(2).commit();
        }, {
            batchSize: 10000,
            logicalWorkers: WORKERS,
        }) as CalcAUYOutput[];

        const end = performance.now();
        const duration = end - start;

        console.log(
            `\n[Massive Transformation] Tempo para ${TOTAL_ITEMS.toLocaleString()} itens: ${duration.toFixed(2)}ms`,
        );

        // Amostragem aleatória para corretude
        const sampleSize = 5;
        const precision = 2;
        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * TOTAL_ITEMS);
            const inputVal = input[randomIndex];
            const expected = ((inputVal + 1) * 2).toFixed(precision);
            const actual = resultados[randomIndex].toStringNumber({ decimalPrecision: precision });
            assertEquals(actual, expected);
        }

        assertEquals(resultados.length, TOTAL_ITEMS);
    });
});
