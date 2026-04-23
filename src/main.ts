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
 * CalcAUY - Factory principal para criação de instâncias isoladas de cálculo.
 *
 * **Engenharia:** Esta classe substitui o modelo global anterior por um modelo
 * baseado em instâncias (contextos). Cada chamada a `create()` gera um novo
 * universo de cálculo com seu próprio Symbol de identidade e segredos.
 */
export class CalcAUY {
    /**
     * Cria uma nova instância de CalcAUYLogic com configurações isoladas.
     *
     * @param config - Configuração da instância (salt, encoder, sensitive, contextLabel).
     * @returns Instância de builder CalcAUYLogic.
     *
     * @example
     * ```ts
     * const Finance = CalcAUY.create({
     *   contextLabel: "financeiro",
     *   salt: "segredo_banco",
     *   sensitive: true
     * });
     *
     * const calc = Finance.from(100).add(50);
     * ```
     */
    public static create<const T extends InstanceConfig & { contextLabel: string }>(
        config: T,
    ): CalcAUYLogic<T["contextLabel"], T> {
        if (!config || typeof config.contextLabel !== "string" || config.contextLabel.trim() === "") {
            throw new CalcAUYError(
                "invalid-syntax",
                "O parâmetro 'contextLabel' é obrigatório e deve ser uma string não vazia para criar uma instância.",
            );
        }

        const fullConfig: Required<InstanceConfig> = {
            ...DEFAULT_INSTANCE_CONFIG,
            ...config,
        };

        const instanceId = Symbol(fullConfig.contextLabel);

        return new CalcAUYLogic<T["contextLabel"], T>(null, instanceId, fullConfig);
    }

    /**
     * Verifica a validade da assinatura de um cálculo serializado.
     *
     * @param ast - O rastro assinado (string JSON ou objeto).
     * @param config - Configuração de segurança (salt e encoder).
     * @returns true se a assinatura for válida.
     * @throws {CalcAUYError} se a assinatura falhar.
     */
    public static async checkIntegrity(
        ast: CalculationNode | string | object,
        config: { salt: string; encoder?: SignatureEncoder },
    ): Promise<boolean> {
        let payload: Record<string, unknown>;

        if (typeof ast === "string") {
            try {
                payload = JSON.parse(ast);
            } catch {
                throw new CalcAUYError("invalid-syntax", "Falha ao processar JSON para verificação de assinatura.");
            }
        } else {
            payload = ast as Record<string, unknown>;
        }

        if (!payload || typeof payload !== "object" || !payload.signature) {
            throw new CalcAUYError(
                "integrity-critical-violation",
                "Assinatura de integridade ausente no rastro de auditoria.",
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
                "Violação de integridade detectada: a assinatura não confere com o conteúdo.",
                { expected: expectedHash, received: payload.signature as string },
            );
        }

        return true;
    }
}
