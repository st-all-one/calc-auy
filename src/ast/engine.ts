import type { CalculationNode, OperationType } from "./types.ts";
import { RationalNumber } from "../core/rational.ts";
import { CalcAUYError } from "../core/errors.ts";
import { getSubLogger, measureTime } from "../utils/logger.ts";
import { sanitizeAST } from "../utils/sanitizer.ts";

const logger = getSubLogger("engine");

/**
 * Limite de profundidade da árvore para evitar estouro da pilha de chamadas (Stack Overflow).
 * Em sistemas auditáveis, expressões extremamente profundas devem ser divididas em sub-cálculos.
 */
const MAX_RECURSION_DEPTH = 500;

/**
 * Colapsa recursivamente um nó da AST em um resultado final (RationalNumber).
 *
 * **Fase de Commit:**
 * Esta função representa o momento da execução real do cálculo. Ela percorre a
 * árvore em profundidade (Post-order Traversal), resolvendo primeiro os operandos
 * e depois aplicando a operação correspondente.
 *
 * @param node Nó raiz da expressão.
 * @param depth Nível atual de recursão (usado para controle de segurança).
 * @returns {RationalNumber} O resultado matemático puro e exato.
 */
export function evaluate(node: CalculationNode, depth = 0): RationalNumber {
    if (depth > MAX_RECURSION_DEPTH) {
        throw new CalcAUYError(
            "math-overflow",
            "A profundidade da expressão excedeu o limite de segurança (AST muito complexa).",
            { partialAST: node },
        );
    }

    // Modo Produção: Execução direta e rápida sem overhead de telemetria.
    if (!logger.isEnabledFor("debug")) {
        return evaluateNode(node, depth);
    }

    // Modo Debug: Mede performance e loga estrutura sanitizada para auditoria técnica.
    const [result, duration] = measureTime(() => evaluateNode(node, depth));

    logger.debug("Node evaluated", {
        operation_kind: node.kind,
        depth,
        duration,
        structure: sanitizeAST(node),
    });

    return result;
}

/**
 * Lógica interna de avaliação sem telemetria para permitir reuso e performance.
 */
function evaluateNode(node: CalculationNode, depth: number): RationalNumber {
    switch (node.kind) {
        case "literal":
            return RationalNumber.from(BigInt(node.value.n), BigInt(node.value.d));

        case "group":
            return evaluate(node.child, depth + 1);

        case "operation":
            return evaluateOperation(node.type, node.operands, depth + 1, node);

        default: {
            throw new CalcAUYError(
                "corrupted-node",
                "Tipo de nó desconhecido na AST.",
                { partialAST: node },
            );
        }
    }
}

/**
 * Resolve internamente uma operação específica entre múltiplos operandos.
 */
function evaluateOperation(
    type: OperationType,
    operands: CalculationNode[],
    depth: number,
    parentNode: CalculationNode,
): RationalNumber {
    if (operands.length === 0) {
        throw new CalcAUYError("corrupted-node", `Operação '${type}' sem operandos.`, { partialAST: parentNode });
    }

    // Resolve todos os operandos recursivamente antes de aplicar o operador.
    const values: RationalNumber[] = operands.map((op) => evaluate(op, depth));

    try {
        const first = values[0];
        const rest = values.slice(1);

        switch (type) {
            case "add":
                return rest.reduce((acc, val) => acc.add(val), first);
            case "sub":
                return rest.reduce((acc, val) => acc.sub(val), first);
            case "mul":
                return rest.reduce((acc, val) => acc.mul(val), first);
            case "div":
                return rest.reduce((acc, val) => acc.div(val), first);
            case "pow":
                return rest.reduce((acc, val) => acc.pow(val), first);
            case "mod":
                return rest.reduce((acc, val) => acc.mod(val), first);
            case "divInt":
                return rest.reduce((acc, val) => acc.divInt(val), first);
            default: {
                const unsupported: never = type;
                throw new CalcAUYError("corrupted-node", `Operação não suportada: ${unsupported}`, {
                    partialAST: parentNode,
                });
            }
        }
    } catch (err) {
        if (err instanceof CalcAUYError) {
            // Enriquece o erro com a AST parcial se ainda não tiver
            if (!err.context.partialAST) {
                (err.context as { partialAST: unknown }).partialAST = parentNode;
            }
            throw err;
        }
        throw err;
    }
}
