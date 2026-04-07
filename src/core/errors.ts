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
    | "corrupted-node"
    | "math-overflow";

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
    public readonly type: string;
    public readonly title: string;
    public readonly status: number;
    public readonly detail: string;
    public readonly instance: string;
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
    }

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
