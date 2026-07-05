/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { CalcAUYLogic } from "./builder.ts";
import type { CalculationNode } from "./ast/types.ts";
import { DEFAULT_INSTANCE_CONFIG, type SignatureEncoder } from "./utils/sanitizer.ts";
import { generateSignature } from "./utils/security.ts";
import { CalcAUYError } from "./core/errors.ts";
import type { InstanceConfig } from "./core/types.ts";

/**
 * CalcAUY - Primary factory for creating isolated calculation instances.
 *
 * This class provides the entry point for initializing calculation contexts
 * with specific security and rounding policies, ensuring deterministic results
 * and auditability across different domains.
 */
export class CalcAUY {
    /**
     * Creates a new calculation instance with isolated config.
     *
     * @param config - `contextLabel` (required), `salt?`, `roundStrategy?`, `encoder?`.
     * @returns A CalcAUYLogic builder.
     *
     * @example
     * ```ts
     * const Finance = CalcAUY.create({
     *     contextLabel: "investment-portfolio",
     *     salt: "vault-secret",
     *     roundStrategy: "HALF_UP",
     * });
     * const result = await Finance.from(10000).mult(Finance.from(1).add("5.25%").group().pow(5)).commit();
     * console.log(result.toMonetary()); // R$ 12.915,48
     * ```
     */
    public static create<const T extends InstanceConfig & { contextLabel: string }>(
        config: T,
    ): CalcAUYLogic<T["contextLabel"], T> {
        if (!config || typeof config.contextLabel !== "string" || config.contextLabel.trim() === "") {
            throw new CalcAUYError(
                "invalid-syntax",
                "The 'contextLabel' parameter is required and must be a non-empty string to create an instance.",
            );
        }

        const fullConfig: Required<InstanceConfig> = {
            ...DEFAULT_INSTANCE_CONFIG,
            ...config,
        };

        const instanceId = Symbol(fullConfig.contextLabel);

        return new CalcAUYLogic<T["contextLabel"], T>(null, instanceId, fullConfig, null);
    }

    /**
     * Verifies BLAKE3 signature of a signed audit trace. Throws on mismatch.
     *
     * @param ast - Signed trace (JSON string or object).
     * @param config - `salt` and optional `encoder`.
     * @returns true if valid.
     * @throws {CalcAUYError} on integrity violation.
     *
     * @example
     * ```ts
     * await CalcAUY.checkIntegrity(auditTrace, { salt: "my-salt" });
     * ```
     */
    public static async checkIntegrity(
        ast: CalculationNode | string | object,
        config: { salt: string; encoder?: SignatureEncoder },
    ): Promise<true | CalcAUYError> {
        let payload: Record<string, unknown>;

        if (typeof ast === "string") {
            try {
                payload = JSON.parse(ast);
            } catch {
                throw new CalcAUYError("invalid-syntax", "Failed to process JSON for signature verification.");
            }
        } else {
            payload = ast as Record<string, unknown>;
        }

        if (!payload || typeof payload !== "object" || !payload.signature) {
            throw new CalcAUYError(
                "integrity-critical-violation",
                "Integrity signature missing from audit trace.",
            );
        }

        const dataToVerify = payload.data || {
            ast: payload.ast,
            finalResult: payload.finalResult,
            roundStrategy: payload.roundStrategy,
        };

        const encoder = config.encoder || DEFAULT_INSTANCE_CONFIG.encoder;
        const expectedHash = await generateSignature(
            dataToVerify,
            config.salt,
            encoder,
        );

        if (payload.signature !== expectedHash) {
            throw new CalcAUYError(
                "integrity-critical-violation",
                "Integrity violation detected: signature does not match content.",
                { expected: expectedHash, received: payload.signature as string },
            );
        }

        return true;
    }
}
