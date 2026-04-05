import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "../mod.ts";

describe("CalcAUY - Integração e Auditoria", () => {
    describe("Fluxo Básico e Precedência", () => {
        it("deve calcular uma expressão simples com precedência correta", () => {
            // 10 + 5 * 2 = 20
            const res = CalcAUY.from(10).add(5).mult(2).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber(), "20.0000");
            assertEquals(res.toLaTeX(), "10 + 5 \\times 2");
        });

        it("deve respeitar a associatividade à direita na potência", () => {
            // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
            const res = CalcAUY.from(2).pow(3).pow(2).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber({ decimalPrecision: 0 }), "512");
        });

        it("deve aplicar o auto-agrupamento ao injetar instâncias", () => {
            // 10 * (2 + 3) = 50
            const sub = CalcAUY.from(2).add(3);
            const res = CalcAUY.from(10).mult(sub).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber(), "50.0000");
            assertEquals(res.toLaTeX(), "10 \\times \\left( 2 + 3 \\right)");
        });
    });

    describe("Hibernação e Reidratação", () => {
        it("deve hibernar e reidratar um cálculo sem perda de estado", () => {
            const original = CalcAUY.from(100).add(50).setMetadata("user", "admin");
            const ast = original.hibernate();

            const rehydrated = CalcAUY.hydrate(ast);
            const res = rehydrated.mult(2).commit({ roundStrategy: "NBR5891" });

            // 100 + 50 * 2 = 200 (Precedência PEMDAS)
            assertEquals(res.toStringNumber(), "200.0000");
            const trace = JSON.parse(res.toAuditTrace());
            assertEquals(trace.ast.metadata.user, "admin");
        });
    });

    describe("Rateio e Slicing (Maior Resto)", () => {
        it("deve distribuir centavos corretamente no toSlice", () => {
            // 10.00 / 3 = [3.3334, 3.3333, 3.3333] (para precisão 4)
            const res = CalcAUY.from(10).commit({ roundStrategy: "NBR5891" });
            const slices = res.toSlice(3); // Default precision 4
            assertEquals(slices, ["3.3334", "3.3333", "3.3333"]);

            // Soma deve bater exatamente
            const sum = slices.reduce((a, b) => (parseFloat(a) + parseFloat(b)).toFixed(4));
            assertEquals(parseFloat(sum), 10.00);
        });

        it("deve distribuir centavos corretamente no toSliceByRatio", () => {
            const res = CalcAUY.from(10).commit({ roundStrategy: "NBR5891" });
            const slices = res.toSliceByRatio(["30%", "70%"], { decimalPrecision: 2 });
            assertEquals(slices, ["3.00", "7.00"]);
        });
    });

    describe("Acessibilidade (Verbal A11y)", () => {
        it("deve gerar rastro verbal em pt-BR", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            const verbal = res.toVerbalA11y({ locale: "pt-BR", decimalPrecision: 2 });
            assertEquals(verbal, "10 mais 5 é igual a 15 vírgula 00 (Arredondamento: NBR para 2 casas decimais).");
        });

        it("deve gerar rastro verbal em en-US", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            const verbal = res.toVerbalA11y({ locale: "en-US", decimalPrecision: 2 });
            assertEquals(verbal, "10 plus 5 is equal to 15 point 00 (Rounding: NBR for 2 decimal places).");
        });

        it("deve gerar rastro Unicode enriquecido para potências e raízes", () => {
            const res = CalcAUY.from(2).pow(3).commit({ roundStrategy: "HALF_UP" });
            // roundₕᵤ(2³, 4) = 8.0000
            assertEquals(res.toUnicode(), "roundₕᵤ(2³, 4) = 8.0000");

            const raiz = CalcAUY.from(16).pow("1/2").commit({ roundStrategy: "TRUNCATE" });
            assertEquals(raiz.toUnicode({ decimalPrecision: 2 }), "roundₜᵣ(√(16), 2) = 4.00");
        });
    });

    describe("Exportação JSON", () => {
        it("deve exportar múltiplos formatos via toJSON", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            const json: any = res.toJSON(["toStringNumber", "toLaTeX"]);
            
            assertEquals(json["toStringNumber"], "15.0000");
            assertEquals(json["toLaTeX"], "10 + 5");
        });
    });

    describe("Parsing de Expressões", () => {
        it("deve processar uma string complexa e manter a AST funcional", () => {
            const res = CalcAUY.parseExpression("(10 + 5) * 2 ^ 3").commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber({ decimalPrecision: 0 }), "120");
        });
    });

    describe("Casos Extremos de Precedência", () => {
        it("deve calcular corretamente 2 + 5 * 3 ^ 2 ^ 2 ^ 2 via Fluent API e Parser", () => {
            const exp = "2 + 5 * 3 ^ 2 ^ 2 ^ 2";
            const expectedValue = "215233607.0000";

            const resFluent = CalcAUY.from(2).add(5).mult(3)
                .pow(CalcAUY.from(2).pow(2).pow(2))
                .commit({ roundStrategy: "NBR5891" });

            const resParser = CalcAUY.parseExpression(exp).commit({ roundStrategy: "NBR5891" });

            assertEquals(resFluent.toStringNumber(), expectedValue);
            assertEquals(resParser.toStringNumber(), expectedValue);
            
            // O Fluent API terá parênteses extras apenas na raiz da instância injetada
            assertEquals(resFluent.toLaTeX(), "2 + 5 \\times 3 ^ \\left( 2 ^ 2 ^ 2 \\right)");
            assertEquals(resParser.toLaTeX(), "2 + 5 \\times 3 ^ 2 ^ 2 ^ 2");
        });
    });
});
