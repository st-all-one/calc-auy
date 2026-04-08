import type { CalculationNode, OperationType } from "./types.ts";

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
