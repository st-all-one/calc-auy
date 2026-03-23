import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Aritmética e Limites (Unit)", () => {
    it("deve somar decimais quebrados com precisão (0.1 + 0.2 === 0.3)", () => {
        const result = CurrencyNBR.from("0.1").add("0.2").commit(1);
        expect(result.toString()).toBe("0.3");
    });

    it("deve realizar subtração com resultado negativo", () => {
        const result = CurrencyNBR.from("10.00").sub("15.50").commit(2);
        expect(result.toString()).toBe("-5.50");
    });

    it("deve multiplicar inflando a escala interna e retornando ao normal", () => {
        // 1.234567890123 * 2 = 2.469135780246
        const val = CurrencyNBR.from("1.234567890123").mult(2).commit(12);
        expect(val.toString()).toBe("2.469135780246");
    });

    it("deve lidar com divisão resultando em dízima periódica (10 / 3)", () => {
        const result = CurrencyNBR.from(10).div(3).commit(6);
        expect(result.toString()).toBe("3.333333");
    });

    describe("Arredondamentos", () => {
        it("deve aplicar Banker's Rounding (Half-Even): 2.5 -> 2 | 3.5 -> 4 | -2.5 -> -2 | -3.5 -> -4", () => {
            const val1 = CurrencyNBR.from("2.5").commit(0, { roundingMethod: "HALF-EVEN" });
            const val2 = CurrencyNBR.from("3.5").commit(0, { roundingMethod: "HALF-EVEN" });
            const val3 = CurrencyNBR.from("-2.5").commit(0, { roundingMethod: "HALF-EVEN" });
            const val4 = CurrencyNBR.from("-3.5").commit(0, { roundingMethod: "HALF-EVEN" });
            expect(val1.toString()).toBe("2");
            expect(val2.toString()).toBe("4");
            expect(val3.toString()).toBe("-2");
            expect(val4.toString()).toBe("-4");
        });

        it("deve aplicar Half-Up (Comercial): 2.5 -> 3 | -2.5 -> -3", () => {
            const val1 = CurrencyNBR.from("2.5").commit(0, { roundingMethod: "HALF-UP" });
            const val2 = CurrencyNBR.from("-2.5").commit(0, { roundingMethod: "HALF-UP" });
            expect(val1.toString()).toBe("3");
            expect(val2.toString()).toBe("-3");
        });

        it("deve aplicar Truncamento (Floor) e Teto (Ceil) com suporte a negativos", () => {
            const valTrunc = CurrencyNBR.from("2.99").commit(0, { roundingMethod: "TRUNCATE" });
            const valTruncNeg = CurrencyNBR.from("-2.99").commit(0, { roundingMethod: "TRUNCATE" });
            expect(valTrunc.toString()).toBe("2");
            expect(valTruncNeg.toString()).toBe("-2");

            const valCeil = CurrencyNBR.from("2.01").commit(0, { roundingMethod: "CEIL" });
            const valCeilNeg = CurrencyNBR.from("-2.99").commit(0, { roundingMethod: "CEIL" });
            expect(valCeil.toString()).toBe("3");
            expect(valCeilNeg.toString()).toBe("-2"); // Direção ao infinito positivo
        });

        it("deve aplicar ABNT NBR 5891 (Padrão) explicitamente (Positivos e Negativos)", () => {
            // Positivos: Arredonda para o par mais próximo se for exatamente 5
            const val1 = CurrencyNBR.from("1.225").commit(2, { roundingMethod: "NBR-5891" }); 
            const val2 = CurrencyNBR.from("1.235").commit(2, { roundingMethod: "NBR-5891" });
            expect(val1.toString()).toBe("1.22");
            expect(val2.toString()).toBe("1.24");

            // Negativos: Deve seguir a mesma lógica de paridade
            const val1Neg = CurrencyNBR.from("-1.225").commit(2, { roundingMethod: "NBR-5891" });
            const val2Neg = CurrencyNBR.from("-1.235").commit(2, { roundingMethod: "NBR-5891" });
            expect(val1Neg.toString()).toBe("-1.22");
            expect(val2Neg.toString()).toBe("-1.24");

            // Regra: se o 5 for seguido de qualquer algarismo diferente de zero, aumenta em magnitude
            const val3 = CurrencyNBR.from("1.2250000001").commit(2, { roundingMethod: "NBR-5891" });
            const val3Neg = CurrencyNBR.from("-1.2250000001").commit(2, { roundingMethod: "NBR-5891" });
            expect(val3.toString()).toBe("1.23");
            expect(val3Neg.toString()).toBe("-1.23");
        });

        it("deve usar NBR-5891 como comportamento padrão quando omitido", () => {
            const val = CurrencyNBR.from("1.235").commit(2);
            expect(val.toString()).toBe("1.24");
        });
    });

    it("deve suportar encadeamento longo: A.add(B).sub(C).mult(D).div(E)", () => {
        // (10 + 5 - 3) * 2 / 4 = 12 * 2 / 4 = 24 / 4 = 6
        const result = CurrencyNBR.from(10).add(5).sub(3).group().mult(2).div(4).commit(0);
        expect(result.toString()).toBe("6");
    });

    it("deve lançar erro em divisão por zero", () => {
        expect(() => CurrencyNBR.from(10).div(0)).toThrow();
    });

    describe("Potenciação e Radiciação", () => {
        it("deve calcular potência com expoente 0 (retorna 1)", () => {
            const result = CurrencyNBR.from("123.45").pow(0).commit(0);
            expect(result.toString()).toBe("1");
        });

        it("deve calcular potência com expoente 1 (retorna o próprio valor)", () => {
            const result = CurrencyNBR.from("123.45").pow(1).commit(2);
            expect(result.toString()).toBe("123.45");
        });

        it("deve calcular potência com expoente negativo (inverso da base)", () => {
            // 2^-1 = 0.5
            const result = CurrencyNBR.from(2).pow(-1).commit(1);
            expect(result.toString()).toBe("0.5");
        });

        it("deve calcular potência fracionária (Raiz exata: 9^(1/2) === 3)", () => {
            const result = CurrencyNBR.from(9).pow("1/2").commit(0);
            expect(result.toString()).toBe("3");
        });

        it("deve calcular potência fracionária (Raiz não exata com arredondamento)", () => {
            // sqrt(2) approx 1.414213562373
            const result = CurrencyNBR.from(2).pow("1/2").commit(6);
            expect(result.toString()).toBe("1.414214"); // Arredondado para 6 casas
        });

        it("deve lançar erro em raiz de índice par de número negativo", () => {
            expect(() => CurrencyNBR.from(-1).pow("1/2")).toThrow();
        });
    });

    describe("Leis Matemáticas e Imutabilidade (Propriedades)", () => {
        const a = "10.5";
        const b = "20.75";

        it("Comutatividade da Soma: a + b === b + a", () => {
            const res1 = CurrencyNBR.from(a).add(b).commit(2).toString();
            const res2 = CurrencyNBR.from(b).add(a).commit(2).toString();
            expect(res1).toBe(res2);
        });

        it("Comutatividade da Multiplicação: a * b === b * a", () => {
            const res1 = CurrencyNBR.from(a).mult(b).commit(2).toString();
            const res2 = CurrencyNBR.from(b).mult(a).commit(2).toString();
            expect(res1).toBe(res2);
        });

        it("Identidade da Subtração: a - a === 0", () => {
            const res = CurrencyNBR.from(a).sub(a).commit(0).toString();
            expect(res).toBe("0");
        });

        it("Identidade da Divisão: (a * b) / b approx a", () => {
            const res = CurrencyNBR.from(a).mult(b).div(b).commit(1).toString();
            expect(res).toBe("10.5");
        });

        it("Imutabilidade: operações não alteram o estado interno da instância original", () => {
            const original = CurrencyNBR.from(100);
            original.add(50);
            original.sub(20);
            original.mult(2);
            expect(original.commit(0).toString()).toBe("100");
        });
    });
});
