import { describe, it } from "@std/testing/bdd";
import { assertThrows } from "@std/assert";
import { validateMetadata } from "@src/core/metadata.ts";
import { CalcAUYError } from "@src/core/errors.ts";

describe("Metadados - Validação de Formato", () => {
    it("deve aceitar tipos primitivos válidos (string, number, boolean)", () => {
        validateMetadata("string_value");
        validateMetadata(123);
        validateMetadata(true);
        validateMetadata(0); // Also a valid number
        validateMetadata(false); // Also a valid boolean
    });

    it("deve rejeitar null e undefined", () => {
        assertThrows(
            () => validateMetadata(null),
            CalcAUYError,
            "Metadados não podem conter null ou undefined.",
        );
        assertThrows(
            () => validateMetadata(undefined),
            CalcAUYError,
            "Metadados não podem conter null ou undefined.",
        );
    });

    it("deve rejeitar BigInts puros", () => {
        assertThrows(
            () => validateMetadata(123n),
            CalcAUYError,
            "Metadados não podem conter BigInt puro. Converta para string ou use objetos planos.",
        );
    });

    it("deve aceitar objetos planos aninhados", () => {
        validateMetadata({});
        validateMetadata({ key: "value" });
        validateMetadata({
            a: 1,
            b: {
                c: "test",
                d: { e: true },
            },
        });
    });

    it("deve aceitar arrays de primitivos e objetos planos", () => {
        validateMetadata([]);
        validateMetadata([1, "hello", true]);
        validateMetadata([1, { key: "value" }, [2, 3]]);
    });

    it("deve rejeitar referências circulares em objetos", () => {
        const obj: any = { a: { b: {} } };
        obj.a.b = obj;
        assertThrows(
            () => validateMetadata(obj),
            CalcAUYError,
            "Referência circular detectada nos metadados.",
        );
    });

    it("deve rejeitar referências circulares em arrays", () => {
        const arr: any[] = [];
        arr[0] = arr;
        assertThrows(
            () => validateMetadata(arr),
            CalcAUYError,
            "Referência circular detectada nos metadados.",
        );
    });

    it("deve rejeitar instâncias de classes ou objetos com protótipos complexos", () => {
        class MyClass {
            prop = 1;
        }
        assertThrows(
            () => validateMetadata(new MyClass()),
            CalcAUYError,
            "Metadados permitem apenas objetos planos (plain objects). Classes ou instâncias não são permitidas.",
        );

        assertThrows(
            () => validateMetadata(new Date()),
            CalcAUYError,
            "Metadados permitem apenas objetos planos (plain objects). Classes ou instâncias não são permitidas.",
        );

        assertThrows(
            () => validateMetadata(new Map()),
            CalcAUYError,
            "Metadados permitem apenas objetos planos (plain objects). Classes ou instâncias não são permitidas.",
        );
    });

    it("deve rejeitar tipos primitivos não suportados (symbol, function)", () => {
        assertThrows(
            () => validateMetadata(Symbol("test")),
            CalcAUYError,
            "O tipo 'symbol' não é permitido em metadados (apenas primitives, plain objects e arrays).",
        );
        assertThrows(
            () => validateMetadata(() => {}),
            CalcAUYError,
            "O tipo 'function' não é permitido em metadados (apenas primitives, plain objects e arrays).",
        );
    });
});
