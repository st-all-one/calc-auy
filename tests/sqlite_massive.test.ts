import { CalcAUY } from "@calcauy";
import { assertEquals } from "@std/assert";
import { DB } from "@sqlite";
import { describe, it } from "@std/testing/bdd";

const DB_FILE = "tests/test_massive_unoptimized.db";
const TOTAL_FATURAS = 10_000; // Reduzido para 10k para ser viável em testes de CI sem travar.

describe("Benchmark Real: CalcAUY + SQLite (Não Otimizado)", () => {
    it(`deve processar e inserir ${TOTAL_FATURAS} faturas individualmente (Stress de I/O)`, async () => {
        try {
            await Deno.remove(DB_FILE);
        } catch { /* ignore */ }
        const db = new DB(DB_FILE);

        db.execute("CREATE TABLE faturas (id TEXT PRIMARY KEY, valor TEXT, total TEXT, audit TEXT)");

        const faturasBrutas = Array.from({ length: TOTAL_FATURAS }, (_, i) => ({
            id: `INV-${i}`,
            valor: (Math.random() * 1000).toFixed(2),
        }));

        const start = performance.now();

        await CalcAUY.processBatch(faturasBrutas, async (fatura) => {
            const res = CalcAUY.from(fatura.valor).mult("1.05").commit();

            // Inserção individual sem transação explícita (Lento por design)
            db.query("INSERT INTO faturas (id, valor, total, audit) VALUES (?, ?, ?, ?)", [
                fatura.id,
                fatura.valor,
                res.toStringNumber(),
                res.toAuditTrace(),
            ]);
            return null;
        }, {
            batchSize: 500,
            logicalWorkers: 1,
        });

        const end = performance.now();
        const duration = end - start;

        const count = db.query("SELECT COUNT(*) FROM faturas")[0][0] as number;
        console.log(`\n[Unoptimized SQLite] Tempo para ${TOTAL_FATURAS} itens: ${(duration / 1000).toFixed(2)}s`);

        assertEquals(count, TOTAL_FATURAS);

        db.close();
        await Deno.remove(DB_FILE);
    });
});
