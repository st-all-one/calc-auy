import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { CalcAUY } from "../mod.ts";

describe("CalcAUY - Integração e Auditoria", () => {
    describe("Fluxo Básico e Precedência", () => {
        it("deve calcular uma expressão simples com precedência correta", () => {
            // 10 + 5 * 2 = 20
            const res = CalcAUY.from(10).add(5).mult(2).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber(), "20.0000");
            assertEquals(res.toLaTeX(), "\\text{round}_{\\text{NBR-5891}}(10 + 5 \\times 2, 4) = 20.0000");
        });

        it("deve respeitar a associatividade à direita na potência e formatar expoentes com múltiplos dígitos", () => {
            // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
            const res = CalcAUY.from(2).pow(3).pow(2).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber({ decimalPrecision: 0 }), "512");
            // Multi-digit exponent should have braces in LaTeX
            const res12 = CalcAUY.from(1).pow(12).commit({ roundStrategy: "TRUNCATE" });
            assertEquals(res12.toLaTeX({ decimalPrecision: 0 }), "\\text{round}_{\\text{TRUNCATE}}(1^{12}, 0) = 1");
        });

        it("deve aplicar o auto-agrupamento ao injetar instâncias", () => {
            // 10 * (2 + 3) = 50
            const sub = CalcAUY.from(2).add(3);
            const res = CalcAUY.from(10).mult(sub).commit({ roundStrategy: "NBR5891" });
            assertEquals(res.toStringNumber(), "50.0000");
            assertEquals(
                res.toLaTeX(),
                "\\text{round}_{\\text{NBR-5891}}(10 \\times \\left( 2 + 3 \\right), 4) = 50.0000",
            );
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

        it("deve permitir a reidratação a partir de um rastro de auditoria (toAuditTrace)", () => {
            const resOriginal = CalcAUY.from(100).add(50).commit();
            const auditTrace = resOriginal.toAuditTrace(); // String JSON com { ast, finalResult, strategy }

            // Hidratamos a partir do log de auditoria
            // Usamos .group() para garantir que a soma anterior seja tratada como um bloco: (100 + 50) * 2
            const retomado = CalcAUY.hydrate(auditTrace).group().mult(2).commit();

            assertEquals(retomado.toStringNumber(), "300.0000");
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
            assertEquals(verbal, "10 mais 5 é igual a 15 vírgula 00 (Arredondamento: NBR-5891 para 2 casas decimais).");
        });

        it("deve gerar rastro verbal em en-US", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            const verbal = res.toVerbalA11y({ locale: "en-US", decimalPrecision: 2 });
            assertEquals(verbal, "10 plus 5 is equal to 15 point 00 (Rounding: NBR-5891 for 2 decimal places).");
        });

        it("deve gerar rastro Unicode enriquecido para potências e raízes", () => {
            const res = CalcAUY.from(2).pow(3).commit({ roundStrategy: "HALF_UP" });
            // roundHALF-UP(2³, 4) = 8.0000 -> ₕₐₗf₋ᵤₚ
            assertEquals(res.toUnicode(), "roundₕₐₗf₋ᵤₚ(2³, 4) = 8.0000");

            const raiz = CalcAUY.from(16).pow("1/2").commit({ roundStrategy: "TRUNCATE" });
            // roundTRUNCATE(√16, 2) = 4.00 -> ₜᵣᵤₙcₐₜₑ
            assertEquals(raiz.toUnicode({ decimalPrecision: 2 }), "roundₜᵣᵤₙcₐₜₑ(√16, 2) = 4.00");
        });
    });

    describe("Exportação JSON", () => {
        it("deve gerar rastro Unicode para NBR-5891 usando o homóglifo Beta", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            // roundNBR-5891(10 + 5, 4) = 15.0000 -> ₙᵦᵣ₋₅₈₉₁
            assertEquals(res.toUnicode(), "roundₙᵦᵣ₋₅₈₉₁(10 + 5, 4) = 15.0000");
        });

        it("deve exportar múltiplos formatos via toJSON", () => {
            const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
            const json: any = JSON.parse(res.toJSON(["toStringNumber", "toLaTeX"]));

            assertEquals(json["toStringNumber"], "15.0000");
            assertEquals(json["toLaTeX"], "\\text{round}_{\\text{NBR-5891}}(10 + 5, 4) = 15.0000");
        });
    });

    describe("Raízes e Potências Fracionárias", () => {
        it("deve renderizar raiz quadrada corretamente (1/2)", () => {
            const res = CalcAUY.from(16).pow("1/2").commit();
            assertEquals(res.toLaTeX(), "\\text{round}_{\\text{NBR-5891}}(\\sqrt{16}, 4) = 4.0000");
            assertEquals(res.toUnicode(), "roundₙᵦᵣ₋₅₈₉₁(√16, 4) = 4.0000");
            assertEquals(
                res.toVerbalA11y({ locale: "pt-BR" }),
                "raiz quadrada de 16 é igual a 4 vírgula 0000 (Arredondamento: NBR-5891 para 4 casas decimais).",
            );
        });

        it("deve renderizar raiz cúbica com numerador diferente de 1 (2/3)", () => {
            const res = CalcAUY.from(8).pow("2/3").commit();
            // 8^(2/3) = (root3(8))^2 = 2^2 = 4
            assertEquals(res.toLaTeX(), "\\text{round}_{\\text{NBR-5891}}(\\sqrt[3]{{8}^{2}}, 4) = 4.0000");
            assertEquals(res.toUnicode(), "roundₙᵦᵣ₋₅₈₉₁(∛(8²), 4) = 4.0000");
            assertEquals(
                res.toVerbalA11y({ locale: "pt-BR" }),
                "raiz cúbica de 8 elevado a 2 é igual a 4 vírgula 0000 (Arredondamento: NBR-5891 para 4 casas decimais).",
            );
        });

        it("deve renderizar raiz enésima complexa (3/6)", () => {
            const res = CalcAUY.from(12).pow("3/6").commit();
            assertEquals(res.toLaTeX(), "\\text{round}_{\\text{NBR-5891}}(\\sqrt[6]{{12}^{3}}, 4) = 3.4641");
            assertEquals(res.toUnicode(), "roundₙᵦᵣ₋₅₈₉₁(⁶√(12³), 4) = 3.4641");
            const verbal = res.toVerbalA11y({ locale: "pt-BR" });
            assertStringIncludes(verbal, "raiz 6-ésima de 12 elevado a 3");
        });

        it("deve lidar com o caso complexo do usuário (12^2^3/6) com agrupamento", () => {
            const res = CalcAUY.from(12).pow(2).group().pow("3/6").commit();
            // (12^2)^(3/6) = (144)^(1/2) = 12
            assertEquals(
                res.toLaTeX(),
                "\\text{round}_{\\text{NBR-5891}}(\\sqrt[6]{{\\left( 12^{2} \\right)}^{3}}, 4) = 12.0000",
            );
            assertEquals(res.toUnicode(), "roundₙᵦᵣ₋₅₈₉₁(⁶√((12²)³), 4) = 12.0000");
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

            // O Fluent API terá parênteses extras apenas na raiz da instância injetada.
            // Note: Power now uses braces ^{...}
            assertEquals(
                resFluent.toLaTeX(),
                "\\text{round}_{\\text{NBR-5891}}(2 + 5 \\times 3^{\\left( 2^{2^{2}} \\right)}, 4) = 215233607.0000",
            );
            assertEquals(
                resParser.toLaTeX(),
                "\\text{round}_{\\text{NBR-5891}}(2 + 5 \\times 3^{2^{2^{2}}}, 4) = 215233607.0000",
            );
        });
    });
});
