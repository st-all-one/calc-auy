import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { RationalNumber } from "../src/core/rational.ts";
import { CalcAUYError } from "../src/core/errors.ts";

describe("Rigor de Ingestão - RationalNumber", () => {
    it("deve rejeitar lixo alfanumérico no final da string", () => {
        assertThrows(
            () => RationalNumber.from("10.5abc"),
            CalcAUYError,
            "String numérica inválida"
        );
    });

    it("deve rejeitar múltiplos pontos decimais", () => {
        assertThrows(
            () => RationalNumber.from("10.5.5"),
            CalcAUYError,
            "String numérica inválida"
        );
    });

    it("deve rejeitar frações malformadas", () => {
        assertThrows(
            () => RationalNumber.from("1/2/3"),
            CalcAUYError,
            "String numérica inválida"
        );
    });

    it("deve rejeitar espaços internos", () => {
        assertThrows(
            () => RationalNumber.from("10 000"),
            CalcAUYError,
            "String numérica inválida"
        );
    });

    it("deve aceitar e converter BigInt literals com sufixo 'n'", () => {
        const r = RationalNumber.from("100n");
        assertEquals(r.n, 100n);
        assertEquals(r.d, 1n);
    });

    it("deve aceitar underscores válidos", () => {
        const r = RationalNumber.from("1_000.50");
        assertEquals(r.toDecimalString(2), "1000.50");
    });

    it("deve aceitar notação científica rigorosa", () => {
        const r = RationalNumber.from("1.5e-2");
        assertEquals(r.toDecimalString(3), "0.015");
    });
});
