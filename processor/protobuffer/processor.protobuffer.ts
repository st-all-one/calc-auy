import type { CalcAUYCustomOutput, InternalTypes } from "@calc-auy";
import protobuf from "protobufjs";

type CalculationNode = InternalTypes.ASTTypes.CalculationNode;
type SerializedCalculation = InternalTypes.ASTTypes.SerializedCalculation;
type LiteralNode = InternalTypes.ASTTypes.LiteralNode;
type OperationNode = InternalTypes.ASTTypes.OperationNode;
type GroupNode = InternalTypes.ASTTypes.GroupNode;
type ControlNode = InternalTypes.ASTTypes.ControlNode;
type MetadataValue = InternalTypes.ASTTypes.MetadataValue;

const PROTO_DEF = `
syntax = "proto3";
package calc_auy;
enum OperationType {
  OPERATION_TYPE_UNSPECIFIED = 0;
  OPERATION_TYPE_ADD = 1;
  OPERATION_TYPE_SUB = 2;
  OPERATION_TYPE_MULT = 3;
  OPERATION_TYPE_DIV = 4;
  OPERATION_TYPE_POW = 5;
  OPERATION_TYPE_MOD = 6;
  OPERATION_TYPE_DIV_INT = 7;
  OPERATION_TYPE_CROSS_CONTEXT_ADD = 8;
}
message RationalValue { string n = 1; string d = 2; }
message MetadataValue {
  oneof value {
    string string_val = 1;
    double double_val = 2;
    bool bool_val = 3;
    MetadataList array_val = 4;
    MetadataMap object_val = 5;
  }
}
message MetadataList { repeated MetadataValue items = 1; }
message MetadataMap { map<string, MetadataValue> fields = 1; }
message CalculationNode {
  string kind = 1;
  map<string, MetadataValue> metadata = 2;
  oneof node_type {
    LiteralNode literal = 3;
    OperationNode operation = 4;
    GroupNode group = 5;
    ControlNode control = 6;
  }
}
message LiteralNode { RationalValue value = 1; string originalInput = 2; }
message OperationNode { OperationType type = 1; repeated CalculationNode operands = 2; }
message GroupNode { CalculationNode child = 1; }
message ControlNode { string type = 1; string previousContextLabel = 2; string previousSignature = 3; string previousRoundStrategy = 4; CalculationNode child = 5; }
message SerializedCalculation {
  CalculationNode ast = 1;
  string signature = 2;
  string contextLabel = 3;
  RationalValue finalResult = 4;
  string roundStrategy = 5;
}
`;

const root = protobuf.parse(PROTO_DEF).root;
const SerializedCalculationMsg = root.lookupType(
    "calc_auy.SerializedCalculation",
);

const OP_MAP: Record<string, number> = {
    add: 1,
    sub: 2,
    mul: 3,
    div: 4,
    pow: 5,
    mod: 6,
    divInt: 7,
    crossContextAdd: 8,
};

const REV_OP_MAP: Record<string | number, InternalTypes.ASTTypes.OperationType> = {
    1: "add",
    OPERATION_TYPE_ADD: "add",
    2: "sub",
    OPERATION_TYPE_SUB: "sub",
    3: "mul",
    OPERATION_TYPE_MULT: "mul",
    4: "div",
    OPERATION_TYPE_DIV: "div",
    5: "pow",
    OPERATION_TYPE_POW: "pow",
    6: "mod",
    OPERATION_TYPE_MOD: "mod",
    7: "divInt",
    OPERATION_TYPE_DIV_INT: "divInt",
    8: "crossContextAdd",
    OPERATION_TYPE_CROSS_CONTEXT_ADD: "crossContextAdd",
};

/**
 * Interface rigorosa para representação intermediária do Protobuf.
 */
interface IProtoNode {
    kind: string;
    metadata: Record<string, InternalTypes.ASTTypes.MetadataValue> | Record<never, never>;
    literal?: { value: { n: string; d: string }; originalInput: string };
    operation?: { type: string | number; operands: IProtoNode[] };
    group?: { child: IProtoNode };
    control?: {
        type: string;
        child: IProtoNode;
        previousContextLabel: string;
        previousSignature: string;
        previousRoundStrategy: string;
    };
}

interface IProtoPayload {
    ast: IProtoNode;
    finalResult: { n: string; d: string };
    roundStrategy: string;
    signature: string;
    contextLabel: string;
}

/**
 * Processador oficial para exportação em formato Protobuf v3.
 */
export const protobufProcessor: CalcAUYCustomOutput<Uint8Array> = function (
    ctx,
): Uint8Array {
    const obj = ctx.methods.toLiveTrace();

    if (!obj.finalResult || !obj.roundStrategy) {
        throw new Error(
            "Incomplete Audit Trace: finalResult and roundStrategy are required for serialization.",
        );
    }

    const payload: IProtoPayload = {
        ast: transformNode(obj.ast),
        finalResult: { n: obj.finalResult.n, d: obj.finalResult.d },
        roundStrategy: obj.roundStrategy,
        signature: obj.signature,
        contextLabel: obj.contextLabel,
    };

    const message = SerializedCalculationMsg.create(payload);
    return SerializedCalculationMsg.encode(message).finish();
};

