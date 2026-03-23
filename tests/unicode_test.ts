import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Saída Unicode (A11y/Engine)", () => {
    it("deve gerar Unicode correto para operações básicas", () => {
        const calc = CurrencyNBR.from(10).add(5).mult(2);
        expect(calc.commit().toUnicode()).toBe("10 + 5 × 2 = 20.000000");
    });

    it("deve gerar Unicode correto para exponenciação e grupos", () => {
        const pow = CurrencyNBR.from(10).add(5).group().pow(2);
        expect(pow.commit().toUnicode()).toBe("(10 + 5)² = 225.000000");
    });

    it("deve gerar Unicode correto para raízes complexas", () => {
        const root = CurrencyNBR.from(8).pow("1/3");
        expect(root.commit().toUnicode()).toBe("³√(8) = 2.000000");

        const squareRoot = CurrencyNBR.from(81).pow("1/2");
        expect(squareRoot.commit().toUnicode()).toBe("√(81) = 9.000000");
    });

    it("deve gerar Unicode correto para cadeia longa", () => {
        const complex = CurrencyNBR.from(100).div(2).sub(10).group().mult(2);
        expect(complex.commit(0).toUnicode()).toBe("(100 ÷ 2 - 10) × 2 = 80");
    });
});
