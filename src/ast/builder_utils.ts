import type { CalculationNode, OperationType } from "./types.ts";
import { CalcAUYError } from "../core/errors.ts";

/**
 * Tabela de precedência para operações matemáticas.
 * Valores menores indicam prioridade superior (ex: Potência > Multiplicação > Adição).
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
 * Limites de segurança para a estrutura da AST durante a hidratação.
 */
const MAX_HYDRATE_DEPTH = 500;
const MAX_HYDRATE_NODES = 1000;

/**
 * Estado compartilhado para validação recursiva da AST.
 */
interface ValidationState {
    nodeCount: number;
}

/**
 * Valida recursivamente a estrutura de um nó da AST.
 * Lança um erro se encontrar inconsistências ou propriedades faltando.
 *
 * @param node O objeto a ser validado.
 * @param depth Nível atual de recursão (interno).
 * @param state Estado compartilhado para contagem de nós (interno).
 */
export function validateASTNode(
    node: unknown,
    // deno-lint-ignore default-param-last
    depth = 0,
    state?: ValidationState,
): asserts node is CalculationNode {
    const s = state ?? { nodeCount: 0 };

    if (!node || typeof node !== "object") {
        throw new CalcAUYError("corrupted-node", "O nó da AST deve ser um objeto válido.");
    }

    if (depth > MAX_HYDRATE_DEPTH) {
        throw new CalcAUYError("corrupted-node", "Profundidade máxima da AST excedida na hidratação.");
    }

    s.nodeCount++;
    if (s.nodeCount > MAX_HYDRATE_NODES) {
        throw new CalcAUYError("corrupted-node", "Número máximo de nós excedido na hidratação.");
    }

    const n = node as Record<string, unknown>;
    const kind = n.kind as string;
    const type = n.type as OperationType;
    const kindStr = String(kind);

    if (!["literal", "group", "operation"].includes(kind)) {
        throw new CalcAUYError("corrupted-node", `Tipo de nó desconhecido: ${kindStr}`);
    }

    if (kind === "literal") {
        if (!n.value || typeof n.value !== "object") {
            throw new CalcAUYError("corrupted-node", "Nó literal sem valor racional.");
        }
        const v = n.value as Record<string, unknown>;
        if (typeof v.n !== "string" || typeof v.d !== "string") {
            throw new CalcAUYError(
                "corrupted-node",
                "Valor racional malformado (numerador/denominador devem ser strings).",
            );
        }
    } else if (kind === "group") {
        if (!n.child) {
            throw new CalcAUYError("corrupted-node", "Nó de grupo sem nó filho.");
        }
        validateASTNode(n.child, depth + 1, s);
    } else if (kind === "operation") {
        const typeStr = String(type);
        if (!type || !PRECEDENCE[type]) {
            throw new CalcAUYError("corrupted-node", `Tipo de operação inválido: ${typeStr}`);
        }
        if (!Array.isArray(n.operands) || n.operands.length === 0) {
            throw new CalcAUYError("corrupted-node", `Operação '${typeStr}' deve ter ao menos um operando.`);
        }
        for (const op of n.operands) {
            validateASTNode(op, depth + 1, s);
        }
    }
}

/**
 * Anexa recursivamente uma nova operação à árvore, respeitando as regras de
 * precedência (PEMDAS) e associatividade.
 *
 * **Engenharia de Construção:**
 * Esta função permite que a Fluent API da CalcAUY (`.add(5).mult(2)`)
 * gere uma árvore semanticamente correta sem exigir parênteses manuais do usuário.
 * Ela "mergulha" a nova operação no operando à direita se a prioridade for maior.
 *
 * @param target Nó raiz atual da árvore.
 * @param type Tipo da nova operação (ex: 'add', 'mul').
 * @param right Novo operando à direita.
 * @returns {CalculationNode} Nova raiz da árvore reorganizada.
 */
export function attachOp(target: CalculationNode, type: OperationType, right: CalculationNode): CalculationNode {
    // Otimização: Aplanamento Associativo (Smart Flattening)
    // Se o nó atual já for do mesmo tipo e estiver "limpo", apenas anexamos o operando.
    // Isso reduz a profundidade da AST de O(N) para O(1) em sequências lineares.
    // Pulamos 'pow' pois sua associatividade é à direita.
    if (
        target.kind === "operation"
        && target.type === type
        && type !== "pow"
        && !target.metadata
        && !target.label
    ) {
        return {
            ...target,
            operands: [...target.operands, right],
        };
    }

    if (target.kind !== "operation") {
        return { kind: "operation", type, operands: [target, right] };
    }

    const currentPrec: number = PRECEDENCE[target.type];
    const newPrec: number = PRECEDENCE[type];

    // Regra de Ouro: Se a nova operação tem precedência maior (valor menor),
    // ou se é potência (associativa à direita), ela deve "mergulhar" no operando direito.
    if (newPrec < currentPrec || (type === "pow" && target.type === "pow")) {
        const lastIndex = target.operands.length - 1;
        const last = target.operands[lastIndex];

        if (!last) {
            // Segurança contra árvore corrompida.
            return { kind: "operation", type, operands: [target, right] };
        }

        const otherOperands = target.operands.slice(0, lastIndex);
        const updatedLast: CalculationNode = attachOp(last, type, right);

        return {
            ...target,
            operands: [...otherOperands, updatedLast],
        };
    }

    // Caso contrário, a árvore atual inteira torna-se o operando esquerdo da nova operação.
    return {
        kind: "operation",
        type,
        operands: [target, right],
    };
}
