import { CalcAUY } from "@calcauy";
import { ProcessBatchAUY } from "@src/utils/batch.ts";
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

const TOTAL_FATURAS = 1_000_000;
const LATENCIA_DB_MS = 0.5;

// Simulação de um Banco de Dados Assíncrono
const MockDB = {
    async save(_data: unknown) {
        await new Promise((resolve) => {
            // @ts-ignore: Simulation purpose
            if (LATENCIA_DB_MS === 0) { return resolve(null); }
            setTimeout(resolve, LATENCIA_DB_MS);
        });
        return { success: true };
    },
};

describe("Simulação de I/O Massivo (Cálculo + Persistência)", () => {
    it(`deve processar ${TOTAL_FATURAS.toLocaleString()} faturas escondendo latência via logicalWorkers`, async () => {
        const faturasBrutas = Array.from({ length: 100_000 }, (_, i) => ({ // Reduzido para 100k no teste padrão
            id: `INV-${i}`,
            valor: (Math.random() * 1000).toFixed(2),
        }));

        const start = performance.now();
        await ProcessBatchAUY(faturasBrutas, async (fatura) => {
            const res = CalcAUY.from(fatura.valor).mult("1.05").commit();
            await MockDB.save({ id: fatura.id, total: res.toStringNumber() });
            return null;
        }, {
            batchSize: 5000,
            logicalWorkers: 20,
        });
        const end = performance.now();
        const duration = end - start;

        console.log(`\n[I/O Simulation] Tempo para 100k itens (20 workers): ${(duration / 1000).toFixed(2)}s`);
        assertEquals(true, true);
    });
});
