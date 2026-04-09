/**
 * CalcAUY - Rounding Strategies Implementation
 * @module
 */

import { RationalNumber } from "../core/rational.ts";
import type { RoundingStrategy } from "../core/constants.ts";

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
        const pScale: bigint = 10n ** BigInt(p);
        const scaledNumerator: bigint = (val.n * pScale) / val.d;
        return RationalNumber.from(scaledNumerator, pScale);
    },

    /**
     * "Ceil" (Teto): Sempre arredonda para cima se houver qualquer sobra.
     * Comum em cálculos de frete ou cobranças mínimas.
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
     * "Half-Up" (Arredondamento Comercial): Se a sobra for >= 0.5, arredonda para cima.
     * É o padrão mais comum em transações de consumo no varejo.
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
     * "Half-Even" (Banker's Rounding): Arredonda para o número par mais próximo.
     * **Engenharia:** Reduz o viés estatístico em grandes somatórios, sendo
     * exigido em diversos sistemas financeiros internacionais.
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
     * ABNT NBR 5891:1977.
     * Norma brasileira que rege o arredondamento de números decimais.
     * Mapeia tecnicamente para o comportamento do Half-Even.
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
