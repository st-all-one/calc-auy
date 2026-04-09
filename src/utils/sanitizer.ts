/**
 * CalcAUY - Utilitário de Sanitização para Proteção de PII
 * @module
 */

import type { CalculationNode } from "../ast/types.ts";

const REDACTED = "[PII]";

/** Política global de logging. */
export const loggingPolicy = {
    /**
     * Se true (padrão), assume que os dados SÃO sensíveis e devem ser OCULTOS.
     * Se false, permite a exibição de dados sensíveis globalmente.
     */
    sensitive: true,
};

/**
 * Define a política global de logging para a proteção de PII.
 * @param policy Configuração da política (sensitive: true oculta, false mostra).
 */
export function setGlobalLoggingPolicy(policy: { sensitive: boolean }): void {
    loggingPolicy.sensitive = policy.sensitive;
}

/**
 * Determina se um nó deve ter seus dados ocultados com base na política
 * global e na sobreposição específica do nó via metadados.
 *
 * @param node Nó a ser verificado.
 * @returns true se deve ocultar, false se deve mostrar.
 */
function shouldHide(node: CalculationNode): boolean {
    const nodeOverride = node.metadata?.pii;

    // Se o nó tem uma sobreposição específica (pii: true|false)
    if (typeof nodeOverride === "boolean") {
        // pii: true -> identifica que É PII, portanto OCULTA (true)
        // pii: false -> identifica que NÃO é PII, portanto MOSTRA (false)
        return nodeOverride;
    }

    // Caso contrário, segue a política global (sensitive: true oculta, false mostra)
    return loggingPolicy.sensitive;
}

/**
 * Sanitiza a estrutura da AST para logs, removendo valores literais e metadados.
 * Mantém apenas a hierarquia e os tipos de operações, a menos que a política
 * ou o nó permitam a liberação.
 *
 * @param node Nó da AST a ser sanitizado.
 * @returns Objeto sanitizado pronto para log.
 */
export function sanitizeAST(node: CalculationNode): object {
    if (!node) { return { kind: "null" }; }

    const hide = shouldHide(node);

    const sanitized: Record<string, unknown> = {
        kind: node.kind,
    };

    if (node.kind === "literal") {
        sanitized.value = hide ? REDACTED : node.value;
        sanitized.originalInput = hide ? REDACTED : node.originalInput;
    } else if (node.kind === "group") {
        sanitized.child = sanitizeAST(node.child);
    } else if (node.kind === "operation") {
        sanitized.type = node.type;
        sanitized.operands = node.operands.map(sanitizeAST);
    }

    if (node.metadata) {
        if (hide) {
            sanitized.metadata = REDACTED;
        } else {
            sanitized.metadata = node.metadata;
        }
    }

    if (node.label) {
        sanitized.label = hide ? REDACTED : node.label;
    }

    return sanitized;
}

/**
 * Sanitiza um objeto genérico (como o ErrorContext), removendo valores que
 * possam conter PII se a política global estiver restritiva.
 *
 * @param obj Objeto ou valor a ser sanitizado.
 * @returns Valor sanitizado.
 */
export function sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) { return obj; }

    // Se a política global NÃO for sensível (false), libera tudo
    if (!loggingPolicy.sensitive) { return obj; }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            // Se for um nó da AST (identificado pelo campo 'kind')
            if (value && typeof value === "object" && "kind" in value) {
                result[key] = sanitizeAST(value as CalculationNode);
                continue;
            }

            // Campos conhecidos por conter dados sensíveis
            if (["n", "d", "rawInput", "metadata", "label", "value", "originalInput"].includes(key)) {
                result[key] = REDACTED;
            } else {
                result[key] = sanitizeObject(value);
            }
        }
        return result;
    }

    // Se for um valor primitivo que parece ser numérico ou sensível
    if (typeof obj === "number" || typeof obj === "bigint" || typeof obj === "string") {
        // Se for string, verifica se parece ser um número ou se é muito longa
        if (typeof obj === "string" && obj.length > 50) { return REDACTED; }
        if (!isNaN(Number(obj))) { return REDACTED; }
    }

    return obj;
}
