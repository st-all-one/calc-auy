/**
 * CalcAUY - Error Handling System (RFC 7807)
 * @module
 */

export type ErrorCategory =
    | "invalid-syntax"
    | "unsupported-type"
    | "division-by-zero"
    | "complex-result"
    | "invalid-precision"
    | "corrupted-node";

export interface ErrorContext {
    operation?: string;
    rawInput?: unknown;
    partialAST?: unknown;
    [key: string]: unknown;
}

/**
 * Custom Error for CalcAUY following Problem Details for HTTP APIs (RFC 7807).
 */
export class CalcAUYError extends Error {
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly detail: string;
    readonly instance: string;
    readonly context: ErrorContext;

    constructor(
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
        };

        const titleMap: Record<ErrorCategory, string> = {
            "invalid-syntax": "Erro de Sintaxe Matemática",
            "unsupported-type": "Tipo de Entrada Não Suportado",
            "division-by-zero": "Divisão por Zero Detectada",
            "complex-result": "Resultado Matemático Não Suportado",
            "invalid-precision": "Precisão Inválida",
            "corrupted-node": "Estrutura AST Corrompida",
        };

        this.status = statusMap[category];
        this.title = titleMap[category];
        this.name = "CalcAUYError";
    }

    toJSON() {
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
