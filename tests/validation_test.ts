import { assertEquals, assertInstanceOf } from "@std/assert";
import { CurrencyNBR } from "../src/main.ts";
import { CurrencyNBRError } from "../src/errors.ts";

Deno.test("CurrencyNBR.from - deve lançar erro para tipos inválidos", () => {
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
            assertInstanceOf(e, CurrencyNBRError);
            assertEquals(e.type, "https://currency-math-audit.land/errors/invalid-currency-format");
        }
    }
});

Deno.test("CurrencyNBROutput - deve lançar erro para roundingMethod inválido", () => {
    const instance = CurrencyNBR.from(100);
    try {
        instance.commit(2, { roundingMethod: "INVALID_METHOD" as any });
        throw new Error("Deveria ter lançado erro para roundingMethod inválido");
    } catch (e) {
        assertInstanceOf(e, CurrencyNBRError);
        assertEquals(e.type, "https://currency-math-audit.land/errors/invalid-currency-format");
    }
});

Deno.test("CurrencyNBROutput - deve lançar erro para locale inválido", () => {
    const instance = CurrencyNBR.from(100);
    try {
        instance.commit(2, { locale: "xx-XX" as any });
        throw new Error("Deveria ter lançado erro para locale inválido");
    } catch (e) {
        assertInstanceOf(e, CurrencyNBRError);
        assertEquals(e.type, "https://currency-math-audit.land/errors/invalid-currency-format");
    }
});
