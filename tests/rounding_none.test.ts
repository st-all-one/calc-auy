/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@src/builder.ts";

describe("CalcAUY - Rounding Strategy: NONE", () => {
    it("deve manter a precisão total sem arredondar (Dízima periódica 1/3)", () => {
        // 10 / 3 = 3.33333333333333333333333333333333333333333333333333... (50 casas)
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "NONE" });
        const val = res.toStringNumber();

        // Deve conter muitas casas '3'
        expect(val).toMatch(/^3\.33333/);
        expect(val.length).toBeGreaterThan(40);
    });

    it("deve manter a precisão exata em multiplicações complexas", () => {
        const res = CalcAUY.from("1.23456789")
            .mult("1.23456789")
            .commit({ roundStrategy: "NONE" });

        // 1.23456789 * 1.23456789 = 1.5241578750190521
        const val = res.toStringNumber();
        expect(val).toBe("1.5241578750190521");
    });

    it("toRawInternalBigInt deve retornar a parte inteira sem arredondar para o par", () => {
        // 10 / 3 = 3.333... -> Parte inteira é 3
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "NONE" });
        expect(res.toRawInternalBigInt()).toBe(3n);
    });

    it("toMonetary deve exibir precisão total com strategy NONE", () => {
        const res = CalcAUY.from("10.55555").commit({ roundStrategy: "NONE" });
        const monetary = res.toMonetary();
        // Deve conter os cincos repetidos e não ser arredondado para 10,56
        expect(monetary).toContain("10,55555");
    });

    it("toLaTeX deve exibir a precisão total no rastro sob NONE", () => {
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "NONE" });
        const latex = res.toLaTeX();
        // Deve conter "3.3333..." e a precisão ", 50)"
        expect(latex).toContain("3.33333");
        expect(latex).toContain(", 50) =");
    });

    it("toUnicode deve exibir a precisão total no rastro sob NONE", () => {
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "NONE" });
        const unicode = res.toUnicode();
        expect(unicode).toContain("3.33333");
        expect(unicode).toContain(", 50) =");
    });

    it("toSlice deve distribuir com precisão total sob NONE", () => {
        // 10 / 3 com precisão total (50 casas) distribuído em 3 partes
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "NONE" });
        const fatias = res.toSlice(3);

        // Cada fatia deve ter 50 casas decimais
        expect(fatias[0].split(".")[1].length).toBe(50);
        // A soma deve bater exatamente
    });

    it("toScaledBigInt deve retornar valor escalado por 10^50 sob NONE", () => {
        const res = CalcAUY.from(1).div(3).commit({ roundStrategy: "NONE" });
        const scaled = res.toScaledBigInt();
        // 1/3 * 10^50 = 33333... (50 vezes)
        expect(scaled.toString().length).toBe(50);
        expect(scaled.toString()).toMatch(/^33333/);
    });

    it("toFloatNumber deve converter string de 50 casas (com limite do IEEE 754)", () => {
        const res = CalcAUY.from(1).div(3).commit({ roundStrategy: "NONE" });
        const floatVal = res.toFloatNumber();
        // 0.3333333333333333 (máximo do number JS)
        expect(floatVal).toBeCloseTo(0.3333333333333333, 15);
    });
});