/**
 * Utilitário para transformar um rastro Protobuf de volta em um objeto AST hidratável.
 */
export function protobufHydrator(buffer: Uint8Array): SerializedCalculation {
    const decoded = SerializedCalculationMsg.decode(buffer);
    const plain = SerializedCalculationMsg.toObject(decoded, {
        enums: String,
        longs: String,
        defaults: true,
        oneofs: true,
    }) as unknown as {
        ast: IProtoNode;
        finalResult: { n: string; d: string };
        roundStrategy: string;
        signature: string;
        contextLabel: string;
    };

    return {
        ast: reverseTransformNode(plain.ast),
        finalResult: plain.finalResult,
        roundStrategy: plain.roundStrategy,
        signature: plain.signature,
        contextLabel: plain.contextLabel,
    };
}

function transformNode(node: CalculationNode): IProtoNode {
    const res: any = {
        kind: node.kind,
    };

    if (node.kind === "literal") {
        res.literal = {
            value: { n: node.value.n, d: node.value.d },
            originalInput: node.originalInput,
        };
    } else if (node.kind === "operation") {
        res.operation = {
            type: OP_MAP[node.type] || 0,
            operands: node.operands.map((o: CalculationNode) => transformNode(o)),
        };
    } else if (node.kind === "group") {
        res.group = {
            child: transformNode(node.child),
        };
    } else if (node.kind === "control") {
        res.control = {
            type: node.type,
            previousContextLabel: node.metadata.previousContextLabel,
            previousSignature: node.metadata.previousSignature,
            previousRoundStrategy: node.metadata.previousRoundStrategy as string || "",
            child: transformNode(node.child),
        };
    }

    if (node.metadata && Object.keys(node.metadata).length > 0) {
        res.metadata = transformMetadata(node.metadata);
    } else {
        res.metadata = {};
    }

    return res as IProtoNode;
}

function reverseTransformNode(node: IProtoNode): CalculationNode {
    const metadata = unwrapMetadata(node.metadata);

    if (node.literal) {
        const res: any = {
            kind: "literal",
            value: node.literal.value,
            originalInput: node.literal.originalInput,
        };
        if (Object.keys(metadata).length > 0) { res.metadata = metadata; }
        return res as LiteralNode;
    }

    if (node.operation) {
        const res: any = {
            kind: "operation",
            type: REV_OP_MAP[node.operation.type] || "add",
            operands: node.operation.operands.map((o) => reverseTransformNode(o)),
        };
        if (Object.keys(metadata).length > 0) { res.metadata = metadata; }
        return res as OperationNode;
    }

    if (node.group) {
        const res: any = {
            kind: "group",
            child: reverseTransformNode(node.group.child),
        };
        if (Object.keys(metadata).length > 0) { res.metadata = metadata; }
        return res as GroupNode;
    }

    if (node.control) {
        return {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                ...metadata,
                previousContextLabel: node.control.previousContextLabel,
                previousSignature: node.control.previousSignature,
                previousRoundStrategy: node.control.previousRoundStrategy,
            },
            child: reverseTransformNode(node.control.child),
        } as ControlNode;
    }

    throw new Error(
        `Invalid node structure during Protobuf hydration: ${node.kind}`,
    );
}

function transformMetadata(
    meta: Record<string, MetadataValue>,
): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(meta)) {
        fields[key] = wrapValue(val);
    }
    return fields;
}

function unwrapMetadata(
    meta: Record<string, unknown>,
): Record<string, MetadataValue> {
    const res: Record<string, MetadataValue> = {};
    for (const [key, val] of Object.entries(meta || {})) {
        res[key] = unwrapValue(val);
    }
    return res;
}

function wrapValue(val: MetadataValue): unknown {
    if (typeof val === "string") { return { stringVal: val }; }
    if (typeof val === "number") { return { doubleVal: val }; }
    if (typeof val === "boolean") { return { boolVal: val }; }
    if (Array.isArray(val)) { return { arrayVal: { items: val.map(wrapValue) } }; }
    if (typeof val === "object" && val !== null) {
        const fields: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val)) {
            fields[k] = wrapValue(v);
        }
        return { objectVal: { fields } };
    }
    return { stringVal: String(val) };
}

// deno-lint-ignore no-explicit-any
function unwrapValue(val: any): MetadataValue {
    if (val.stringVal !== undefined) { return val.stringVal; }
    if (val.doubleVal !== undefined) { return val.doubleVal; }
    if (val.boolVal !== undefined) { return val.boolVal; }
    if (val.arrayVal !== undefined) { return val.arrayVal.items.map(unwrapValue); }
    if (val.objectVal !== undefined) {
        const res: Record<string, MetadataValue> = {};
        for (const [k, v] of Object.entries(val.objectVal.fields || {})) {
            res[k] = unwrapValue(v);
        }
        return res;
    }
    return "";
}
