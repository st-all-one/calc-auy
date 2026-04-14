import { CalcAUY } from "@calcauy";
import { assertEquals } from "@std/assert";
import { DB } from "@sqlite";
import { describe, it } from "@std/testing/bdd";

const TOTAL_FATURAS = 100_000;
const DB_FILE = "tests/test_optimized.db";

describe("Benchmark Real: CalcAUY + SQLite (Otimizado)", () => {
    it(`deve processar e inserir ${TOTAL_FATURAS.toLocaleString()} faturas via Transação Única em alta velocidade`, async () => {
        try {
            await Deno.remove(DB_FILE);
        } catch { /* ignore */ }
        const db = new DB(DB_FILE);

        db.execute("PRAGMA journal_mode = WAL;");
        db.execute("PRAGMA synchronous = OFF;");
        db.execute("PRAGMA temp_store = MEMORY;");
        db.execute("CREATE TABLE faturas (id TEXT PRIMARY KEY, valor TEXT, total TEXT, audit TEXT)");

        const query = db.prepareQuery("INSERT INTO faturas (id, valor, total, audit) VALUES (?, ?, ?, ?)");

        const faturasBrutas = Array.from({ length: TOTAL_FATURAS }, (_, i) => ({
            id: `INV-${i}`,
            valor: (Math.random() * 1000).toFixed(2),
        }));

        const start = performance.now();
        db.execute("BEGIN TRANSACTION");

        await CalcAUY.processBatch(faturasBrutas, (fatura) => {
            const res = CalcAUY.from(fatura.valor).mult("1.05").commit();
            query.execute([
                fatura.id,
                fatura.valor,
                res.toStringNumber(),
                res.toAuditTrace(),
            ]);
            return null;
        }, {
            batchSize: 5000,
            logicalWorkers: 0,
        });

        db.execute("COMMIT");
        const end = performance.now();
        const duration = end - start;

        const count = db.query("SELECT COUNT(*) FROM faturas")[0][0] as number;
        console.log(
            `\n[Optimized SQLite] Tempo para ${TOTAL_FATURAS.toLocaleString()} itens: ${(duration / 1000).toFixed(2)}s`,
        );

        assertEquals(count, TOTAL_FATURAS);

        query.finalize();
        db.close();
        await Deno.remove(DB_FILE);
    });
});
