/**
 * CalcAUY - Abstract Syntax Tree (AST) Structure
 * @module
 */

export type NodeKind = "literal" | "operation" | "group";

export type OperationType =
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "pow"
    | "mod"
    | "divInt";

/**
 * Serialized representation of a RationalNumber.
 */
export interface RationalValue {
    n: string;
    d: string;
}

export interface BaseNode {
    kind: NodeKind;
    label?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Represents a fixed value in the calculation.
 */
export interface LiteralNode extends BaseNode {
    kind: "literal";
    value: RationalValue;
    originalInput: string;
}

/**
 * Represents a mathematical operation between operands.
 */
export interface OperationNode extends BaseNode {
    kind: "operation";
    type: OperationType;
    operands: CalculationNode[];
}

/**
 * Represents a logical grouping (parentheses).
 */
export interface GroupNode extends BaseNode {
    kind: "group";
    child: CalculationNode;
    isRedundant?: boolean;
}

export type CalculationNode = LiteralNode | OperationNode | GroupNode;
