/**
 * CalcAUY - Rounding Strategies Implementation
 * @module
 */

import { RationalNumber } from "../core/rational.ts";
import type { RoundingStrategy } from "../core/constants.ts";

/**
 * Handlers for different rounding strategies.
 */
export const RoundingHandlers: Record<
    RoundingStrategy,
    (val: RationalNumber, precision: number) => RationalNumber
> = {
    /**
     * "Truncate" rounding (Corte Seco).
     */
    TRUNCATE: (val: RationalNumber, p: number): RationalNumber => {
        const pScale: bigint = 10n ** BigInt(p);
        const scaledNumerator: bigint = (val.n * pScale) / val.d;
        return RationalNumber.from(scaledNumerator, pScale);
    },

    /**
     * "Ceil" rounding (Teto).
     */
    CEIL: (val: RationalNumber, p: number): RationalNumber => {
        const pScale: bigint = 10n ** BigInt(p);
        const scaledN: bigint = val.n * pScale;
        const integralPart: bigint = scaledN / val.d;
        const remainder: bigint = scaledN % val.d;

        if (remainder > 0n) {
            return RationalNumber.from(integralPart + 1n, pScale);
        }
        return RationalNumber.from(integralPart, pScale);
    },

    /**
     * "Half-Up" rounding (Commercial).
     */
    HALF_UP: (val: RationalNumber, p: number): RationalNumber => {
        const pScale: bigint = 10n ** BigInt(p);
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
     * "Half-Even" rounding (Banker's).
     */
    HALF_EVEN: (val: RationalNumber, p: number): RationalNumber => {
        const pScale: bigint = 10n ** BigInt(p);
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
     * ABNT NBR 5891:1977 Implementation.
     */
    NBR5891: (val: RationalNumber, p: number): RationalNumber => {
        return RoundingHandlers.HALF_EVEN(val, p);
    },
};

/**
 * Applies a rounding strategy to a RationalNumber.
 */
export function applyRounding(
    val: RationalNumber,
    strategy: RoundingStrategy,
    precision: number,
): RationalNumber {
    const handler: (val: RationalNumber, p: number) => RationalNumber = RoundingHandlers[strategy];
    return handler(val, precision);
}
