import { assertEquals } from "@std/assert";
import { RationalNumber } from "@src/core/rational.ts";
import { RoundingHandlers, roundToPrecisionNBR5891 } from "@src/rounding/rounding.ts";

Deno.test("NBR 5891 - Regra 1: Algarismo seguinte de 0 a 4 (85.483 -> 85.48)", () => {
    const val = RationalNumber.from("85.483");
    const rounded = RoundingHandlers.NBR5891(val, 2);
    assertEquals(rounded.toDecimalString(2), "85.48");
});

Deno.test("NBR 5891 - Regra 2: Algarismo seguinte de 6 a 9 (85.487 -> 85.49)", () => {
    const val = RationalNumber.from("85.487");
    const rounded = RoundingHandlers.NBR5891(val, 2);
    assertEquals(rounded.toDecimalString(2), "85.49");
});

Deno.test("NBR 5891 - Regra 3a: 5 seguido de algo diferente de zero (32.751 -> 32.8)", () => {
    const val = RationalNumber.from("32.751");
    const rounded = RoundingHandlers.NBR5891(val, 1);
    assertEquals(rounded.toDecimalString(1), "32.8");
});

Deno.test("NBR 5891 - Regra 3b: 5 seguido apenas de zeros ou nada - Par permanece (32.45 -> 32.4)", () => {
    const val = RationalNumber.from("32.45");
    const rounded = RoundingHandlers.NBR5891(val, 1);
    assertEquals(rounded.toDecimalString(1), "32.4");
});

Deno.test("NBR 5891 - Regra 3b: 5 seguido apenas de zeros ou nada - Ímpar aumenta (32.75 -> 32.8)", () => {
    const val = RationalNumber.from("32.75");
    const rounded = RoundingHandlers.NBR5891(val, 1);
    assertEquals(rounded.toDecimalString(1), "32.8");
});

Deno.test("NBR 5891 - Utilitário roundToPrecisionNBR5891", () => {
    // 85483 (precisão 3) -> 8548 (precisão 2)
    assertEquals(roundToPrecisionNBR5891(85483n, 3, 2), 8548n);
    // 3275 (precisão 2) -> 328 (precisão 1)
    assertEquals(roundToPrecisionNBR5891(3275n, 2, 1), 328n);
});
