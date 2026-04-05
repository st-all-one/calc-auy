import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "../mod.ts";

describe("CalcAUY - Integração e Auditoria", () => {
    describe("Fluxo Básico e Precedência", () => {
        it("deve calcular uma expressão simples com precedência correta", () => {
            // 10 + 5 * 2 = 20
            const res = CalcAUY.from(10).add(5).mult(2).commit("NBR5891");
            assertEquals(res.toString(), "20.00");
            assertEquals(res.toLaTeX(), "10 + 5 \\times 2");
        });

        it("deve respeitar a associatividade à direita na potência", () => {
            // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
            const res = CalcAUY.from(2).pow(3).pow(2).commit("NBR5891");
            assertEquals(res.toString({ decimalPrecision: 0 }), "512");
        });

        it("deve aplicar o auto-agrupamento ao injetar instâncias", () => {
            // 10 * (2 + 3) = 50
            const sub = CalcAUY.from(2).add(3);
            const res = CalcAUY.from(10).mult(sub).commit("NBR5891");
            assertEquals(res.toString(), "50.00");
            assertEquals(res.toLaTeX(), "10 \\times \\left( 2 + 3 \\right)");
        });
    });

    describe("Hibernação e Reidratação", () => {
        it("deve hibernar e reidratar um cálculo sem perda de estado", () => {
            const original = CalcAUY.from(100).add(50).setMetadata("user", "admin");
            const ast = original.hibernate();

            const rehydrated = CalcAUY.hydrate(ast);
            const res = rehydrated.mult(2).commit("NBR5891");

            // 100 + 50 * 2 = 200 (Precedência PEMDAS)
            assertEquals(res.toString(), "200.00");
            const trace = res.toAuditTrace();
            // O metadado 'user' foi anexado ao nó '+', que continua sendo a raiz após a rotação para '*'
            assertEquals(trace.ast.metadata.user, "admin");
        });
    });

    describe("Rateio e Slicing (Maior Resto)", () => {
        it("deve distribuir centavos corretamente no toSlice", () => {
            // 10.00 / 3 = [3.34, 3.33, 3.33]
            const res = CalcAUY.from(10).commit("NBR5891");
            const slices = res.toSlice(3, { decimalPrecision: 2 });
            assertEquals(slices, ["3.34", "3.33", "3.33"]);

            // Soma deve bater exatamente
            const sum = slices.reduce((a, b) => (parseFloat(a) + parseFloat(b)).toString());
            assertEquals(parseFloat(sum), 10.00);
        });

        it("deve distribuir centavos corretamente no toSliceByRatio", () => {
            // 10.00 rateado em 30% e 70% -> [3.00, 7.00]
            const res = CalcAUY.from(10).commit("NBR5891");
            const slices = res.toSliceByRatio(["30%", "70%"], { decimalPrecision: 2 });
            assertEquals(slices, ["3.00", "7.00"]);
        });
    });

    describe("Acessibilidade (Verbal A11y)", () => {
        it("deve gerar rastro verbal em pt-BR", () => {
            const res = CalcAUY.from(10).add(5).commit("NBR5891");
            const verbal = res.toVerbalA11y({ locale: "pt-BR", decimalPrecision: 2 });
            assertEquals(verbal, "10 mais 5 é igual a 15 vírgula 00 (Arredondamento: NBR para 2 casas decimais).");
        });

        it("deve gerar rastro verbal em en-US", () => {
            const res = CalcAUY.from(10).add(5).commit("NBR5891");
            const verbal = res.toVerbalA11y({ locale: "en-US", decimalPrecision: 2 });
            assertEquals(verbal, "10 plus 5 is equal to 15 point 00 (Rounding: NBR for 2 decimal places).");
        });
    });

    describe("Parsing de Expressões", () => {
        it("deve processar uma string complexa e manter a AST funcional", () => {
            const res = CalcAUY.parseExpression("(10 + 5) * 2 ^ 3").commit("NBR5891");
            // (10 + 5) * 8 = 15 * 8 = 120
            assertEquals(res.toString({ decimalPrecision: 0 }), "120");
        });
    });
});
