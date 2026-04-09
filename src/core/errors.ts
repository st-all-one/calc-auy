/**
 * CalcAUY - Sistema de Erros e Diagnósticos (RFC 7807)
 * @module
 */

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
    | "math-overflow";

/** Contexto técnico da falha para auditoria. */
export interface ErrorContext {
    operation?: string;
    rawInput?: unknown;
    partialAST?: unknown;
    [key: string]: unknown;
}

/**
 * Erro customizado da CalcAUY seguindo o padrão RFC 7807 (Problem Details).
 *
 * **Engenharia:** Diferente de um erro genérico, o CalcAUYError é serializável e
 * projetado para transporte via APIs HTTP. Ele inclui um contexto técnico detalhado
 * que pode conter a AST parcial ou o input que causou a falha, facilitando a
 * depuração forense.
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
        context: ErrorContext = {},
    ) {
        super(detail);
        this.type = `calc-auy/${category}`;
        this.detail = detail;
        this.context = context;
        this.instance = `urn:uuid:${crypto.randomUUID()}`;

        const statusMap: Record<ErrorCategory, number> = {
            "invalid-syntax": 400,
            "unsupported-type": 400,
            "division-by-zero": 422,
            "complex-result": 422,
            "invalid-precision": 400,
            "corrupted-node": 500,
            "math-overflow": 422,
        };

        const titleMap: Record<ErrorCategory, string> = {
            "invalid-syntax": "Erro de Sintaxe Matemática",
            "unsupported-type": "Tipo de Entrada Não Suportado",
            "division-by-zero": "Divisão por Zero Detectada",
            "complex-result": "Resultado Matemático Não Suportado",
            "invalid-precision": "Precisão Inválida",
            "corrupted-node": "Estrutura AST Corrompida",
            "math-overflow": "Transbordo de Capacidade Matemática",
        };

        this.status = statusMap[category];
        this.title = titleMap[category];
        this.name = "CalcAUYError";

        // Telemetria Automática Sanitizada (Rigor specs/11 e specs/12)
        if (logger.isEnabledFor("error")) {
            logger.error("CalcAUY Exception Triggered", {
                error_type: this.type,
                instance: this.instance,
                status: this.status,
                detail: this.detail,
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
     *
     * @example Cenário Real: Validação de Input de Usuário
     * ```ts
     * // Erro ao tentar processar string malformada como "10..5"
     * try {
     *   CalcAUY.parseExpression(userInput);
     * } catch (err) {
     *   showUIFeedback(err.detail);
     * }
     * ```
     *
     * @example Cenário Real Complexo: Debug em Produção via Sentry
     * ```ts
     * Sentry.captureException(err, {
     *   extra: err.context, // Inclui a AST que causou o problema
     *   tags: { error_type: err.type }
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
