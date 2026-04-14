import { CalcAUY } from "@calcauy";
import { assertEquals } from "@std/assert";
import { DB } from "@sqlite";
import { describe, it } from "@std/testing/bdd";

const DB_FILE = "tests/forensic.db";
const TOTAL_DB = 1_000_000;
const AMOSTRAS = 100_000;

describe("Auditoria Forense: Integridade de Dados Hibernados", () => {
    it(`deve garantir re-hidratação bit-perfect de ${AMOSTRAS} amostras sorteadas de uma base de ${TOTAL_DB}`, async () => {
        try {
            await Deno.remove(DB_FILE);
        } catch { /* ignore */ }
        const db = new DB(DB_FILE);
        db.execute("CREATE TABLE faturas (id INTEGER PRIMARY KEY, total_formatado TEXT, audit_json TEXT)");

        db.execute("BEGIN TRANSACTION");
        const insertQuery = db.prepareQuery("INSERT INTO faturas (total_formatado, audit_json) VALUES (?, ?)");

        for (let i = 0; i < TOTAL_DB; i++) {
            const valor = (Math.random() * 1000).toFixed(2);
            const calc = CalcAUY.from(valor).mult("1.05").setMetadata("ts", Date.now()).commit();
            insertQuery.execute([calc.toMonetary(), calc.toAuditTrace()]);
        }
        db.execute("COMMIT");
        insertQuery.finalize();

        const idsParaAuditar = Array.from({ length: AMOSTRAS }, () => Math.floor(Math.random() * TOTAL_DB) + 1);

        const start = performance.now();
        let falhas = 0;

        for (const id of idsParaAuditar) {
            const row = db.query("SELECT total_formatado, audit_json FROM faturas WHERE id = ?", [id])[0];
            const [totalNoBanco, auditJson] = row as [string, string];

            const rastroData = JSON.parse(auditJson);
            const rehydrated = CalcAUY.hydrate(rastroData);
            const commitNovo = rehydrated.commit({ roundStrategy: rastroData.strategy });
            const resultadoNovo = commitNovo.toMonetary();

            if (resultadoNovo !== totalNoBanco) {
                falhas++;
            }
        }

        const end = performance.now();
        console.log(
            `\n[Forensic Audit] Tempo de re-hidratação para ${AMOSTRAS} amostras: ${(end - start).toFixed(2)}ms`,
        );

        assertEquals(falhas, 0, "A integridade dos dados hidratados deve ser absoluta.");

        db.close();
        try {
            await Deno.remove(DB_FILE);
        } catch { /* ignore */ }
    });
});
