import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertThrows } from "@std/assert";
import { attachOp, validateASTNode } from "@src/ast/builder_utils.ts";
import { CalcAUYError } from "@src/core/errors.ts";
import type { LiteralNode, OperationNode } from "@src/ast/types.ts";

describe("AST Builder Utils - Validação e Anexação", () => {
    describe("validateASTNode", () => {
        it("deve lançar erro se o nó for nulo ou não for um objeto", () => {
            assertThrows(() => validateASTNode(null), CalcAUYError, "O nó da AST deve ser um objeto válido.");
            assertThrows(() => validateASTNode(undefined), CalcAUYError, "O nó da AST deve ser um objeto válido.");
            assertThrows(
                () => validateASTNode("not-an-object"),
                CalcAUYError,
                "O nó da AST deve ser um objeto válido.",
            );
        });

        it("deve lançar erro se a profundidade máxima for excedida", () => {
            const node: LiteralNode = { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" };
            assertThrows(
                () => validateASTNode(node, 501),
                CalcAUYError,
                "Profundidade máxima da AST excedida na hidratação.",
            );
        });

        it("deve lançar erro se o número máximo de nós for excedido", () => {
            const node: LiteralNode = { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" };
            const state = { nodeCount: 1000 };
            assertThrows(
                () => validateASTNode(node, 0, state),
                CalcAUYError,
                "Número máximo de nós excedido na hidratação.",
            );
        });

        it("deve lançar erro para tipos de nó desconhecidos", () => {
            assertThrows(
                () => validateASTNode({ kind: "unknown" }),
                CalcAUYError,
                "Tipo de nó desconhecido: unknown",
            );
        });

        describe("Validação de Nós Literais", () => {
            it("deve rejeitar literais sem valor racional", () => {
                assertThrows(
                    () => validateASTNode({ kind: "literal" }),
                    CalcAUYError,
                    "Nó literal sem valor racional.",
                );
            });

            it("deve rejeitar literais com valor racional malformado", () => {
                assertThrows(
                    () => validateASTNode({ kind: "literal", value: { n: 1, d: "1" } }),
                    CalcAUYError,
                    "Valor racional malformado (numerador/denominador devem ser strings).",
                );
                assertThrows(
                    () => validateASTNode({ kind: "literal", value: { n: "1", d: 1 } }),
                    CalcAUYError,
                    "Valor racional malformado (numerador/denominador devem ser strings).",
                );
            });
        });

        describe("Validação de Nós de Grupo", () => {
            it("deve rejeitar grupos sem nó filho", () => {
                assertThrows(
                    () => validateASTNode({ kind: "group" }),
                    CalcAUYError,
                    "Nó de grupo sem nó filho.",
                );
            });
        });

        describe("Validação de Nós de Operação", () => {
            it("deve rejeitar operações com tipo inválido", () => {
                assertThrows(
                    () => validateASTNode({ kind: "operation", type: "invalid", operands: [] }),
                    CalcAUYError,
                    "Tipo de operação inválido: invalid",
                );
            });

            it("deve rejeitar operações sem operandos ou com lista vazia", () => {
                assertThrows(
                    () => validateASTNode({ kind: "operation", type: "add" }),
                    CalcAUYError,
                    "Operação 'add' deve ter ao menos um operando.",
                );
                assertThrows(
                    () => validateASTNode({ kind: "operation", type: "add", operands: [] }),
                    CalcAUYError,
                    "Operação 'add' deve ter ao menos um operando.",
                );
            });
        });
    });

    describe("attachOp", () => {
        it("segurança: deve lidar com árvore corrompida (sem último operando)", () => {
            const target = {
                kind: "operation",
                type: "add",
                operands: [], // Empty operands violates type but tests safety check
            } as unknown as OperationNode;

            const right: LiteralNode = { kind: "literal", value: { n: "5", d: "1" }, originalInput: "5" };
            const result = attachOp(target, "mul", right) as OperationNode;

            // Devem ser criados como novos operandos do nó raiz devido ao fallback de segurança (!last)
            assertEquals(result.kind, "operation");
            assertEquals(result.type, "mul");
            assertEquals(result.operands.length, 2);
            assertEquals(result.operands[0], target);
            assertEquals(result.operands[1], right);
        });

        it("deve tornar a árvore atual o operando esquerdo quando a nova operação tem precedência menor ou igual", () => {
            // (1 * 2)
            const target: OperationNode = {
                kind: "operation",
                type: "mul",
                operands: [
                    { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" },
                    { kind: "literal", value: { n: "2", d: "1" }, originalInput: "2" },
                ],
            };

            const right: LiteralNode = { kind: "literal", value: { n: "3", d: "1" }, originalInput: "3" };

            // (1 * 2) + 3 -> 'add' tem precedência 4, 'mul' tem 3. New (4) > Current (3), so no dive.
            const result = attachOp(target, "add", right) as OperationNode;

            assertEquals(result.type, "add");
            assertEquals(result.operands[0], target);
            assertEquals(result.operands[1], right);
        });
    });
});
