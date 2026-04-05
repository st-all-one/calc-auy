import { RationalNumber } from "./rational.ts";
import { RoundingStrategy } from "./constants.ts";

/**
 * Handlers for different rounding strategies using BigInt.
 */
export const RoundingHandlers: Record<
    RoundingStrategy,
    (val: RationalNumber, precision: number) => RationalNumber
> = {
    TRUNCATE: (val, p) => {
        const s = val.toDecimalString(p);
        return RationalNumber.from(s);
    },

    CEIL: (val, p) => {
        const truncated = RoundingHandlers.TRUNCATE(val, p);
        if (val.compare(truncated) > 0) {
            // Real implementation needs scaling
            const pScale = 10n ** BigInt(p);
            return RationalNumber.from(`${truncated.n * pScale + 1n}/${pScale}`);
        }
        return truncated;
    },

    HALF_UP: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const nextScale = pScale * 10n;
        const scaled = (val.n * nextScale) / val.d;
        const lastDigit = scaled % 10n;
        const absLast = lastDigit < 0n ? -lastDigit : lastDigit;

        const base = scaled / 10n;
        if (absLast >= 5n) {
            const sign = scaled < 0n ? -1n : 1n;
            return RationalNumber.from(`${base + sign}/${pScale}`);
        }
        return RationalNumber.from(`${base}/${pScale}`);
    },

    HALF_EVEN: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const nextScale = pScale * 10n;
        const scaled = (val.n * nextScale) / val.d;
        const lastDigit = scaled % 10n;
        const absLast = lastDigit < 0n ? -lastDigit : lastDigit;

        const base = scaled / 10n;
        if (absLast > 5n) {
            const sign = scaled < 0n ? -1n : 1n;
            return RationalNumber.from(`${base + sign}/${pScale}`);
        } else if (absLast === 5n) {
            // Round to nearest even
            if (base % 2n !== 0n) {
                const sign = scaled < 0n ? -1n : 1n;
                return RationalNumber.from(`${base + sign}/${pScale}`);
            }
        }
        return RationalNumber.from(`${base}/${pScale}`);
    },

    NBR5891: (val, p) => {
        // NBR 5891 is essentially Half-Even for the 0.5 case
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
    const handler = RoundingHandlers[strategy];
    return handler(val, precision);
}
