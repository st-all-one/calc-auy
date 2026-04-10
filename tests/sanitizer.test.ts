import { describe, it, beforeEach } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import {
    setGlobalLoggingPolicy,
    sanitizeAST,
    sanitizeObject,
    loggingPolicy,
} from "../src/utils/sanitizer.ts";
import type { LiteralNode, GroupNode, OperationNode } from "../src/ast/types.ts";

const REDACTED = "[PII]";
const REDACTED_VALUE = { n: REDACTED, d: REDACTED };

describe("Sanitizer Utilities", () => {
    beforeEach(() => {
        // Reset to default sensitive state for consistency
        loggingPolicy.sensitive = true;
    });

    it("setGlobalLoggingPolicy deve definir a política global de logging", () => {
        setGlobalLoggingPolicy({ sensitive: false });
        assertEquals(loggingPolicy.sensitive, false);

        setGlobalLoggingPolicy({ sensitive: true });
        assertEquals(loggingPolicy.sensitive, true);
    });

    describe("sanitizeAST", () => {
        it("deve retornar { kind: 'null' } para nó nulo ou indefinido", () => {
            // @ts-ignore: Testando entrada inválida
            assertEquals(sanitizeAST(null), { kind: "null" });
            // @ts-ignore: Testando entrada inválida
            assertEquals(sanitizeAST(undefined), { kind: "null" });
        });

        it("deve ocultar valores literais e metadata por padrão (sensitive: true)", () => {
            const node: LiteralNode = {
                kind: "literal",
                value: { n: "123", d: "1" },
                originalInput: "123",
                metadata: { secret: "PII_data" },
                label: "Sensitive label",
            };
            const sanitized = sanitizeAST(node) as any; // Cast to any

            assertEquals(sanitized.kind, "literal");
            assertEquals(sanitized.value, REDACTED_VALUE);
            assertEquals(sanitized.originalInput, REDACTED);
            assertEquals(sanitized.metadata, REDACTED);
            assertEquals(sanitized.label, REDACTED);
        });

        it("deve mostrar valores literais e metadata quando loggingPolicy.sensitive for false", () => {
            setGlobalLoggingPolicy({ sensitive: false });
            const node: LiteralNode = {
                kind: "literal",
                value: { n: "123", d: "1" },
                originalInput: "123",
                metadata: { secret: "PII_data" },
                label: "Sensitive label",
            };
            const sanitized = sanitizeAST(node) as any; // Cast to any

            assertEquals(sanitized.kind, "literal");
            assertEquals(sanitized.value, node.value);
            assertEquals(sanitized.originalInput, node.originalInput);
            assertEquals(sanitized.metadata, node.metadata);
            assertEquals(sanitized.label, node.label);
        });

        it("deve recursivamente sanitizar nós de grupo", () => {
            const node: GroupNode = {
                kind: "group",
                child: {
                    kind: "literal",
                    value: { n: "10", d: "1" },
                    originalInput: "10",
                },
            };
            const sanitized = sanitizeAST(node) as any; // Cast to any

            assertEquals(sanitized.kind, "group");
            assertEquals(sanitized.child.kind, "literal");
            assertEquals(sanitized.child.value, REDACTED_VALUE);
        });

        it("deve recursivamente sanitizar nós de operação", () => {
            const node: OperationNode = {
                kind: "operation",
                type: "add",
                operands: [
                    { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" },
                    { kind: "literal", value: { n: "2", d: "1" }, originalInput: "2" },
                ],
            };
            const sanitized = sanitizeAST(node) as any; // Cast to any

            assertEquals(sanitized.kind, "operation");
            assertEquals(sanitized.type, REDACTED);
            assertEquals(sanitized.operands, REDACTED);
        });

        it("deve respeitar a sobreposição de PII nos metadados do nó", () => {
            // Caso 1: PII = false no nó (mostra dados, mesmo que global.sensitive = true)
            const node1: LiteralNode = {
                kind: "literal",
                value: { n: "100", d: "1" },
                originalInput: "100",
                metadata: { pii: false, info: "Not PII" },
            };
            const sanitized1 = sanitizeAST(node1) as any; // Cast to any
            assertEquals(sanitized1.value, node1.value);
            assertEquals(sanitized1.metadata, node1.metadata);

            // Caso 2: PII = true no nó (oculta dados, mesmo que global.sensitive = false)
            setGlobalLoggingPolicy({ sensitive: false });
            const node2: LiteralNode = {
                kind: "literal",
                value: { n: "200", d: "1" },
                originalInput: "200",
                metadata: { pii: true, info: "Is PII" },
            };
            const sanitized2 = sanitizeAST(node2) as any; // Cast to any
            assertEquals(sanitized2.value, REDACTED_VALUE);
            assertEquals(sanitized2.metadata, REDACTED);
        });
    });

    describe("sanitizeObject", () => {
        it("deve retornar null/undefined como estão", () => {
            assertEquals(sanitizeObject(null), null);
            assertEquals(sanitizeObject(undefined), undefined);
        });

        it("deve retornar o objeto original se loggingPolicy.sensitive for false", () => {
            setGlobalLoggingPolicy({ sensitive: false });
            const obj = { secret: "data", num: 123 };
            assertEquals(sanitizeObject(obj), obj);
        });

        it("deve recursivamente sanitizar arrays", () => {
            const arr = [
                "sensitive_string_longer_than_50_chars_to_be_redacted_by_length_check",
                123456789012345678901234567890n,
                { rawInput: "secret input" },
                "public_string",
            ];
            const sanitized = sanitizeObject(arr) as any; // Cast here

            assertEquals(sanitized[0], REDACTED);
            assertEquals(sanitized[1], REDACTED);
            assertEquals(sanitized[2].rawInput, REDACTED);
            assertEquals(sanitized[3], "public_string");
        });

        it("deve sanitizar objetos aninhados, incluindo nós AST", () => {
            const astNode: LiteralNode = {
                kind: "literal",
                value: { n: "1", d: "1" },
                originalInput: "1",
            };
            const obj = {
                sensitive_number: 12345,
                sensitive_string: "123456789012345678901234567890123456789012345678901",
                rawInput: "user_input_secret",
                nested: {
                    metadata: "another_secret",
                    public_key: "public",
                    ast: astNode,
                },
            };
            const sanitized = sanitizeObject(obj) as any; // Cast here

            assertEquals(sanitized.sensitive_number, REDACTED);
            assertEquals(sanitized.sensitive_string, REDACTED);
            assertEquals(sanitized.rawInput, REDACTED);
            assertEquals(sanitized.nested.metadata, REDACTED);
            assertEquals(sanitized.nested.public_key, "public");
            assertEquals(sanitized.nested.ast.kind, "literal");
            assertEquals(sanitized.nested.ast.value, REDACTED_VALUE);
            assertEquals(sanitized.nested.ast.originalInput, REDACTED);
        });

        it("deve sanitizar strings longas e numéricas", () => {
            assertEquals(sanitizeObject("123456789012345678901234567890123456789012345678901"), REDACTED);
            assertEquals(sanitizeObject("123"), REDACTED);
            assertEquals(sanitizeObject("abc"), "abc");
        });

        it("deve sanitizar números e BigInts", () => {
            assertEquals(sanitizeObject(123), REDACTED);
            assertEquals(sanitizeObject(123n), REDACTED);
            assertEquals(sanitizeObject(0), REDACTED);
        });

        it("não deve sanitizar booleans ou Symbols", () => {
            assertEquals(sanitizeObject(true), true);
            assertEquals(sanitizeObject(false), false);
            const sym = Symbol("test");
            assertEquals(sanitizeObject(sym), sym);
        });

        it("deve garantir que pii: false no metadata do nó AST sobrepõe a política sensitive: true", () => {
            const node: LiteralNode = {
                kind: "literal",
                value: { n: "100", d: "1" },
                originalInput: "100",
                metadata: { pii: false, info: "Not PII" },
            };
            const obj = { ast: node };
            const sanitized = sanitizeObject(obj) as any;

            assertEquals(sanitized.ast.value, node.value);
            assertEquals(sanitized.ast.metadata, node.metadata);
            assertEquals(sanitized.ast.originalInput, node.originalInput);
        });
    });
});
