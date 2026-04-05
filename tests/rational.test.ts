import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { RationalNumber } from "../src/rational.ts";
import { CalcAUYError } from "../src/errors.ts";

describe("RationalNumber", () => {
    describe("Criação e Ingestão", () => {
        it("deve criar a partir de um inteiro", () => {
            const r = RationalNumber.from(10);
            assertEquals(r.n, 10n);
            assertEquals(r.d, 1n);
        });

        it("deve criar a partir de um decimal", () => {
            const r = RationalNumber.from("10.50");
            assertEquals(r.n, 21n);
            assertEquals(r.d, 2n);
        });

        it("deve criar a partir de uma fração string", () => {
            const r = RationalNumber.from("1/3");
            assertEquals(r.n, 1n);
            assertEquals(r.d, 3n);
        });

        it("deve simplificar automaticamente via MDC", () => {
            const r = RationalNumber.from("50/100");
            assertEquals(r.n, 1n);
            assertEquals(r.d, 2n);
        });

        it("deve lançar erro em divisão por zero", () => {
            assertThrows(
                () => RationalNumber.from("10/0"),
                CalcAUYError,
                "O denominador não pode ser zero.",
            );
        });
    });

    describe("Operações Matemáticas", () => {
        it("deve somar corretamente", () => {
            const r1 = RationalNumber.from("1/3");
            const r2 = RationalNumber.from("1/6");
            const res = r1.add(r2); // 2/6 + 1/6 = 3/6 = 1/2
            assertEquals(res.n, 1n);
            assertEquals(res.d, 2n);
        });

        it("deve subtrair corretamente", () => {
            const r1 = RationalNumber.from("1/2");
            const r2 = RationalNumber.from("1/3");
            const res = r1.sub(r2); // 3/6 - 2/6 = 1/6
            assertEquals(res.n, 1n);
            assertEquals(res.d, 6n);
        });

        it("deve multiplicar corretamente", () => {
            const r1 = RationalNumber.from("2/3");
            const r2 = RationalNumber.from("3/4");
            const res = r1.mul(r2); // 6/12 = 1/2
            assertEquals(res.n, 1n);
            assertEquals(res.d, 2n);
        });

        it("deve dividir corretamente", () => {
            const r1 = RationalNumber.from("1/2");
            const r2 = RationalNumber.from("1/4");
            const res = r1.div(r2); // (1/2) * (4/1) = 2
            assertEquals(res.n, 2n);
            assertEquals(res.d, 1n);
        });

        it("deve calcular potência inteira corretamente", () => {
            const r1 = RationalNumber.from(2);
            const res = r1.pow(RationalNumber.from(3));
            assertEquals(res.n, 8n);
            assertEquals(res.d, 1n);
        });

        it("deve calcular módulo euclidiano corretamente", () => {
            const r1 = RationalNumber.from(10);
            const r2 = RationalNumber.from(3);
            const res = r1.mod(r2); // 10 % 3 = 1
            assertEquals(res.n, 1n);
            assertEquals(res.d, 1n);
        });

        it("deve garantir que o módulo seja sempre positivo (Regra Euclidiana)", () => {
            const r1 = RationalNumber.from(-10);
            const r2 = RationalNumber.from(3);
            const res = r1.mod(r2); // -10 % 3 = 2 (pois -10 = 3 * -4 + 2)
            assertEquals(res.n, 2n);
            assertEquals(res.d, 1n);
        });
    });
});
