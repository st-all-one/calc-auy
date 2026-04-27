/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** Tipos de nós fundamentais da árvore. */
export type NodeKind = "literal" | "operation" | "group" | "control";

/** Operações matemáticas suportadas pela engine. */
export type OperationType =
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "pow"
    | "mod"
    | "divInt"
    | "crossContextAdd";

/** Representação serializável de um RationalNumber para hibernação. */
export type RationalValue = {
    n: string;
    d: string;
};

/**
 * Tipos permitidos para metadados de auditoria.
 * Restrito a tipos serializáveis para garantir a integridade do rastro JSON.
 */
export type MetadataValue =
    | string
    | number
    | boolean
    | MetadataValue[]
    | { [key: string]: MetadataValue };

/** Tipo base para todos os nós, garantindo rastreabilidade. */
export type BaseNode = {
    kind: NodeKind;
    /** Dados customizados (ex: ID de uma parcela, nome de um imposto). */
    metadata?: Record<string, MetadataValue>;
};

/** Representa um valor fixo (ex: "10", "3.14"). Mantém o input original para precisão visual. */
export type LiteralNode = BaseNode & {
    kind: "literal";
    value: RationalValue;
    originalInput: string;
};

/** Representa uma operação matemática e seus operandos. */
export type OperationNode = BaseNode & {
    kind: "operation";
    type: OperationType;
    operands: CalculationNode[];
};

/** Representa um agrupamento lógico, essencial para a verbalização (A11y). */
export type GroupNode = BaseNode & {
    kind: "group";
    child: CalculationNode;
};

/**
 * Representa um nó de controle para rastreabilidade de jurisdição.
 * Engenharia: Usado em reidratação (hydrate) ou união de contextos externos.
 */
export type ControlNode = BaseNode & {
    kind: "control";
    type: "reanimation_event";
    metadata: {
        previousContextLabel: string;
        previousSignature: string;
    } & Record<string, MetadataValue>;
    child: CalculationNode;
};

/** Tipo unificado para navegação na árvore. */
export type CalculationNode = LiteralNode | OperationNode | GroupNode | ControlNode;

/** Representa a estrutura de um cálculo serializado (hibernado) e assinado. */
export type SerializedCalculation = {
    /** A árvore de sintaxe (AST) completa. */
    ast: CalculationNode;
    /** Assinatura digital BLAKE3 para garantia de integridade. */
    signature: string;
    /** Identificador da jurisdição (contexto) original. */
    contextLabel: string;
    /** Resultado consolidado (apenas em traces de auditoria). */
    finalResult?: RationalValue;
    /** Estratégia de arredondamento aplicada (apenas em traces). */
    roundStrategy?: string;
};
