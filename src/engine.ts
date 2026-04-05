import { CalculationNode, OperationType } from "./ast.ts";
import { RationalNumber } from "./rational.ts";
import { CalcAUYError } from "./errors.ts";
import { getSubLogger } from "./logger.ts";

const logger = getSubLogger("engine");

/**
 * Collapses an AST node into a final RationalNumber.
 * This is the core of the "commit" phase.
 */
export function evaluate(node: CalculationNode): RationalNumber {
    logger.debug("Evaluating node", { kind: node.kind, label: node.label });

    switch (node.kind) {
        case "literal":
            return RationalNumber.from(`${node.value.n}/${node.value.d}`);

        case "group":
            return evaluate(node.child);

        case "operation":
            return evaluateOperation(node.type, node.operands);

        default:
            throw new CalcAUYError(
                "corrupted-node",
                "Tipo de nó desconhecido na AST.",
            );
    }
}

/**
 * Resolves a specific operation node.
 */
function evaluateOperation(
    type: OperationType,
    operands: CalculationNode[],
): RationalNumber {
    if (operands.length === 0) {
        throw new CalcAUYError("corrupted-node", `Operação '${type}' sem operandos.`);
    }

    // Resolve all operands first
    const values = operands.map((op) => evaluate(op));

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
            // Precedence Rule: Right-associativity for power is handled during AST construction.
            // Here we just collapse the operands provided.
            return values.reduce((acc, val) => acc.pow(val));
        case "mod":
            return values.reduce((acc, val) => acc.mod(val));
        case "divInt":
            return values.reduce((acc, val) => acc.divInt(val));
        default:
            throw new CalcAUYError("corrupted-node", `Operação não suportada: ${type}`);
    }
}
