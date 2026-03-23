import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Operações de Inteiros: divInt e mod (Unit)", () => {
    describe("divInt (Divisão Inteira)", () => {
        it("deve realizar divisão inteira simples (10 // 3 = 3)", () => {
            const result = CurrencyNBR.from(10).divInt(3).commit(0);
            expect(result.toString()).toBe("3");
        });

        it("deve realizar divisão inteira com decimais no dividendo (10.5 // 3 = 3)", () => {
            const result = CurrencyNBR.from("10.5").divInt(3).commit(0);
            expect(result.toString()).toBe("3");
        });

        it("deve realizar divisão inteira com resultado negativo (-10 // 3 = -3)", () => {
            const result = CurrencyNBR.from(-10).divInt(3).commit(0);
            expect(result.toString()).toBe("-3");
        });

        it("deve lançar erro em divisão inteira por zero", () => {
            expect(() => CurrencyNBR.from(10).divInt(0)).toThrow();
        });

        it("deve validar outputs auditáveis para divInt", () => {
            const output = CurrencyNBR.from(10).divInt(3).commit(0);
            expect(output.toLaTeX()).toContain("\\lfloor \\frac{10}{3} \\rfloor");
            expect(output.toUnicode()).toContain("⌊10 ÷ 3⌋");
            expect(output.toVerbalA11y()).toContain("10 dividido inteiramente por 3");
        });
    });

    describe("mod (Módulo)", () => {
        it("deve calcular o módulo simples (10 % 3 = 1)", () => {
            const result = CurrencyNBR.from(10).mod(3).commit(0);
            expect(result.toString()).toBe("1");
        });

        it("deve calcular o módulo com decimais (10.5 % 3 = 1.5)", () => {
            const result = CurrencyNBR.from("10.5").mod(3).commit(1);
            expect(result.toString()).toBe("1.5");
        });

        it("deve calcular o módulo com dividendo negativo (-10 % 3 = -1)", () => {
            const result = CurrencyNBR.from(-10).mod(3).commit(0);
            expect(result.toString()).toBe("-1");
        });

        it("deve lançar erro em cálculo de módulo por zero", () => {
            expect(() => CurrencyNBR.from(10).mod(0)).toThrow();
        });

        it("deve validar outputs auditáveis para mod", () => {
            const output = CurrencyNBR.from(10).mod(3).commit(0);
            expect(output.toLaTeX()).toContain("10 \\pmod{3}");
            expect(output.toUnicode()).toContain("10 mod 3");
            expect(output.toVerbalA11y()).toContain("10 módulo 3");
        });
    });

    describe("Integração e Encadeamento", () => {
        it("deve suportar operações mistas: (10 * 2) // 3 + 1", () => {
            // (10 * 2) = 20
            // 20 // 3 = 6
            // 6 + 1 = 7
            const result = CurrencyNBR.from(10).mult(2).group().divInt(3).add(1).commit(0);
            expect(result.toString()).toBe("7");
        });
    });
});
