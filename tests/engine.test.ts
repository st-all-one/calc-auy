import { beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { evaluate } from "@src/ast/engine.ts";
import { CalcAUYError } from "@src/core/errors.ts";
import { getSubLogger } from "@src/utils/logger.ts";
import type { CalculationNode } from "@src/ast/types.ts";

// Type for valid log levels
type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "fatal";

// Mock logger.isEnabledFor for testing logging calls.
const engineLogger = getSubLogger("engine");
const originalIsEnabledFor = engineLogger.isEnabledFor;

describe("AST Engine - Mecanismo de Avaliação", () => {
    // Restore mocks after each test
    beforeEach(() => {
        engineLogger.isEnabledFor = originalIsEnabledFor;
    });

    it("deve lançar erro se o tipo de nó for desconhecido", () => {
        const invalidNode = { kind: "ghost" } as unknown as CalculationNode;
        assertThrows(
            () => evaluate(invalidNode),
            CalcAUYError,
            "Tipo de nó desconhecido na AST.",
        );
    });

    it("deve chamar logger.debug quando o nó é avaliado e o debug está habilitado", () => {
        let debugCalled = false;
        engineLogger.isEnabledFor = (level: LogLevel) => {
            if (level === "debug") {
                debugCalled = true;
                return true;
            }
            return false;
        };

        const node: CalculationNode = {
            kind: "literal",
            value: { n: "10", d: "1" },
            originalInput: "10",
        };

        evaluate(node);
        assert(debugCalled, "logger.debug should have been called for node evaluation");
    });

    describe("evaluateOperation", () => {
        it("deve lançar erro se uma operação não tiver operandos", () => {
            const emptyOpNode: CalculationNode = {
                kind: "operation",
                type: "add",
                operands: [], // Empty list
            };

            const err = assertThrows(
                () => evaluate(emptyOpNode),
                CalcAUYError,
                "Operação 'add' sem operandos.",
            );

            // Verificando se a AST parcial foi anexada
            assertEquals((err as CalcAUYError).context.partialAST, emptyOpNode);
        });

        it("deve lançar erro para operações não suportadas", () => {
            const unsupportedNode = {
                kind: "operation",
                type: "unsupported_func",
                operands: [
                    { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" },
                ],
            } as unknown as CalculationNode;

            const err = assertThrows(
                () => evaluate(unsupportedNode),
                CalcAUYError,
                "Operação não suportada: unsupported_func",
            );

            assertEquals((err as CalcAUYError).context.partialAST, unsupportedNode);
        });

        it("deve enriquecer o erro com a AST parcial se um erro ocorrer durante a operação", () => {
            // Provocar um erro durante a execução da operação (ex: divisão por zero no commit/execução)
            // Nota: O engine resolve os operandos antes.
            const divByZeroNode: CalculationNode = {
                kind: "operation",
                type: "div",
                operands: [
                    { kind: "literal", value: { n: "10", d: "1" }, originalInput: "10" },
                    { kind: "literal", value: { n: "0", d: "1" }, originalInput: "0" },
                ],
            };

            const err = assertThrows(
                () => evaluate(divByZeroNode),
                CalcAUYError,
                "O denominador não pode ser zero.",
            );

            // O erro original da RationalNumber não tem partialAST.
            // O engine.ts deve ter capturado e anexado.
            assertEquals((err as CalcAUYError).context.partialAST, divByZeroNode);
        });
    });
});
