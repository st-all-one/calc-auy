/**
 * CalcAUY - Estrutura da Árvore de Sintaxe Abstrata (AST)
 * 
 * A AST é o coração da auditabilidade da CalcAUY. Diferente de uma execução 
 * imediata, a árvore preserva a estrutura original da fórmula, permitindo 
 * reconstruir o "rastro de pensamento" do cálculo para fins legais e técnicos.
 * 
 * @module
 */

/** Tipos de nós fundamentais da árvore. */
export type NodeKind = "literal" | "operation" | "group";

/** Operações matemáticas suportadas pela engine. */
export type OperationType =
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "pow"
    | "mod"
    | "divInt";

/** Representação serializável de um RationalNumber para hibernação. */
export interface RationalValue {
    n: string;
    d: string;
}

/** Interface base para todos os nós, garantindo rastreabilidade. */
export interface BaseNode {
    kind: NodeKind;
    /** Nome amigável do nó para relatórios de auditoria. */
    label?: string;
    /** Dados customizados (ex: ID de uma parcela, nome de um imposto). */
    metadata?: Record<string, unknown>;
}

/** Representa um valor fixo (ex: "10", "3.14"). Mantém o input original para precisão visual. */
export interface LiteralNode extends BaseNode {
    kind: "literal";
    value: RationalValue;
    originalInput: string;
}

/** Representa uma operação matemática e seus operandos. */
export interface OperationNode extends BaseNode {
    kind: "operation";
    type: OperationType;
    operands: CalculationNode[];
}

/** Representa um agrupamento lógico, essencial para a verbalização (A11y). */
export interface GroupNode extends BaseNode {
    kind: "group";
    child: CalculationNode;
    isRedundant?: boolean;
}

/** Tipo unificado para navegação na árvore. */
export type CalculationNode = LiteralNode | OperationNode | GroupNode;
