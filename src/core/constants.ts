/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const LIB_NAME = "calc-auy";
export const LOG_NAMESPACE = [LIB_NAME] as const;

export const PRECISION_BIGINT = 50n;
export const SCALE_BIGINT = 10n ** PRECISION_BIGINT;

export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const DEFAULT_DECIMAL_PRECISION = 2;

export const ROUNDING_IDS = {
    NBR5891: "NBR-5891",
    HALF_UP: "HALF-UP",
    HALF_EVEN: "HALF-EVEN",
    TRUNCATE: "TRUNCATE",
    CEIL: "CEIL",
    NONE: "NONE",
} as const;

export type RoundingStrategy = keyof typeof ROUNDING_IDS;

/**
 * Chave privada para injeção de timestamp de nascimento em ambientes de teste.
 * Permite garantir assinaturas determinísticas em suítes de teste.
 * @internal
 */
export const BIRTH_TICKET_MOCK: unique symbol = Symbol("BIRTH_TICKET_MOCK");

// === Rational Number Constants ===
//Limites internos para prevenção de vazamento de memória/stack exhaustion.
export const MAX_BI_BITS = 1_000_000n;
export const MAX_BI_LIMIT = 1n << MAX_BI_BITS;
export const HOT_CACHE_LIMIT = 512;

// === Rounding Constants ===
export const CACHE_ARRAY_SIZE = 128;

// === AST Constants ===
// Limite de profundidade da árvore para evitar estouro da pilha de chamadas (Stack Overflow).
export const MAX_RECURSION_DEPTH = 500;

//Limites de segurança para a estrutura da AST durante a hidratação e construção.
export const MAX_HYDRATE_DEPTH = 500;
export const MAX_HYDRATE_NODES = 1000;
export const MAX_METADATA_BYTES = 16384; // 16KB per node limit

/**
 * Largura máxima de um nó de operação antes de criar uma nova camada (Hierarchical Flattening).
 * Mantém a construção em O(N) e a profundidade em O(log N), evitando o custo O(N²) de cópia
 * de arrays em acúmulos massivos.
 */
export const MAX_OPERANDS = 100;
