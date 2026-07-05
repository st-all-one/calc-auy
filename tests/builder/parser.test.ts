import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { CalcAUY } from "@src/main.ts";
import { CalcAUYError } from "@src/core/errors.ts";

describe("Builder: Parser (PEMDAS)", () => {
    const Engine = CalcAUY.create({
        contextLabel: "parser-test",
        salt: "salt",
        roundStrategy: "NONE",
    });

    it("deve resolver expressões simples", async () => {
        const res = await Engine.parseExpression("10 + 20").commit();
        assertEquals(res.toStringNumber(), "30");
    });

    it("deve respeitar a precedência PEMDAS (Multiplicação antes de Adição)", async () => {
        // 10 + 5 * 2 = 20
        const res = await Engine.parseExpression("10 + 5 * 2").commit();
        assertEquals(res.toStringNumber(), "20");
    });

    it("deve respeitar parênteses", async () => {
        // (10 + 5) * 2 = 30
        const res = await Engine.parseExpression("(10 + 5) * 2").commit();
        assertEquals(res.toStringNumber(), "30");
    });

    it("deve lidar com números negativos e decimais", async () => {
        const res = await Engine.parseExpression("-10.5 + 20.5").commit();
        assertEquals(res.toStringNumber(), "10");
    });

    it("deve suportar potenciação (^)", async () => {
        const res = await Engine.parseExpression("2 ^ 3").commit();
        assertEquals(res.toStringNumber(), "8");
    });

    it("deve suportar divisão inteira (//) e módulo (%)", async () => {
        const resDivInt = await Engine.parseExpression("10 // 3").commit();
        assertEquals(resDivInt.toStringNumber(), "3");

        const resMod = await Engine.parseExpression("10 % 3").commit();
        assertEquals(resMod.toStringNumber(), "1");
    });

    it("deve suportar notação científica", async () => {
        const res1 = await Engine.parseExpression("1e2").commit(); // 100
        assertEquals(res1.toStringNumber(), "100");

        const res2 = await Engine.parseExpression("1.5e-1").commit(); // 0.15
        assertEquals(res2.toStringNumber(), "0.15");

        const res3 = await Engine.parseExpression("10E+2").commit(); // 1000
        assertEquals(res3.toStringNumber(), "1000");
    });

    it("deve suportar underscores em números", async () => {
        const res = await Engine.parseExpression("1_000 + 500").commit();
        assertEquals(res.toStringNumber(), "1500");
    });

    it("deve lidar com precedência complexa", async () => {
        // 2 + 3 * 4 ^ 2 / 6 - 1
        // 2 + 3 * 16 / 6 - 1
        // 2 + 48 / 6 - 1
        // 2 + 8 - 1 = 9
        const res = await Engine.parseExpression("2 + 3 * 4 ^ 2 / 6 - 1").commit();
        assertEquals(res.toStringNumber(), "9");
    });

    it("deve lidar com múltiplos parênteses aninhados", async () => {
        const expr = "((10 + 5) * (20 / (2 + 3))) ^ 2";
        // ((15) * (20 / 5))^2 = (15 * 4)^2 = 60^2 = 3600
        const res = await Engine.parseExpression(expr).commit();
        assertEquals(res.toStringNumber(), "3600");
    });

    it("deve lançar erro para sintaxe inválida", () => {
        assertThrows(() => Engine.parseExpression("10 * / 5"), CalcAUYError);
        assertThrows(() => Engine.parseExpression("(10 + 5"), CalcAUYError);
        assertThrows(() => Engine.parseExpression("10 +"), CalcAUYError);
        assertThrows(() => Engine.parseExpression("* 10"), CalcAUYError);
    });

    it("deve ignorar espaços em branco extras", async () => {
        const res = await Engine.parseExpression("  10    +  ( 5   * 2 )  ").commit();
        assertEquals(res.toStringNumber(), "20");
    });

    it("deve lidar com números começando com ponto", async () => {
        const res = await Engine.parseExpression(".5 + .5").commit();
        assertEquals(res.toStringNumber(), "1");
    });
});
