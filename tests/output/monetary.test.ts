import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@src/main.ts";

describe("Output: Monetary Formatting", () => {
    const Engine = CalcAUY.create({
        contextLabel: "monetary-test",
        salt: "salt",
        roundStrategy: "NBR5891",
    });

    it("toMonetary: deve formatar em BRL (padrão pt-BR)", async () => {
        const output = await Engine.from(1234.56).commit();
        const res = output.toMonetary();
        assertEquals(res.replace(/[\u00a0\u202f]/g, " "), "R$ 1.234,56");
    });

    it("toMonetary: deve suportar USD (en-US)", async () => {
        const output = await Engine.from(1234.56).commit();
        const res = output.toMonetary({ locale: "en-US", currency: "USD" });
        assertEquals(res.replace(/[\u00a0\u202f]/g, " "), "$1,234.56");
    });

    it("toMonetary: deve suportar EUR (fr-FR)", async () => {
        const output = await Engine.from(1234.56).commit();
        const res = output.toMonetary({ locale: "fr-FR", currency: "EUR" });
        assertEquals(res.replace(/[\u00a0\u202f]/g, " "), "1 234,56 €");
    });

    it("toMonetary: deve respeitar precisão customizada", async () => {
        const output = await Engine.from(100).commit();
        const res = output.toMonetary({ decimalPrecision: 3 });
        assertEquals(res.replace(/[\u00a0\u202f]/g, " "), "R$ 100,000");
    });

    it("toMonetary: deve lidar com arredondamento fiscal antes da formatação", async () => {
        const output = await Engine.from(1.225).commit(); // NBR5891 -> 1.22
        assertEquals(output.toMonetary().replace(/[\u00a0\u202f]/g, " "), "R$ 1,22");

        const output2 = await Engine.from(1.235).commit(); // NBR5891 -> 1.24
        assertEquals(output2.toMonetary().replace(/[\u00a0\u202f]/g, " "), "R$ 1,24");
    });

    it("deve reutilizar formatadores em cache", async () => {
        const output = await Engine.from(10).commit();
        const res1 = output.toMonetary();
        const res2 = output.toMonetary();
        assertEquals(res1, res2);
    });

    it("deve permitir troca de moeda mantendo o locale", async () => {
        const output = await Engine.from(100).commit();
        const res = output.toMonetary({ locale: "pt-BR", currency: "USD" });
        assertEquals(res.replace(/[\u00a0\u202f]/g, " "), "$ 100,00");
    });
});
