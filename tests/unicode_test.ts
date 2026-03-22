import { assertEquals } from "@std/assert";
import { CurrencyNBR } from "../mod.ts";

Deno.test("Unicode Output - Operações Básicas", () => {
    const calc = CurrencyNBR.from(10).add(5).mult(2);
    // Esperado: "10 + 5 × 2 = 20.000000"
    assertEquals(calc.commit().toUnicode(), "10 + 5 × 2 = 20.000000");
});

Deno.test("Unicode Output - Exponenciação e Grupos", () => {
    const pow = CurrencyNBR.from(10).add(5).group().pow(2);
    // Esperado: "(10 + 5)² = 225.000000"
    assertEquals(pow.commit().toUnicode(), "(10 + 5)² = 225.000000");
});

Deno.test("Unicode Output - Raízes Complexas", () => {
    const root = CurrencyNBR.from(8).pow("1/3");
    // Esperado: "³√(8) = 2.000000"
    assertEquals(root.commit().toUnicode(), "³√(8) = 2.000000");

    const squareRoot = CurrencyNBR.from(81).pow("1/2");
    // Quadrada omite o índice por convenção: "√(81) = 9.000000"
    assertEquals(squareRoot.commit().toUnicode(), "√(81) = 9.000000");
});

Deno.test("Unicode Output - Cadeia Longa", () => {
    const complex = CurrencyNBR.from(100).div(2).sub(10).group().mult(2);
    assertEquals(complex.commit(0).toUnicode(), "(100 ÷ 2 - 10) × 2 = 80");
});
