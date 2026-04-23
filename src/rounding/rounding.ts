/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { RationalNumber } from "../core/rational.ts";
import type { RoundingStrategy } from "../core/constants.ts";

/**
 * Cache O(1) para Divisores e Pontos Médios.
 * Suporta até 128 casas decimais, cobrindo com folga o requisito de 50 casas do projeto.
 * Utilizamos bigint[] em vez de BigInt64Array para evitar overflow acima de 18 casas.
 */
const POWERS_CACHE: bigint[] = new Array(128);
const HALVES_CACHE: bigint[] = new Array(128);

POWERS_CACHE[0] = 1n;
HALVES_CACHE[0] = 0n;
for (let i = 1; i < 128; i++) {
    const p = POWERS_CACHE[i - 1] * 10n;
    POWERS_CACHE[i] = p;
    HALVES_CACHE[i] = p / 2n;
}

function getPowerOf10(p: number): bigint {
    if (p >= 0 && p < 128) { return POWERS_CACHE[p]; }
    return 10n ** BigInt(p);
}

/**
 * Handlers para diferentes estratégias de arredondamento.
 *
 * Cada estratégia possui um impacto diferente em cálculos de grande volume
 * (ex: folha de pagamento ou rateio de impostos).
 */
export const RoundingHandlers: Record<
    RoundingStrategy,
    (val: RationalNumber, precision: number) => RationalNumber
> = {
    /**
     * "Truncate" (Corte Seco): Remove as casas decimais excedentes sem ajuste.
     * Útil em cenários onde não se pode "ganhar" centavos por arredondamento.
     */
    TRUNCATE: (val: RationalNumber, p: number): RationalNumber => {
        const pScale = getPowerOf10(p);
        const scaledNumerator: bigint = (val.n * pScale) / val.d;
        return RationalNumber.from(scaledNumerator, pScale);
    },

    /**
     * "Ceil" (Teto): Sempre arredonda para cima se houver qualquer sobra.
     * Comum em cálculos de frete ou cobranças mínimas.
     */
    CEIL: (val: RationalNumber, p: number): RationalNumber => {
        const pScale = getPowerOf10(p);
        const scaledN: bigint = val.n * pScale;
        const integralPart: bigint = scaledN / val.d;
        const remainder: bigint = scaledN % val.d;

        if (remainder > 0n) {
            return RationalNumber.from(integralPart + 1n, pScale);
        }
        return RationalNumber.from(integralPart, pScale);
    },

    /**
     * "Half-Up" (Arredondamento Comercial): Se a sobra for >= 0.5, arredonda para cima.
     * É o padrão mais comum em transações de consumo no varejo.
     */
    HALF_UP: (val: RationalNumber, p: number): RationalNumber => {
        const pScale = getPowerOf10(p);
        const scaledN: bigint = val.n * pScale;
        const integralPart: bigint = scaledN / val.d;
        const remainder: bigint = scaledN % val.d;
        const absRemainder: bigint = remainder < 0n ? -remainder : remainder;

        if (absRemainder * 2n >= val.d) {
            const adjustment: bigint = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(integralPart + adjustment, pScale);
        }
        return RationalNumber.from(integralPart, pScale);
    },

    /**
     * "Half-Even" (Banker's Rounding): Arredonda para o número par mais próximo.
     * **Engenharia:** Reduz o viés estatístico em grandes somatórios, sendo
     * exigido em diversos sistemas financeiros internacionais.
     */
    HALF_EVEN: (val: RationalNumber, p: number): RationalNumber => {
        const pScale = getPowerOf10(p);
        const scaledN: bigint = val.n * pScale;
        const integralPart: bigint = scaledN / val.d;
        const remainder: bigint = scaledN % val.d;
        const absRemainder: bigint = remainder < 0n ? -remainder : remainder;

        if (absRemainder * 2n < val.d) {
            return RationalNumber.from(integralPart, pScale);
        }
        if (absRemainder * 2n > val.d) {
            const adjustment: bigint = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(integralPart + adjustment, pScale);
        }

        const lastDigit: bigint = integralPart < 0n ? -(integralPart % 10n) : (integralPart % 10n);
        const isEven: boolean = lastDigit % 2n === 0n;

        if (isEven) {
            return RationalNumber.from(integralPart, pScale);
        } else {
            const adjustment: bigint = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(integralPart + adjustment, pScale);
        }
    },

    /**
     * ABNT NBR 5891:1977.
     * Norma brasileira que rege o arredondamento de números decimais.
     * Implementação rigorosa e didática seguindo as 3 regras fundamentais.
     */
    NBR5891: (val: RationalNumber, p: number): RationalNumber => {
        const pScale = getPowerOf10(p);
        // Multiplicamos o numerador pela escala desejada (ex: 10^2 para 2 casas)
        const scaledN: bigint = val.n * pScale;

        // Parte inteira e o resto da divisão pelo denominador
        const integralPart: bigint = scaledN / val.d;
        const remainder: bigint = scaledN % val.d;
        const absRemainder: bigint = remainder < 0n ? -remainder : remainder;

        // O "ponto médio" (0.5) é representado por val.d / 2
        // absRemainder * 2 nos permite comparar sem divisões de ponto flutuante
        const comparison = absRemainder * 2n;

        // Regra 1: Algarismo seguinte de 0 a 4 (resto < 0.5)
        // O último dígito a ser mantido permanece inalterado.
        if (comparison < val.d) {
            return RationalNumber.from(integralPart, pScale);
        }

        // Regra 2: Algarismo seguinte de 6 a 9 (resto > 0.5)
        // Regra 3a: Algarismo seguinte é 5 seguido de qualquer dígito diferente de zero (resto > 0.5)
        // O último dígito a ser mantido é aumentado em uma unidade.
        if (comparison > val.d) {
            const adjustment: bigint = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(integralPart + adjustment, pScale);
        }

        // Regra 3b: Algarismo seguinte é exatamente 5 (resto == 0.5)
        // Aplica-se a "regra do par" para evitar viés estatístico.
        const lastDigit: bigint = integralPart < 0n ? -(integralPart % 10n) : (integralPart % 10n);
        const isEven: boolean = lastDigit % 2n === 0n;

        if (isEven) {
            // Se já for par, permanece.
            return RationalNumber.from(integralPart, pScale);
        } else {
            // Se for ímpar, aumenta-se 1 para se tornar par.
            const adjustment: bigint = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(integralPart + adjustment, pScale);
        }
    },

    /**
     * "None": Não aplica nenhum arredondamento.
     * Mantém a precisão racional exata (frações n/d).
     */
    NONE: (val: RationalNumber, _p: number): RationalNumber => {
        return val;
    },
};

