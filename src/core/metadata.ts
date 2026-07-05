/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { CalcAUYError } from "./errors.ts";
import { MAX_METADATA_BYTES } from "./constants.ts";

/**
 * Realiza a validação profunda de metadados para garantir que sejam estritamente
 * serializáveis e livres de lógica ou referências circulares.
 *
 * Proibe tipos não-determinísticos como funções, classes ou BigInts puros.
 * Também garante que o tamanho total dos metadados não exceda os limites de segurança.
 */
export function validateMetadata(value: unknown): number {
    const size = validateMetadataRecursive(value, new Set<unknown>());
    if (size > MAX_METADATA_BYTES) {
        throw new CalcAUYError(
            "metadata-overflow",
            `O tamanho total dos metadados (${size} bytes) excede o limite permitido de ${MAX_METADATA_BYTES} bytes por nó.`,
            { currentSize: size, limit: MAX_METADATA_BYTES },
        );
    }
    return size;
}

function validateMetadataRecursive(value: unknown, seen: Set<unknown>): number {
    if (value === null || value === undefined) {
        throw new CalcAUYError("unsupported-type", "Metadados não podem conter null ou undefined.");
    }

    const type = typeof value;

    if (type === "string") {
        return (value as string).length * 2; // Estimativa simples em bytes (UTF-16)
    }

    if (type === "number") {
        return 8; // Float64
    }

    if (type === "boolean") {
        return 4;
    }

    if (type === "bigint") {
        throw new CalcAUYError(
            "unsupported-type",
            "Metadados não podem conter BigInt puro. Converta para string ou use objetos planos.",
        );
    }

    if (type === "object") {
        // Prevenção de objetos recursivos
        if (seen.has(value)) {
            throw new CalcAUYError("unsupported-type", "Referência circular detectada nos metadados.");
        }
        seen.add(value);

        let totalSize = 0;

        if (Array.isArray(value)) {
            for (const item of value) {
                totalSize += validateMetadataRecursive(item, seen);
            }
        } else {
            // Garantir que é um objeto plano (não uma classe ou instância especial)
            if (Object.getPrototypeOf(value) !== Object.prototype) {
                throw new CalcAUYError(
                    "unsupported-type",
                    "Metadados permitem apenas objetos planos (plain objects). Classes ou instâncias não são permitidas.",
                );
            }

            for (const key in value) {
                if (Object.hasOwn(value as object, key)) {
                    totalSize += key.length * 2; // Chave
                    totalSize += validateMetadataRecursive((value as Record<string, unknown>)[key], seen);
                }
            }
        }

        seen.delete(value);
        return totalSize;
    }

    throw new CalcAUYError(
        "unsupported-type",
        `O tipo '${type}' não é permitido em metadados (apenas primitives, plain objects e arrays).`,
    );
}
