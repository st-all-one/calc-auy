/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalculationNode, OperationType } from "./types.ts";
import { RationalNumber } from "../core/rational.ts";
import { CalcAUYError } from "../core/errors.ts";
import { getSubLogger, measureTime } from "../utils/logger.ts";
import { sanitizeAST } from "../utils/sanitizer.ts";
import { MAX_RECURSION_DEPTH } from "../core/constants.ts";

const logger = getSubLogger("engine");

/**
 * Colapsa um nó da AST em um resultado final (RationalNumber).
 *
 * **Fase de Commit:**
 * Esta função representa o momento da execução real do cálculo. Ela percorre a
 * árvore em profundidade (Post-order Traversal) de forma iterativa, utilizando
 * uma pilha para evitar estouro da pilha de chamadas do sistema (Stack Overflow).
 *
 * @param node Nó raiz da expressão.
 * @param depth Nível inicial de profundidade (opcional, padrão 0).
 * @returns {RationalNumber} O resultado matemático puro e exato.
 */
export function evaluate(node: CalculationNode, depth = 0): RationalNumber {
    // Modo Produção: Execução direta e rápida sem overhead de telemetria.
    if (!logger.isEnabledFor("debug")) {
        return iterativeEvaluate(node, depth);
    }

    // Modo Debug: Mede performance e loga estrutura sanitizada para auditoria técnica.
    const [result, duration] = measureTime(() => iterativeEvaluate(node, depth));

    logger.debug("Node evaluated", {
        operation_kind: node.kind,
        depth,
        duration,
        structure: sanitizeAST(node),
    });

    return result;
}

/**
 * Definição de tarefas para o motor iterativo.
 */
type EvalTask =
    | { type: "eval"; node: CalculationNode; depth: number }
    | { type: "apply"; op: OperationType; count: number; parent: CalculationNode; depth: number };

/**
 * Motor de avaliação iterativo (Stack-based Post-order Traversal).
 */
function iterativeEvaluate(root: CalculationNode, initialDepth: number): RationalNumber {
    const workStack: EvalTask[] = [{ type: "eval", node: root, depth: initialDepth }];
    const resultStack: RationalNumber[] = [];

    while (workStack.length > 0) {
        // deno-lint-ignore no-non-null-assertion
        const task = workStack.pop()!;

        if (task.depth > MAX_RECURSION_DEPTH) {
            throw new CalcAUYError(
                "math-overflow",
                "A profundidade da expressão excedeu o limite de segurança (AST muito complexa).",
                { partialAST: task.type === "eval" ? task.node : task.parent },
            );
        }

        if (task.type === "eval") {
            const node = task.node;
            switch (node.kind) {
                case "literal":
                    resultStack.push(RationalNumber.from(BigInt(node.value.n), BigInt(node.value.d)));
                    break;

                case "group":
                case "control":
                    workStack.push({ type: "eval", node: node.child, depth: task.depth + 1 });
                    break;

                case "operation": {
                    const len = node.operands.length;
                    if (len === 0) {
                        throw new CalcAUYError("corrupted-node", `Operação '${node.type}' sem operandos.`, {
                            partialAST: node,
                        });
                    }

                    // Agendar a aplicação da operação (ocorre após os operandos serem resolvidos)
                    workStack.push({
                        type: "apply",
                        op: node.type,
                        count: len,
                        parent: node,
                        depth: task.depth,
                    });

                    // Agendar avaliação dos operandos em ordem inversa
                    // (Pilha: o primeiro operando será o último a entrar e o primeiro a sair para avaliação)
                    for (let i = len - 1; i >= 0; i--) {
                        workStack.push({ type: "eval", node: node.operands[i], depth: task.depth + 1 });
                    }
                    break;
                }

                default: {
                    throw new CalcAUYError(
                        "corrupted-node",
                        "Tipo de nó desconhecido na AST.",
                        { partialAST: node },
                    );
                }
            }
        } else {
            // task.type === "apply"
            const operands: RationalNumber[] = [];
            for (let i = 0; i < task.count; i++) {
                // deno-lint-ignore no-non-null-assertion
                operands.unshift(resultStack.pop()!);
            }

            try {
                const res = applyOperation(task.op, operands, task.parent);
                resultStack.push(res);
            } catch (err) {
                if (err instanceof CalcAUYError) {
                    if (!err.context.partialAST) {
                        (err.context as { partialAST: unknown }).partialAST = task.parent;
                    }
                }
                throw err;
            }
        }
    }

    // O resultado final é o único item restante na pilha de resultados.
    return resultStack[0];
}

/**
 * Aplica a operação matemática sobre a lista de operandos resolvidos.
 */
function applyOperation(
    type: OperationType,
    operands: RationalNumber[],
    parentNode: CalculationNode,
): RationalNumber {
    const len = operands.length;
    let acc: RationalNumber = operands[0];

    // Validação de segurança: garante que o tipo da operação é conhecido.
    const supportedOps: OperationType[] = ["add", "sub", "mul", "div", "pow", "mod", "divInt", "crossContextAdd"];
    if (!supportedOps.includes(type)) {
        throw new CalcAUYError("corrupted-node", `Operação não suportada: ${type}`, {
            partialAST: parentNode,
        });
    }

    for (let i = 1; i < len; i++) {
        const val: RationalNumber = operands[i];

        switch (type) {
            case "add":
            case "crossContextAdd":
                acc = acc.add(val);
                break;
            case "sub":
                acc = acc.sub(val);
                break;
            case "mul":
                acc = acc.mul(val);
                break;
            case "div":
                acc = acc.div(val);
                break;
            case "pow":
                acc = acc.pow(val);
                break;
            case "mod":
                acc = acc.mod(val);
                break;
            case "divInt":
                acc = acc.divInt(val);
                break;
            default: {
                const unsupported: never = type as never;
                throw new CalcAUYError("corrupted-node", `Operação não suportada: ${unsupported}`, {
                    partialAST: parentNode,
                });
            }
        }
    }

    return acc;
}
