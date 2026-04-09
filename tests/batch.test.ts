import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { CalcAUY } from "../src/builder.ts";

describe("CalcAUY - Batch Processing", () => {
    it("deve processar um lote de itens corretamente", async () => {
        const items = [10, 20, 30, 40, 50];
        const results = await CalcAUY.processBatch(items, (val) => {
            return CalcAUY.from(val).add(5).commit().toFloatNumber();
        }, { batchSize: 2 });

        expect(results).toEqual([15, 25, 35, 45, 55]);
    });

    it("deve reportar o progresso corretamente", async () => {
        const items = Array.from({ length: 10 }).map((_, i) => i);
        const progressReports: number[] = [];

        await CalcAUY.processBatch(items, (val) => val, {
            batchSize: 2,
            onProgress: (p) => progressReports.push(p),
        });

        // Com batchSize 2 e 10 itens, deve reportar a cada 2 itens (20%, 40%, 60%, 80%) + final (100%)
        expect(progressReports).toContain(20);
        expect(progressReports).toContain(40);
        expect(progressReports).toContain(60);
        expect(progressReports).toContain(80);
        expect(progressReports).toContain(100);
    });

    it("deve funcionar com grandes volumes sem erros de integridade", async () => {
        const items = Array.from({ length: 5000 }).map(() => "1.5");
        const results = await CalcAUY.processBatch(items, (val) => {
            return CalcAUY.from(val).mult(2).commit().toStringNumber({ decimalPrecision: 1 });
        }, { batchSize: 1000 });

        expect(results.length).toBe(5000);
        expect(results[0]).toBe("3.0");
        expect(results[4999]).toBe("3.0");
    });
});
