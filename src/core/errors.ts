/**
 * Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { v7 as uuidV7 } from "@std/uuid";
import { getSubLogger } from "../utils/logger.ts";
import { sanitizeObject } from "../utils/sanitizer.ts";

const logger = getSubLogger("error");

/** Categorias de erro suportadas pela engine. */
export type ErrorCategory =
    | "invalid-syntax"
    | "unsupported-type"
    | "division-by-zero"
    | "complex-result"
    | "invalid-precision"
    | "corrupted-node"
    | "integrity-critical-violation"
    | "math-overflow";

/** Contexto técnico da falha para auditoria. */
export interface ErrorContext {
    operation?: string;
    rawInput?: unknown;
    partialAST?: unknown;
    [key: string]: unknown;
}

/**
 * Erro customizado da CalcAUY seguindo o padrão RFC 7807.
 *
 * @class
 */
export class CalcAUYError extends Error {
    /** URI que identifica o tipo do erro. */
    public readonly type: string;
    /** Resumo curto e legível por humanos. */
    public readonly title: string;
    /** Código de status HTTP sugerido. */
    public readonly status: number;
    /** Explicação detalhada da ocorrência. */
    public readonly detail: string;
    /** UUID único da ocorrência para correlação em logs. */
    public readonly instance: string;
    /** Dados técnicos contextuais (AST, operação, input). */
    public readonly context: ErrorContext;

    public constructor(
        category: ErrorCategory,
        detail: string,
        // deno-lint-ignore default-param-last
        context: ErrorContext = {},
        options?: ErrorOptions,
    ) {
        super(detail, options);

        this.type = `https://github.com/st-all-one/calc-auy/blob/main/wiki/errors/${category}.md`;
        this.title = category;
        this.detail = detail;
        this.context = context;
        this.instance = `urn:uuid:${uuidV7.generate()}`;

        const statusMap: Record<ErrorCategory, number> = {
            "invalid-syntax": 400,
            "unsupported-type": 400,
            "division-by-zero": 422,
            "complex-result": 422,
            "invalid-precision": 400,
            "corrupted-node": 500,
            "integrity-critical-violation": 500,
            "math-overflow": 422,
        };

        this.status = statusMap[category];
        this.name = "CalcAUYError";

        // Telemetria Sanitizada
        if (logger.isEnabledFor("error")) {
            logger.error("CalcAUY Exception Triggered", {
                error_type: this.type,
                instance: this.instance,
                status: this.status,
                detail: this.detail,
                cause: options?.cause,
                context: sanitizeObject(this.context),
            });
        }
    }

    /**
     * Converte o erro para um objeto plano pronto para serialização JSON.
     *
     * @example Exemplo Simples: Captura de Erro
     * ```ts
     * try {
     *   CalcAUY.from(10).div(0).commit();
     * } catch (err) {
     *   if (err instanceof CalcAUYError) {
     *     console.error(err.title); // "Divisão por Zero Detectada"
     *   }
     * }
     * ```
     *
     * @example Resposta de API com Detalhes
     * ```ts
     * app.onError((err) => {
     *   if (err instanceof CalcAUYError) {
     *     return Response.json(err.toJSON(), { status: err.status });
     *   }
     * });
     * ```
     */
    public toJSON(): Record<string, unknown> {
        return {
            type: this.type,
            title: this.title,
            status: this.status,
            detail: this.detail,
            instance: this.instance,
            context: this.context,
        };
    }
}
