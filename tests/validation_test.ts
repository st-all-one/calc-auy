import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../src/main.ts";
import { CurrencyNBRError } from "../src/errors.ts";

describe("Validação e Tipos (Unit)", () => {
    describe("CurrencyNBR.from", () => {
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
                    CurrencyNBR.from(val as any);
                    throw new Error(`Deveria ter lançado erro para o valor: ${val}`);
                } catch (e) {
                    expect(e).toBeInstanceOf(CurrencyNBRError);
                    expect((e as CurrencyNBRError).type).toBe(
                        "https://github.com/st-all-one/currency-nbr-a11y/tree/main/errors/invalid-currency-format",
                    );
                }
            }
        });
    });

    describe("CurrencyNBROutput Options", () => {
        it("deve lançar erro para roundingMethod inválido", () => {
            const instance = CurrencyNBR.from(100);
            try {
                instance.commit(2, { roundingMethod: "INVALID_METHOD" as any });
                throw new Error("Deveria ter lançado erro para roundingMethod inválido");
            } catch (e) {
                expect(e).toBeInstanceOf(CurrencyNBRError);
                expect((e as CurrencyNBRError).type).toBe(
                    "https://github.com/st-all-one/currency-nbr-a11y/tree/main/errors/invalid-currency-format",
                );
            }
        });

        it("deve lançar erro para locale inválido", () => {
            const instance = CurrencyNBR.from(100);
            try {
                instance.commit(2, { locale: "xx-XX" as any });
                throw new Error("Deveria ter lançado erro para locale inválido");
            } catch (e) {
                expect(e).toBeInstanceOf(CurrencyNBRError);
                expect((e as CurrencyNBRError).type).toBe(
                    "https://github.com/st-all-one/currency-nbr-a11y/tree/main/errors/invalid-currency-format",
                );
            }
        });
    });
});
