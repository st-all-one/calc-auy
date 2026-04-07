import type { CalculationNode, OperationType } from "./types.ts";
import { RationalNumber } from "../core/rational.ts";
import { CalcAUYError } from "../core/errors.ts";
import { getSubLogger, measureTime } from "../utils/logger.ts";

const logger = getSubLogger("engine");

const MAX_RECURSION_DEPTH: number = 500;

/**
 * Collapses an AST node into a final RationalNumber.
 * This is the core of the "commit" phase.
 */
export function evaluate(node: CalculationNode, depth: number = 0): RationalNumber {
    if (depth > MAX_RECURSION_DEPTH) {
        throw new CalcAUYError(
            "math-overflow",
            "A profundidade da expressão excedeu o limite de segurança (AST muito complexa).",
        );
    }

    const [result, duration] = measureTime(() => {
        switch (node.kind) {
            case "literal":
                return RationalNumber.from(`${node.value.n}/${node.value.d}`);

            case "group":
                return evaluate(node.child, depth + 1);

            case "operation":
                return evaluateOperation(node.type, node.operands, depth + 1);

            default:
                throw new CalcAUYError(
                    "corrupted-node",
                    "Tipo de nó desconhecido na AST.",
                );
        }
    });

    logger.debug("Node evaluated", {
        kind: node.kind,
        label: node.label,
        depth,
        duration,
    });

    return result;
}

/**
 * Resolves a specific operation node.
 */
function evaluateOperation(
    type: OperationType,
    operands: CalculationNode[],
    depth: number,
): RationalNumber {
    if (operands.length === 0) {
        throw new CalcAUYError("corrupted-node", `Operação '${type}' sem operandos.`);
    }

    // Resolve all operands first
    const values: RationalNumber[] = operands.map((op) => evaluate(op, depth));

    switch (type) {
        case "add":
            return values.reduce((acc, val) => acc.add(val));
        case "sub":
            return values.reduce((acc, val) => acc.sub(val));
        case "mul":
            return values.reduce((acc, val) => acc.mul(val));
        case "div":
            return values.reduce((acc, val) => acc.div(val));
        case "pow":
            return values.reduce((acc, val) => acc.pow(val));
        case "mod":
            return values.reduce((acc, val) => acc.mod(val));
        case "divInt":
            return values.reduce((acc, val) => acc.divInt(val));
        default:
            const unsupported: never = type as never;
            throw new CalcAUYError("corrupted-node", `Operação não suportada: ${unsupported}`);
    }
}
