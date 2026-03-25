import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUD } from "../src/main.ts";
import { CalcAUDError } from "../src/errors.ts";

describe("Validação e Tipos (Unit)", () => {
    describe("CalcAUD.from", () => {
        it("deve lançar erro para tipos inválidos", () => {
            const invalidValues = [
                null,
                undefined,
                NaN,
                {},
                () => {},
                Symbol("test"),
                true,
            ];

            for (const val of invalidValues) {
                try {
                    CalcAUD.from(val as any);
                    throw new Error(`Deveria ter lançado erro para o valor: ${val}`);
                } catch (e) {
                    expect(e).toBeInstanceOf(CalcAUDError);
                    expect((e as CalcAUDError).type).toBe(
                        "https://github.com/st-all-one/calcaud-nbr-a11y/tree/main/errors/invalid-input-format",
                    );
                }
            }
        });
    });

    describe("CalcAUDOutput Options", () => {
        it("deve lançar erro para roundingMethod inválido", () => {
            const instance = CalcAUD.from(100);
            try {
                instance.commit(2, { roundingMethod: "INVALID_METHOD" as any });
                throw new Error("Deveria ter lançado erro para roundingMethod inválido");
            } catch (e) {
                expect(e).toBeInstanceOf(CalcAUDError);
                expect((e as CalcAUDError).type).toBe(
                    "https://github.com/st-all-one/calcaud-nbr-a11y/tree/main/errors/invalid-rounding-method",
                );
            }
        });

        it("deve lançar erro para locale inválido", () => {
            const instance = CalcAUD.from(100);
            try {
                instance.commit(2, { locale: "xx-XX" as any });
                throw new Error("Deveria ter lançado erro para locale inválido");
            } catch (e) {
                expect(e).toBeInstanceOf(CalcAUDError);
                expect((e as CalcAUDError).type).toBe(
                    "https://github.com/st-all-one/calcaud-nbr-a11y/tree/main/errors/invalid-locale",
                );
            }
        });
    });
});
