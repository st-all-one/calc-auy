import type { CalcAUYCustomOutput, InternalTypes } from "@calc-auy";
import { type CborType, decodeCbor, encodeCbor } from "@std/cbor";

type CalculationNode = InternalTypes.ASTTypes.CalculationNode;
type SerializedCalculation = InternalTypes.ASTTypes.SerializedCalculation;
type LiteralNode = InternalTypes.ASTTypes.LiteralNode;
type OperationNode = InternalTypes.ASTTypes.OperationNode;
type GroupNode = InternalTypes.ASTTypes.GroupNode;
type ControlNode = InternalTypes.ASTTypes.ControlNode;

/**
 * Processador oficial para exportação em formato binário CBOR (RFC 8949).
 */
export const cborProcessor: CalcAUYCustomOutput<Uint8Array> = function (ctx): Uint8Array {
    const obj = ctx.methods.toLiveTrace();

    if (!obj.finalResult || !obj.roundStrategy) {
        throw new Error(
            "Incomplete Audit Trace: finalResult and roundStrategy are required for serialization.",
        );
    }

    // Engenharia: Construção rigorosa do payload seguindo a ordem canônica.
    const payload: Record<string, CborType> = {
        ast: transformNode(obj.ast),
        finalResult: {
            n: obj.finalResult.n,
            d: obj.finalResult.d,
        } as unknown as CborType,
        roundStrategy: obj.roundStrategy,
        signature: obj.signature,
        contextLabel: obj.contextLabel,
    };

    return encodeCbor(payload);
};

interface ICborNode {
    kind: number;
    value?: { n: string; d: string };
    originalInput?: string;
    type?: number;
    operands?: ICborNode[];
    child?: ICborNode;
    previousContextLabel?: string;
    previousSignature?: string;
    previousRoundStrategy?: string;
    metadata?: Record<string, InternalTypes.ASTTypes.MetadataValue>;
}

interface ICborPayload {
    ast: ICborNode;
    finalResult: { n: string; d: string };
    roundStrategy: string;
    signature: string;
    contextLabel: string;
}

/**
 * Utilitário para reanimar cálculos a partir de buffers CBOR.
 */
export function cborHydrator(buffer: Uint8Array): SerializedCalculation {
    const decoded = decodeCbor(buffer) as unknown as ICborPayload;
    return {
        ast: reverseTransformNode(decoded.ast),
        finalResult: decoded.finalResult,
        roundStrategy: decoded.roundStrategy,
        signature: decoded.signature,
        contextLabel: decoded.contextLabel,
    };
}

function transformNode(node: CalculationNode): CborType {
    const res: Record<string, CborType> = {
        kind: (KIND_MAP[node.kind] || 0) as CborType,
    };

    if (node.kind === "literal") {
        res.value = { n: node.value.n, d: node.value.d } as unknown as CborType;
        res.originalInput = node.originalInput;
    } else if (node.kind === "operation") {
        res.type = (OP_MAP[node.type] || 0) as CborType;
        res.operands = node.operands.map((o: CalculationNode) => transformNode(o)) as unknown as CborType;
    } else if (node.kind === "group") {
        res.child = transformNode(node.child);
    } else if (node.kind === "control") {
        res.type = node.type;
        res.child = transformNode(node.child);
        res.previousContextLabel = node.metadata
            .previousContextLabel as CborType;
        res.previousSignature = node.metadata.previousSignature as CborType;
        res.previousRoundStrategy = (node.metadata.previousRoundStrategy as string || "") as CborType;
    }

    if (node.metadata && Object.keys(node.metadata).length > 0) {
        res.metadata = node.metadata as unknown as CborType;
    }

    return res as CborType;
}

const KIND_MAP: Record<string, number> = {
    literal: 1,
    operation: 2,
    group: 3,
    control: 4,
};

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

const REV_KIND_MAP: Record<number, string> = {
    1: "literal",
    2: "operation",
    3: "group",
    4: "control",
};

const REV_OP_MAP: Record<number, InternalTypes.ASTTypes.OperationType> = {
    1: "add",
    2: "sub",
    3: "mul",
    4: "div",
    5: "pow",
    6: "mod",
    7: "divInt",
    8: "crossContextAdd",
};

function reverseTransformNode(node: ICborNode): CalculationNode {
    const kind = REV_KIND_MAP[node.kind] || "literal";

    if (kind === "literal" && node.value) {
        const res: any = {
            kind: "literal",
            value: node.value,
            originalInput: node.originalInput || "",
        };
        if (node.metadata) { res.metadata = node.metadata; }
        return res as LiteralNode;
    }

    if (kind === "operation" && node.type && node.operands) {
        const res: any = {
            kind: "operation",
            type: REV_OP_MAP[node.type] || "add",
            operands: node.operands.map((o) => reverseTransformNode(o)),
        };
        if (node.metadata) { res.metadata = node.metadata; }
        return res as OperationNode;
    }

    if (kind === "group" && node.child) {
        const res: any = {
            kind: "group",
            child: reverseTransformNode(node.child),
        };
        if (node.metadata) { res.metadata = node.metadata; }
        return res as GroupNode;
    }

    if (kind === "control" && node.child) {
        return {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                ...(node.metadata || {}),
                previousContextLabel: node.previousContextLabel || "",
                previousSignature: node.previousSignature || "",
                previousRoundStrategy: node.previousRoundStrategy || "",
            },
            child: reverseTransformNode(node.child),
        } as ControlNode;
    }

    throw new Error(
        `Invalid node structure during CBOR hydration: ${node.kind}`,
    );
}
