import type { CalculationNode, OperationType } from "./types.ts";

/**
 * Precedence mapping for mathematical operations (Lower value = Higher priority).
 */
export const PRECEDENCE: Record<OperationType, number> = {
    pow: 2,
    mul: 3,
    div: 3,
    divInt: 3,
    mod: 3,
    add: 4,
    sub: 4,
};

/**
 * Recursively attaches a new operation to the tree respecting PEMDAS and Associativity.
 */
export function attachOp(target: CalculationNode, type: OperationType, right: CalculationNode): CalculationNode {
    if (target.kind !== "operation") {
        return { kind: "operation", type, operands: [target, right] };
    }

    const currentPrec: number = PRECEDENCE[target.type];
    const newPrec: number = PRECEDENCE[type];

    // Golden Rule: If the new operation has higher precedence (smaller value),
    // or if it's power (right-associative), it must "dive" into the right operand.
    if (newPrec < currentPrec || (type === "pow" && target.type === "pow")) {
        const operands: CalculationNode[] = [...target.operands];
        const last: CalculationNode = operands.pop()!;
        const updatedLast: CalculationNode = attachOp(last, type, right);

        return {
            ...target,
            operands: [...operands, updatedLast],
        };
    }

    // Otherwise, the entire current tree becomes the left operand of the new node.
    return {
        kind: "operation",
        type,
        operands: [target, right],
    };
}
