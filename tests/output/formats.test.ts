import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { CalcAUY } from "@src/main.ts";

describe("Output: Formats (Unicode, LaTeX, JSON)", () => {
    const Engine = CalcAUY.create({
        contextLabel: "format-test",
        salt: "salt",
        roundStrategy: "NBR5891",
    });

    it("toUnicode: deve gerar representação legível com subscrito da estratégia", async () => {
        const output = await Engine.from(100).add(50).commit();
        const unicode = output.toUnicode();

        // Exemplo esperado: roundₙᵦᵣ₋₅₈₉₁(100 + 50, 2) = 150.00
        assertStringIncludes(unicode, "round");
        assertStringIncludes(unicode, "(100 + 50, 2) = 150.00");
    });

    it("toLaTeX: deve gerar representação LaTeX válida com escape de caracteres", async () => {
        const output = await Engine.from(100).mult("15%").commit();
        const latex = output.toLaTeX();

        // Exemplo esperado: \text{round}_{\text{NBR-5891}}(100 \times 15\%, 2) = 15.00
        assertStringIncludes(latex, "\\text{round}");
        assertStringIncludes(latex, "\\text{NBR-5891}");
        assertStringIncludes(latex, "15\\%"); // Escape de %
        assertStringIncludes(latex, "= 15.00");
    });

    it("toJSON: deve exportar múltiplos formatos em um único objeto serializável", async () => {
        const output = await Engine.from(1000).div(3).commit();
        const jsonStr = output.toJSON(["toMonetary", "toUnicode", "toScaledBigInt"]);
        const data = JSON.parse(jsonStr);

        assertEquals(typeof data.toMonetary, "string");
        assertEquals(typeof data.toUnicode, "string");
        assertEquals(typeof data.toScaledBigInt, "string"); // BigInt serializado como string
        assertEquals(data.signature.length > 0, true);
        assertEquals(data.contextLabel, "format-test");
    });

    it("toJSON: deve exportar formatos padrão se nenhum for especificado", async () => {
        const output = await Engine.from(100).commit();
        const data = JSON.parse(output.toJSON());

        assertEquals(data.toStringNumber, "100.00");
        // Normaliza espaços para evitar falhas por U+00A0 ou U+202F
        assertEquals(data.toMonetary.replace(/[\u00a0\u202f]/g, " "), "R$ 100,00");
        assertEquals(data.signature !== undefined, true);
    });

    it("toStringNumber: deve respeitar a precisão customizada", async () => {
        const output = await Engine.from(10.12345).commit();
        // NBR5891: 4 é par, então 10.12345 -> 10.1234
        assertEquals(output.toStringNumber({ decimalPrecision: 4 }), "10.1234");
        assertEquals(output.toStringNumber({ decimalPrecision: 2 }), "10.12");
    });

    it("toScaledBigInt: deve retornar o valor escalonado", async () => {
        const output = await Engine.from("10.50").commit();
        assertEquals(output.toScaledBigInt({ decimalPrecision: 2 }), 1050n);
        // NBR5891: 10.50 -> 10 (0 é par)
        assertEquals(output.toScaledBigInt({ decimalPrecision: 0 }), 10n);
    });

    it("toRawInternalNumber: deve retornar numerador e denominador puros", async () => {
        const output = await Engine.from("1/3").commit();
        const { n, d } = output.toRawInternalNumber();
        assertEquals(n, 1n);
        assertEquals(d, 3n);
    });

    it("deve usar cache para resultados repetidos", async () => {
        const output = await Engine.from(100).add(50).commit();
        const first = output.toUnicode();
        const second = output.toUnicode();
        assertEquals(first === second, true);
    });

    it("com roundStrategy NONE: deve remover zeros à direita no toStringNumber", async () => {
        const NoneEngine = CalcAUY.create({ contextLabel: "none", salt: "s", roundStrategy: "NONE" });
        const output = await NoneEngine.from("10.5000").commit();
        assertEquals(output.toStringNumber(), "10.5");

        const outputInt = await NoneEngine.from("10.000").commit();
        assertEquals(outputInt.toStringNumber(), "10");
    });
});
