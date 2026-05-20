/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
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

/** Supported error categories by the engine. */
export type ErrorCategory =
    | "invalid-syntax"
    | "unsupported-type"
    | "division-by-zero"
    | "complex-result"
    | "invalid-precision"
    | "corrupted-node"
    | "integrity-critical-violation"
    | "instance-mismatch"
    | "math-overflow"
    | "metadata-overflow"
    | "circular-dependency";

/** Technical context of the failure for auditing purposes. */
export type ErrorContext = {
    operation?: string;
    rawInput?: unknown;
    partialAST?: unknown;
    [key: string]: unknown;
};

/**
 * CalcAUYError - Custom error class following `RFC 7807 (Problem Details)`.
 *
 * Provides a rich context for failures, including unique trace IDs (UUIDs)
 * and technical metadata for auditability and debugging.
 *
 * @class
 */
export class CalcAUYError extends Error {
    /** URI identifying the error type. */
    public readonly type: string;
    /** Short, human-readable summary of the error. */
    public readonly title: string;
    /** Suggested HTTP status code. */
    public readonly status: number;
    /** Detailed explanation of the specific error occurrence. */
    public readonly detail: string;
    /** Unique occurrence UUID for log correlation. */
    public readonly instance: string;
    /** Technical contextual data (AST, operation, input). */
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
            "instance-mismatch": 403,
            "math-overflow": 422,
            "metadata-overflow": 413,
            "circular-dependency": 422,
        };

        this.status = statusMap[category];
        this.name = "CalcAUYError";

        // Sanitized Telemetry
        if (logger.isEnabledFor("error")) {
            logger.error("CalcAUYLogic Exception Triggered", {
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
     * Converts the error into a plain object ready for JSON serialization.
     *
     * @returns A plain object representing the error details.
     *
     * @example Capturing an Invalid Syntax Error in Batch
     * ```ts
     * try {
     *   await calc.parseExpression("10 ++ 5").commit();
     * } catch (err) {
     *   if (err instanceof CalcAUYError) {
     *     sendToAudit(err.toJSON());
     *   }
     * }
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
