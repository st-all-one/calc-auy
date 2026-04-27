/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalculationNode } from "../ast/types.ts";
import type { InstanceConfig } from "../core/types.ts";
import { BIRTH_TICKET_MOCK } from "../core/constants.ts";

const REDACTED = "[PII]";

/** Chaves de objetos que são conhecidas por conter dados sensíveis (PII). */
const SENSITIVE_KEYS = new Set(["n", "d", "rawInput", "metadata", "value", "originalInput"]);

/** Regex otimizado e seguro para identificar strings que representam números ou percentuais (evita backtracking). */
const NUMERIC_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?%?$/;

/** Tipos de codificação suportados para a assinatura digital. */
export type SignatureEncoder = "HEX" | "BASE64" | "BASE58" | "BASE32";

/** Configuração padrão para sanitização caso nenhuma seja fornecida. */
export const DEFAULT_INSTANCE_CONFIG: Required<InstanceConfig> = {
    sensitive: true,
    salt: "",
    encoder: "HEX",
    contextLabel: "",
    roundStrategy: "NBR5891",
    [BIRTH_TICKET_MOCK]: "",
};

/**
 * Sanitiza a estrutura da AST para logs, removendo valores literais e metadados.
 *
 * @param node Nó da AST a ser sanitizado.
 * @param config Configuração da instância para controle de sensibilidade.
 * @param parentHide Estado de ocultação herdado do pai (opcional).
 * @returns Objeto sanitizado pronto para log.
 */
export function sanitizeAST(
    node: CalculationNode,
    // deno-lint-ignore default-param-last
    config: InstanceConfig = DEFAULT_INSTANCE_CONFIG,
    parentHide?: boolean,
): object {
    if (!node) { return { kind: "null" }; }

    const nodeOverride = node.metadata?.pii;
    let hide: boolean;

    const isSensitive = config.sensitive ?? DEFAULT_INSTANCE_CONFIG.sensitive;

    if (typeof nodeOverride === "boolean") {
        hide = nodeOverride;
    } else if (node.kind === "literal" && parentHide !== undefined) {
        // Literals inherit from parent if no override is present
        hide = parentHide;
    } else {
        // Operations and Groups default to instance policy if no override is present
        hide = isSensitive;
    }

    const sanitized: Record<string, unknown> = {
        kind: node.kind,
    };

    if (node.kind === "literal") {
        sanitized.value = hide ? { n: REDACTED, d: REDACTED } : node.value;
        sanitized.originalInput = hide ? REDACTED : node.originalInput;
    } else if (node.kind === "group") {
        sanitized.child = sanitizeAST(node.child, config, hide);
    } else if (node.kind === "operation") {
        sanitized.type = node.type;
        sanitized.operands = node.operands.map((op) => sanitizeAST(op, config, hide));
    } else if (node.kind === "control") {
        sanitized.type = node.type;
        // Informações técnicas de rastro e segurança NUNCA devem ser redigidas
        sanitized.metadata = {
            timestamp: node.metadata.timestamp,
            previousContextLabel: node.metadata.previousContextLabel,
            previousSignature: node.metadata.previousSignature,
        };
        sanitized.child = sanitizeAST(node.child, config, hide);
    }

    if (node.metadata && node.kind !== "control") {
        sanitized.metadata = hide ? REDACTED : node.metadata;
    }

    return sanitized;
}

/**
 * Sanitiza um objeto genérico (como o ErrorContext), removendo valores que
 * possam conter PII se a política da instância estiver restritiva.
 *
 * @param obj Objeto ou valor a ser sanitizado.
 * @param config Configuração da instância para controle de sensibilidade.
 * @param seen Set para rastrear referências circulares (interno).
 * @returns Valor sanitizado.
 */
export function sanitizeObject(
    obj: unknown,
    config: InstanceConfig = DEFAULT_INSTANCE_CONFIG,
    seen = new WeakSet<object>(),
): unknown {
    if (obj === null || obj === undefined) { return obj; }

    const isSensitive = config.sensitive ?? DEFAULT_INSTANCE_CONFIG.sensitive;

    // Se a política da instância NÃO for sensível (false), libera tudo
    if (!isSensitive) { return obj; }

    if (typeof obj === "object") {
        // Proteção contra referências circulares (evita trava de CPU)
        if (seen.has(obj)) { return "[CIRCULAR]"; }
        seen.add(obj);

        if (Array.isArray(obj)) {
            return obj.map((item) => sanitizeObject(item, config, seen));
        }

        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value && typeof value === "object" && "kind" in value) {
                result[key] = sanitizeAST(value as CalculationNode, config);
                continue;
            }

            if (SENSITIVE_KEYS.has(key)) {
                result[key] = REDACTED;
            } else {
                result[key] = sanitizeObject(value, config, seen);
            }
        }
        return result;
    }

    if (typeof obj === "number" || typeof obj === "bigint" || typeof obj === "string") {
        if (typeof obj === "string") {
            if (obj.length > 50) { return REDACTED; }
            if (obj.length > 0 && NUMERIC_RE.test(obj)) { return REDACTED; }
        } else {
            return REDACTED;
        }
    }

    return obj;
}