/**
 * Applies a rounding roundStrategy to a RationalNumber.
 */
export function applyRounding(
    val: RationalNumber,
    roundStrategy: RoundingStrategy,
    precision: number,
): RationalNumber {
    const handler: (val: RationalNumber, p: number) => RationalNumber = RoundingHandlers[roundStrategy];
    return handler(val, precision);
}

/**
 * Implementação: ABNT NBR 5891:1977
 * Otimizada para performance (V8) e precisão arbitrária.
 *
 * @param value O valor bruto em BigInt a ser arredondado.
 * @param currentPrecision A precisão decimal atual do valor (ex: 12).
 * @param targetPrecision A precisão decimal desejada (ex: 2).
 * @returns O valor arredondado em BigInt na escala desejada.
 */
export function roundToPrecisionNBR5891(
    value: bigint,
    currentPrecision: number,
    targetPrecision: number,
): bigint {
    const diff = currentPrecision - targetPrecision;

    // 1. Fast-Path: Escalonamento para Cima (Padding) ou Mesma Precisão
    if (diff <= 0) {
        if (diff === 0) { return value; }
        return value * getPowerOf10(-diff);
    }

    // 2. Extração Precoce de Sinal e Constantes
    const isNegative = value < 0n;
    const absValue = isNegative ? -value : value;
    const divisor = getPowerOf10(diff);
    const halfDivisor = diff < 128 ? HALVES_CACHE[diff] : divisor / 2n;

    const integralPart = absValue / divisor;
    const remainder = absValue % divisor;

    // 3. Lógica Consolidada (NBR 5891: Regras 1, 2 e 3)
    // - Incrementa se: resto > 0.5 OU (resto == 0.5 E parte inteira for ímpar)
    // O operador bitwise (& 1n) identifica a paridade de forma ultra-rápida.
    let roundedAbs = integralPart;
    if (remainder > halfDivisor || (remainder === halfDivisor && (integralPart & 1n) !== 0n)) {
        roundedAbs++;
    }

    return isNegative ? -roundedAbs : roundedAbs;
}
