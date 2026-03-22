import { assertEquals, assertMatch } from "@std/assert";
import { CurrencyNBRError } from "../src/errors.ts";

Deno.test("CurrencyNBRError should follow RFC 7807 JSON structure", () => {
    const err = new CurrencyNBRError({
        type: "division-by-zero",
        title: "Operação Matemática Inválida",
        detail: "Tentativa de divisão por zero.",
        status: 400,
        operation: "division",
        latex: "\\frac{10}{0}",
        unicode: "10 ÷ 0",
    });

    const json = err.toJSON();

    assertEquals(json.type, "https://currency-math-audit.land/errors/division-by-zero");
    assertEquals(json.title, "Operação Matemática Inválida");
    assertEquals(json.status, 400);
    assertEquals(json.detail, "Tentativa de divisão por zero.");
    assertMatch(json.instance, /^audit:err:[0-9a-f-]{36}$/);

    assertEquals(json.math_audit?.operation, "division");
    assertEquals(json.math_audit?.latex, "\\frac{10}{0}");
    assertEquals(json.math_audit?.unicode, "10 ÷ 0");
});

Deno.test("CurrencyNBRError should work without optional math_audit fields", () => {
    const err = new CurrencyNBRError({
        type: "generic-error",
        title: "Erro Genérico",
        detail: "Ocorreu um erro inesperado.",
    });

    const json = err.toJSON();
    assertEquals(json.math_audit, undefined);
});
