/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { canonicalString } from "@src/utils/security.ts";

describe("CanonicalString — RFC 8785 (JCS)", () => {
    // ─── Primitivos ──────────────────────────────────────────────

    it("null → 'null'", () => {
        assertEquals(canonicalString(null), "null");
    });

    it("true → 'true'", () => {
        assertEquals(canonicalString(true), "true");
    });

    it("false → 'false'", () => {
        assertEquals(canonicalString(false), "false");
    });

    it("strings escapadas conforme JSON", () => {
        assertEquals(canonicalString("hello"), '"hello"');
        assertEquals(canonicalString('a"b'), '"a\\"b"');
        assertEquals(canonicalString("a\\b"), '"a\\\\b"');
        assertEquals(canonicalString("a\nb"), '"a\\nb"');
        assertEquals(canonicalString("a\tb"), '"a\\tb"');
    });

    // ─── Números JCS ────────────────────────────────────────────

    it("inteiros: sem ponto decimal, sem expoente", () => {
        assertEquals(canonicalString(42), "42");
        assertEquals(canonicalString(0), "0");
        assertEquals(canonicalString(-7), "-7");
        assertEquals(canonicalString(1e2), "100");
    });

    it("decimais: sem zeros à direita", () => {
        assertEquals(canonicalString(3.14), "3.14");
        assertEquals(canonicalString(0.5), "0.5");
        assertEquals(canonicalString(-2.5), "-2.5");
    });

    it("decimais sem parte fracionária viram inteiro", () => {
        assertEquals(canonicalString(1.0), "1");
        assertEquals(canonicalString(42.0), "42");
        assertEquals(canonicalString(-0.0), "0");
    });

    it("expande notação científica (grandes)", () => {
        assertEquals(canonicalString(1e21), "1000000000000000000000");
        assertEquals(canonicalString(1.5e2), "150");
        assertEquals(canonicalString(-1e3), "-1000");
    });

    it("expande notação científica (pequenos)", () => {
        assertEquals(canonicalString(1e-7), "0.0000001");
        assertEquals(canonicalString(1.23e-2), "0.0123");
        assertEquals(canonicalString(-1.5e-2), "-0.015");
    });

    it("-0 → '0' (RFC 8785 §3.2.2.2)", () => {
        assertEquals(canonicalString(-0), "0");
    });

    it("Infinity → TypeError", () => {
        assertThrows(
            () => canonicalString(Infinity),
            TypeError,
            "non-finite",
        );
    });

    it("NaN → TypeError", () => {
        assertThrows(
            () => canonicalString(NaN),
            TypeError,
            "non-finite",
        );
    });

    // ─── Arrays ─────────────────────────────────────────────────

    it("arrays vazios", () => {
        assertEquals(canonicalString([]), "[]");
    });

    it("arrays simples", () => {
        assertEquals(canonicalString([1, 2, 3]), "[1,2,3]");
    });

    it("arrays de strings", () => {
        assertEquals(canonicalString(["a", "b"]), '["a","b"]');
    });

    it("arrays aninhados", () => {
        assertEquals(canonicalString([1, [2, 3]]), "[1,[2,3]]");
    });

    // ─── Objetos ────────────────────────────────────────────────

    it("objetos vazios", () => {
        assertEquals(canonicalString({}), "{}");
    });

    it("chaves ordenadas deterministicamente", () => {
        // Ordem de inserção não importa
        assertEquals(canonicalString({ b: 2, a: 1 }), '{"a":1,"b":2}');
        assertEquals(canonicalString({ z: 9, y: 8, x: 7 }), '{"x":7,"y":8,"z":9}');
    });

    it("undefined em objeto → chave omitida", () => {
        assertEquals(canonicalString({ a: 1, b: undefined, c: 3 }), '{"a":1,"c":3}');
    });

    it("objetos aninhados com ordenação recursiva", () => {
        const input = { b: 2, a: { z: 3, y: 4 }, c: 1 };
        const expected = '{"a":{"y":4,"z":3},"b":2,"c":1}';
        assertEquals(canonicalString(input), expected);
    });

    // ─── Determinismo ───────────────────────────────────────────

    it("mesmo dado sempre produz mesma string", () => {
        const data = { name: "test", values: [1, 2, { x: 10 }] };
        const a = canonicalString(data);
        const b = canonicalString(data);
        assertEquals(a, b);
    });

    it("dados equivalentes com ordens diferentes produzem mesma string", () => {
        const a = canonicalString({ a: 1, b: { c: 2, d: 3 } });
        const b = canonicalString({ b: { d: 3, c: 2 }, a: 1 });
        assertEquals(a, b);
    });

    // ─── Type guards ────────────────────────────────────────────

    it("BigInt → TypeError", () => {
        assertThrows(
            () => canonicalString(123n),
            TypeError,
            '"bigint"',
        );
    });

    it("Date → TypeError", () => {
        assertThrows(
            () => canonicalString(new Date("2026-01-01")),
            TypeError,
            "Date",
        );
    });

    it("function → TypeError", () => {
        assertThrows(
            () => canonicalString(() => {}),
            TypeError,
            '"function"',
        );
    });

    it("symbol → TypeError", () => {
        assertThrows(
            () => canonicalString(Symbol("x")),
            TypeError,
            '"symbol"',
        );
    });

    it("RegExp → TypeError", () => {
        assertThrows(
            () => canonicalString(/test/),
            TypeError,
            "RegExp",
        );
    });

    it("undefined como raiz → TypeError", () => {
        assertThrows(
            () => canonicalString(undefined),
            TypeError,
            '"undefined"',
        );
    });

    it("BigInt aninhado em objeto → TypeError", () => {
        assertThrows(
            () => canonicalString({ a: 1n }),
            TypeError,
            '"bigint"',
        );
    });

    it("Date aninhado em objeto → TypeError", () => {
        assertThrows(
            () => canonicalString({ created: new Date() }),
            TypeError,
            "Date",
        );
    });

    it("Infinity aninhado → TypeError", () => {
        assertThrows(
            () => canonicalString({ value: Infinity }),
            TypeError,
            "non-finite",
        );
    });

    // ─── Profundidade máxima ────────────────────────────────────

    it("profundidade excessiva → TypeError", () => {
        let obj: Record<string, unknown> = {};
        let current = obj;
        for (let i = 0; i < 1010; i++) {
            current.x = {};
            current = current.x as Record<string, unknown>;
        }
        assertThrows(
            () => canonicalString(obj),
            TypeError,
            "Excessive depth",
        );
    });

    // ─── Casos de uso reais (AST-like) ──────────────────────────

    it("serializa estrutura similar a AST de cálculo", () => {
        const ast = {
            kind: "literal",
            value: { n: "100", d: "1" },
            originalInput: "100",
        };
        const result = canonicalString(ast);
        assertEquals(result, '{"kind":"literal","originalInput":"100","value":{"d":"1","n":"100"}}');
    });

    it("serializa trace de auditoria", () => {
        const trace = {
            ast: { kind: "literal", value: { n: "50", d: "1" } },
            finalResult: { n: "50", d: "1" },
            roundStrategy: "NBR5891",
        };
        const result = canonicalString(trace);
        assertEquals(
            result,
            '{"ast":{"kind":"literal","value":{"d":"1","n":"50"}},"finalResult":{"d":"1","n":"50"},"roundStrategy":"NBR5891"}',
        );
    });
});
