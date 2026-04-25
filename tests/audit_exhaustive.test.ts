import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { CalcAUYError } from "@src/core/errors.ts";

describe("Auditoria Exaustiva - CalcAUY (Rigor Matemático e Fiscal)", () => {
    describe("1. Aritmética Racional e Imunidade IEEE 754", () => {
        const precisionScenarios = [
            { a: "0.1", b: "0.2", op: "add", exp: "0.30" },
            { a: "0.1", b: "0.2", op: "mult", exp: "0.02" },
            { a: "1", b: "3", op: "div", exp: "0.33" },
            { a: "10", b: "3", op: "div", exp: "3.33" },
            {
                a: "0.00000000000000000000000000000000000000000000000001",
                b: "0.00000000000000000000000000000000000000000000000001",
                op: "add",
                exp: "0.00",
            }, // Fora da escala de output 2, mas interna 50
        ];

        precisionScenarios.forEach(({ a, b, op, exp }) => {
            it(`deve garantir precisão em ${a} ${op} ${b} resultando em ${exp}`, async () => {
                const res = await (CalcAUY.from(a) as any)[op](b).commit({ roundStrategy: "TRUNCATE" });
                assertEquals(res.toStringNumber(), exp);
            });
        });

        it("deve manter precisão interna de 50 casas mesmo em dízimas", async () => {
            const res = await CalcAUY.from(1).div(3).commit({ roundStrategy: "TRUNCATE" });
            const trace = JSON.parse(res.toAuditTrace());
            assertEquals(trace.finalResult.d, "3"); // Fração pura preservada
        });
    });

    describe("2. Arredondamento NBR 5891 (Critério de Desempate ao Par)", () => {
        const nbrScenarios = [
            // Caso .5 exato: arredonda para o par mais próximo
            { val: "1.225", prec: 2, exp: "1.22" },
            { val: "1.235", prec: 2, exp: "1.24" },
            { val: "1.2250", prec: 2, exp: "1.22" },
            { val: "1.225000", prec: 2, exp: "1.22" },
            // Caso > .5: arredonda para cima
            { val: "1.22500000000000000000000000000000000000000000000001", prec: 2, exp: "1.23" },
            { val: "1.2251", prec: 2, exp: "1.23" },
            // Negativos (Simetria)
            { val: "-1.225", prec: 2, exp: "-1.22" },
            { val: "-1.235", prec: 2, exp: "-1.24" },
            { val: "-1.22500000000000000000000000000000000000000000000001", prec: 2, exp: "-1.23" },
        ];

        nbrScenarios.forEach(({ val, prec, exp }) => {
            it(`NBR-5891: ${val} com precisão ${prec} deve resultar em ${exp}`, async () => {
                const res = await CalcAUY.from(val).commit({ roundStrategy: "NBR5891" });
                assertEquals(res.toStringNumber({ decimalPrecision: prec }), exp);
            });
        });
    });

    describe("3. Precedência PEMDAS e Associatividade", () => {
        const precedenceScenarios = [
            { expr: "2 + 5 * 3", exp: "17.00" },
            { expr: "(2 + 5) * 3", exp: "21.00" },
            { expr: "10 - 2 / 2", exp: "9.00" },
            { expr: "2^3^2", exp: "512.00" },
            { expr: "100 / 10 % 3 * 2", exp: "2.00" },
            { expr: "2 + 5 * 3 ^ 2 ^ 2 ^ 2", exp: "215233607.00" },
        ];

        precedenceScenarios.forEach(({ expr, exp }) => {
            it(`Parser deve calcular '${expr}' como ${exp}`, async () => {
                const res = await CalcAUY.parseExpression(expr).commit();
                assertEquals(res.toStringNumber(), exp);
            });
        });

        it("Fluent API deve produzir o mesmo resultado que o Parser para expressões complexas", async () => {
            const fluent = await CalcAUY.from(2).add(5).mult(3).pow(CalcAUY.from(2).pow(2).pow(2)).commit();
            const parser = await CalcAUY.parseExpression("2 + 5 * 3 ^ 2 ^ 2 ^ 2").commit();
            assertEquals(fluent.toStringNumber(), parser.toStringNumber());
        });
    });

    describe("4. Divisão e Módulo Euclidiano", () => {
        const divScenarios = [
            { a: "10", b: "3", q: "3", r: "1" },
            { a: "-10", b: "3", q: "-4", r: "2" },
            { a: "10", b: "-3", q: "-3", r: "1" },
            { a: "-10", b: "-3", q: "4", r: "2" },
        ];

        divScenarios.forEach(({ a, b, q, r }) => {
            it(`Módulo Euclidiano: ${a} % ${b} deve ser ${r}`, async () => {
                const res = await CalcAUY.from(a).mod(b).commit();
                assertEquals(res.toStringNumber({ decimalPrecision: 0 }), r);
            });

            it(`Divisão Inteira Euclidiana: ${a} // ${b} deve ser ${q}`, async () => {
                const res = await CalcAUY.from(a).divInt(b).commit();
                assertEquals(res.toStringNumber({ decimalPrecision: 0 }), q);
            });
        });
    });

    describe("5. Rateio Exato (Slicing)", () => {
        it("toSlice: deve distribuir 10.00 em 3 partes com precisão 2", async () => {
            const res = await CalcAUY.from(10).commit();
            assertEquals(res.toSlice(3, { decimalPrecision: 2 }), ["3.34", "3.33", "3.33"]);
        });

        it("toSlice: a soma das partes deve bater o total exatamente (10.00 / 3)", async () => {
            const res = await CalcAUY.from(10).commit();
            const slices = res.toSlice(3, { decimalPrecision: 2 });
            const sum = slices.reduce((acc, val) => (parseFloat(acc) + parseFloat(val)).toFixed(2));
            assertEquals(sum, "10.00");
        });

        it("toSliceByRatio: deve ratear 100.00 em proporções 1/3", async () => {
            const res = await CalcAUY.from(100).commit();
            const slices = res.toSliceByRatio(["33.33%", "33.33%", "33.33%"], { decimalPrecision: 2 });
            assertEquals(slices, ["33.34", "33.33", "33.33"]);
        });
    });

    describe("6. Internacionalização Verbal (A11y)", () => {
        const localeScenarios = [
            { loc: "pt-BR", expr: "10 + 5", exp: "10 mais 5 é igual a 15 vírgula 00" },
            { loc: "en-US", expr: "10 + 5", exp: "10 plus 5 is equal to 15 point 00" },
            { loc: "de-DE", expr: "10 + 5", exp: "10 plus 5 ist gleich 15 Komma 00" },
            { loc: "ja-JP", expr: "10 + 5", exp: "10 たす 5 は 15 点 00" },
        ];

        localeScenarios.forEach(({ loc, expr, exp }) => {
            it(`Verbalização ${loc}: '${expr}' deve começar com '${exp}'`, async () => {
                const res = await CalcAUY.parseExpression(expr).commit();
                const verbal = res.toVerbalA11y({ locale: loc as any });
                assertEquals(verbal.includes(exp), true);
            });
        });
    });

    describe("7. Persistência (Hibernate/Hydrate)", () => {
        it("hibernate: deve retornar uma string JSON", async () => {
            const calc = CalcAUY.from(10).add(5);
            assertEquals(typeof (await calc.hibernate()), "string");
        });

        it("hydrate: deve restaurar a árvore e permitir continuidade", async () => {
            const json = await CalcAUY.from(10).add(5).group().hibernate();
            const res = await (await CalcAUY.hydrate(json)).mult(2).commit();
            // (10 + 5) * 2 = 30
            assertEquals(res.toStringNumber({ decimalPrecision: 0 }), "30");
        });

        it("hydrate: deve preservar metadados injetados", async () => {
            const signed = await CalcAUY.from(100).setMetadata("id", "TX-123").hibernate();
            const rehydrated = await (await CalcAUY.hydrate(signed)).commit();
            const trace = JSON.parse(rehydrated.toAuditTrace());
            assertEquals(trace.ast.metadata.id, "TX-123");
        });
    });

    describe("8. Erros e Segurança", () => {
        it("deve lançar division-by-zero em divisão direta", async () => {
            await assertRejects(
                async () => await CalcAUY.from(10).div(0).commit(),
                CalcAUYError,
                "O denominador não pode ser zero.",
            );
        });

        it("deve lançar complex-result em raiz de número negativo", async () => {
            await assertRejects(async () => await CalcAUY.from(-1).pow("1/2").commit(), CalcAUYError);
        });

        it("deve lançar invalid-syntax em expressão malformada", () => {
            assertThrows(() => CalcAUY.parseExpression("10 ++ 5"), CalcAUYError);
        });
    });

    describe("9. Imutabilidade", () => {
        it("instância original não deve ser alterada por operações subsequentes", async () => {
            const base = CalcAUY.from(100);
            base.add(50);
            base.mult(2);
            assertEquals((await base.commit()).toStringNumber({ decimalPrecision: 0 }), "100");
        });
    });
});
