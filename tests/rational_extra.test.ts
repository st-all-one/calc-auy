import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { RationalNumber } from "@src/core/rational.ts";
import { CalcAUYError } from "@src/core/errors.ts";

describe("RationalNumber - Casos de Borda e Snippets Específicos", () => {
    describe("GCD e Normalização", () => {
        it("deve lidar com v === 0n no GCD (interno via constructor)", () => {
            const r = RationalNumber.from(0n, 5n);
            assertEquals(r.n, 0n);
            assertEquals(r.d, 1n);
        });

        it("deve normalizar o sinal mantendo o denominador sempre positivo", () => {
            const r1 = RationalNumber.from(1n, -2n);
            assertEquals(r1.n, -1n);
            assertEquals(r1.d, 2n);

            const r2 = RationalNumber.from(-1n, -2n);
            assertEquals(r2.n, 1n);
            assertEquals(r2.d, 2n);
        });
    });

    describe("Segurança e Limites", () => {
        it("deve lançar math-overflow se o resultado de uma operação exceder 1 milhão de bits", () => {
            // Using a huge number that is already close to or at the limit
            const huge = RationalNumber.from(1n << 1000001n, 1n);
            assertThrows(
                () => huge.add(huge),
                CalcAUYError,
                "O resultado da operação excede o limite de segurança de 1000000 bits.",
            );
        });
    });

    describe("Factory Method (from)", () => {
        it("deve retornar a mesma instância se o valor já for um RationalNumber", () => {
            const r = RationalNumber.from(10);
            assertEquals(RationalNumber.from(r), r);
        });

        it("deve lançar unsupported-type para numbers não finitos", () => {
            assertThrows(() => RationalNumber.from(Infinity), CalcAUYError, "Valor numérico inválido: Infinity");
            assertThrows(() => RationalNumber.from(NaN), CalcAUYError, "Valor numérico inválido: NaN");
        });

        it("deve lançar unsupported-type para tipos de entrada inválidos", () => {
            // @ts-ignore: Testing invalid input
            assertThrows(
                () => RationalNumber.from(Symbol("test") as any),
                CalcAUYError,
                "Tipo de entrada não suportado: symbol",
            );
            // @ts-ignore: Testing invalid input
            assertThrows(() => RationalNumber.from({}), CalcAUYError, "Tipo de entrada não suportado: object");
        });
    });

    describe("String Parsing (fromString)", () => {
        it("deve lidar com strings decimais/científicas sem ponto", () => {
            // "1e2" entra na lógica de decimal/científico
            const r = RationalNumber.from("1e2");
            assertEquals(r.n, 100n);
            assertEquals(r.d, 1n);
        });
    });

    describe("Operações de Potência (pow)", () => {
        it("deve lidar com base zero", () => {
            assertEquals(RationalNumber.from(0).pow(RationalNumber.from(0)).n, 1n); // 0^0 = 1
            assertEquals(RationalNumber.from(0).pow(RationalNumber.from(2)).n, 0n); // 0^2 = 0
            assertThrows(
                () => RationalNumber.from(0).pow(RationalNumber.from(-1)),
                CalcAUYError,
                "Zero elevado a um expoente negativo.",
            );
        });

        it("deve lidar com expoente zero para qualquer base não nula", () => {
            assertEquals(RationalNumber.from(5).pow(RationalNumber.from(0)).n, 1n);
            assertEquals(RationalNumber.from(-5).pow(RationalNumber.from(0)).n, 1n);
        });

        it("deve calcular potências com expoentes inteiros negativos", () => {
            // 2^-2 = (1/2)^2 = 1/4
            const res = RationalNumber.from(2).pow(RationalNumber.from(-2));
            assertEquals(res.n, 1n);
            assertEquals(res.d, 4n);
        });

        it("deve retornar o resultado base se o resto da divisão do expoente for zero", () => {
            // 4^(4/2) = 4^2 = 16. remainderN === 0n case.
            const res = RationalNumber.from(4).pow(RationalNumber.from("4/2"));
            assertEquals(res.n, 16n);
            assertEquals(res.d, 1n);
        });
    });

    describe("Utilitários e Comparação", () => {
        it("deve calcular o valor absoluto (abs)", () => {
            assertEquals(RationalNumber.from("-5/2").abs().n, 5n);
            assertEquals(RationalNumber.from("5/2").abs().n, 5n);
        });

        it("deve negar o valor (negate)", () => {
            assertEquals(RationalNumber.from("5/2").negate().n, -5n);
            assertEquals(RationalNumber.from("-5/2").negate().n, 5n);
        });

        it("deve verificar igualdade (equals)", () => {
            const r1 = RationalNumber.from("1/2");
            const r2 = RationalNumber.from("2/4");
            const r3 = RationalNumber.from("1/3");
            assert(r1.equals(r2));
            assert(!r1.equals(r3));
        });

        it("deve retornar 0 em compare para valores iguais", () => {
            const r1 = RationalNumber.from("10/3");
            const r2 = RationalNumber.from("10/3");
            assertEquals(r1.compare(r2), 0);
        });

        it("deve lançar erro para precisão negativa em toDecimalString", () => {
            assertThrows(
                () => RationalNumber.from(1).toDecimalString(-1),
                CalcAUYError,
                "Precisão não pode ser negativa.",
            );
        });
    });

    describe("Lógica Interna de Raiz (bigIntNthRoot)", () => {
        it("deve calcular raiz de zero, um e com n=1", () => {
            assertEquals(RationalNumber.from(0).pow(RationalNumber.from("1/2")).n, 0n);
            assertEquals(RationalNumber.from(1).pow(RationalNumber.from("1/2")).n, 1n);
            assertEquals(RationalNumber.from(10).pow(RationalNumber.from("1/1")).n, 10n);
        });

        it("deve lidar com raízes de números negativos (índice ímpar)", () => {
            const res = RationalNumber.from(-8).pow(RationalNumber.from("1/3"));
            assertEquals(res.n, -2n);
            assertEquals(res.d, 1n);
        });

        it("deve lançar complex-result para raízes pares de números negativos", () => {
            assertThrows(
                () => RationalNumber.from(-4).pow(RationalNumber.from("1/2")),
                CalcAUYError,
                "A operação resultou em um número complexo não suportado.",
            );
        });

        it("deve exercitar os loops de ajuste no bigIntNthRoot", () => {
            const res = RationalNumber.from(2).pow(RationalNumber.from("1/2"));
            assert(res.n > 0n);
        });
    });
});
