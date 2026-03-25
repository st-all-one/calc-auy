// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Logger } from "./logger.ts";

/**
 * Erro customizado seguindo a RFC 7807 (Problem Details for HTTP APIs).
 *
 * Esta classe é utilizada para rastreamento e auditoria de falhas matemáticas
 * e operacionais dentro da biblioteca CalcAUD, garantindo que cada erro possua
 * um contexto rico para depuração e conformidade fiscal.
 *
 * @example
 * ```ts
 * throw new CalcAUDError({
 *   type: "division-by-zero",
 *   title: "Operação Matemática Inválida",
 *   detail: "Não é possível dividir um montante por zero.",
 *   operation: "division"
 * });
 * ```
 */
export class CalcAUDError extends Error {
    /** URI que identifica o tipo do problema. */
    public readonly type: string;
    /** Resumo curto e legível do erro. */
    public readonly title: string;
    /** Sugestão de código de status HTTP (padrão 400). */
    public readonly status: number;
    /** Explicação detalhada sobre esta ocorrência específica. */
    public readonly detail: string;
    /** Identificador único da ocorrência (Audit Log ID). */
    public readonly instance: string;

    /** Extensões de Auditoria Matemática (RFC 7807 permite membros customizados). */
    public readonly math_audit?: {
        latex?: string;
        unicode?: string;
        operation?: string;
    };

    constructor(params: {
        type: string;
        title: string;
        detail: string;
        status?: number;
        latex?: string;
        unicode?: string;
        operation?: string;
    }) {
        super(params.detail);
        this.name = "CalcAUDError";

        // Seguimos a especificação RFC 7807 para que erros sejam serializáveis
        // e compreensíveis tanto por humanos quanto por sistemas automatizados.
        this.type = `https://github.com/st-all-one/calcaud-nbr-a11y/tree/main/errors/${params.type}`;
        this.title = params.title;
        this.detail = params.detail;
        this.status = params.status || 400;
        this.instance = `audit:err:${crypto.randomUUID()}`;

        if (params.latex !== undefined || params.unicode !== undefined || params.operation !== undefined) {
            this.math_audit = {
                latex: params.latex ?? "",
                unicode: params.unicode ?? "",
                operation: params.operation ?? "",
            };
        }

        // Telemetria estruturada utilizando logtape.
        // O uso de 'getChild' permite filtrar erros por categoria no ambiente de produção.
        Logger.getChild(["errors", params.type]).error(`${this.title} {*}`, {
            ...this.toJSON(),
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Serializa o erro seguindo estritamente a estrutura da RFC 7807.
     * @returns Objeto JSON formatado.
     */
    public toJSON(): {
        math_audit?: {
            latex?: string;
            unicode?: string;
            operation?: string;
        };
        type: string;
        title: string;
        status: number;
        detail: string;
        instance: string;
    } {
        return {
            type: this.type,
            title: this.title,
            status: this.status,
            detail: this.detail,
            instance: this.instance,
            ...(this.math_audit ? { math_audit: this.math_audit } : {}),
        };
    }
}

/**
 * Registra erros inesperados como nível FATAL.
 *
 * @param error O objeto de erro capturado.
 * @param context Contexto adicional para ajudar na depuração.
 *
 * @example
 * ```ts
 * try {
 *   // algo perigoso
 * } catch (e) {
 *   logFatal(e, { user_id: 123 });
 * }
 * ```
 */
export function logFatal(error: unknown, context?: Record<string, unknown>): void {
    // Agora garantimos que message será sempre uma string válida
    let message;

    if (error instanceof Error) {
        message = error.message;
    } else {
        message = typeof error === "string" ? error : JSON.stringify(error);
    }

    const stack = error instanceof Error ? error.stack : undefined;

    // Erros fatais são registrados em um namespace específico para alertas imediatos.
    Logger.getChild(["errors", "fatal"]).fatal(`${message} {*}`, {
        ...context,
        error,
        stack,
        timestamp: new Date().toISOString(),
    });
}
