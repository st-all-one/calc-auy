import { Logger } from "./logger.ts";

/**
 * Custom Error following RFC 7807 (Problem Details for HTTP APIs).
 * Used for tracking and auditing mathematical and operational failures in the library.
 */
export class CurrencyNBRError extends Error {
    public readonly type: string; // URI identifying the problem type
    public readonly title: string; // Short, human-readable summary
    public readonly status: number; // HTTP status code suggestion
    public readonly detail: string; // Specific explanation of this occurrence
    public readonly instance: string; // Unique URI for this specific occurrence (Audit Log)

    // Math Audit Extensions (RFC 7807 allows custom members)
    public readonly math_audit?: {
        latex?: string | undefined;
        unicode?: string | undefined;
        operation?: string | undefined;
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
        this.name = "CurrencyNBRError";

        // Base RFC 7807 fields
        this.type = `https://github.com/st-all-one/currency-nbr-a11y/tree/main/errors/${params.type}`;
        this.title = params.title;
        this.detail = params.detail;
        this.status = params.status || 400;
        this.instance = `audit:err:${crypto.randomUUID()}`;

        // Custom extensions for traceability
        if (params.latex !== undefined || params.unicode !== undefined || params.operation !== undefined) {
            this.math_audit = {
                latex: params.latex,
                unicode: params.unicode,
                operation: params.operation,
            };
        }

        // Automated logging for recognized errors (ERROR level)
        // Using direct child logger call as requested
        Logger.getChild("errors").error(`${this.title} {*}`, {
            ...this.toJSON(),
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Serializes the error strictly following RFC 7807 structure.
     */
    public toJSON(): {
        math_audit?: {
            latex?: string | undefined;
            unicode?: string | undefined;
            operation?: string | undefined;
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
 * Logs unexpected errors as FATAL.
 */
export function logFatal(error: unknown, context?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Using direct child logger call for fatal errors
    Logger.getChild(["errors", "fatal"]).fatal(`${message} {*}`, {
        ...context,
        error,
        stack,
        timestamp: new Date().toISOString(),
    });
}
