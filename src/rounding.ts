/**
 * CalcAUY - Rounding Strategies Implementation
 * @module
 *
 * Este módulo implementa algoritmos de arredondamento determinísticos utilizando
 * aritmética de frações racionais (n/d) com BigInt, eliminando erros de ponto flutuante.
 */

import { RationalNumber } from "./rational.ts";
import { RoundingStrategy } from "./constants.ts";

/**
 * Handlers para diferentes estratégias de arredondamento.
 * Cada handler recebe um RationalNumber e a precisão desejada, retornando um novo RationalNumber.
 */
export const RoundingHandlers: Record<
    RoundingStrategy,
    (val: RationalNumber, precision: number) => RationalNumber
> = {
    /**
     * Arredondamento "Truncate" (Corte Seco).
     * Simplesmente descarta todos os dígitos além da precisão desejada.
     */
    TRUNCATE: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const scaledNumerator = (val.n * pScale) / val.d;
        return RationalNumber.from(scaledNumerator, pScale);
    },

    /**
     * Arredondamento "Ceil" (Teto).
     * Sempre arredonda em direção ao infinito positivo se houver qualquer resíduo.
     */
    CEIL: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const scaledN = val.n * pScale;
        const integralPart = scaledN / val.d;
        const remainder = scaledN % val.d;

        if (remainder > 0n) {
            return RationalNumber.from(integralPart + 1n, pScale);
        }
        return RationalNumber.from(integralPart, pScale);
    },

    /**
     * Arredondamento "Half-Up" (Comercial).
     * Se a parte fracionária for >= 0.5, arredonda para longe do zero.
     */
    HALF_UP: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const scaledN = val.n * pScale;
        const integralPart = scaledN / val.d;
        const remainder = scaledN % val.d;
        const absRemainder = remainder < 0n ? -remainder : remainder;

        // Se o resto é maior ou igual à metade do denominador, arredondamos
        if (absRemainder * 2n >= val.d) {
            const adjustment = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(`${integralPart + adjustment}/${pScale}`);
        }
        return RationalNumber.from(`${integralPart}/${pScale}`);
    },

    /**
     * Arredondamento "Half-Even" (Bancário).
     * Se a parte fracionária for exatamente 0.5, arredonda para o número par mais próximo.
     */
    HALF_EVEN: (val, p) => {
        const pScale = 10n ** BigInt(p);
        const scaledN = val.n * pScale;
        const integralPart = scaledN / val.d;
        const remainder = scaledN % val.d;
        const absRemainder = remainder < 0n ? -remainder : remainder;

        // Caso 1: Resto menor que a metade (arredonda para baixo/mantém)
        if (absRemainder * 2n < val.d) {
            return RationalNumber.from(`${integralPart}/${pScale}`);
        }
        // Caso 2: Resto maior que a metade (arredonda para cima/longe do zero)
        if (absRemainder * 2n > val.d) {
            const adjustment = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(`${integralPart + adjustment}/${pScale}`);
        }

        // Caso 3: Resto exatamente igual à metade (0.5 exato)
        // Aplicamos o critério de desempate ao par
        const lastDigit = integralPart < 0n ? -(integralPart % 10n) : (integralPart % 10n);
        const isEven = lastDigit % 2n === 0n;

        if (isEven) {
            return RationalNumber.from(`${integralPart}/${pScale}`);
        } else {
            const adjustment = val.n >= 0n ? 1n : -1n;
            return RationalNumber.from(`${integralPart + adjustment}/${pScale}`);
        }
    },

    /**
     * Implementação rigorosa da norma ABNT NBR 5891:1977.
     *
     * Regras de acordo com a norma brasileira:
     * 1. Se o algarismo a ser conservado for seguido de algarismo inferior a 5, permanece inalterado.
     * 2. Se for seguido de algarismo superior a 5, ou de 5 seguido de qualquer algarismo diferente de zero, soma-se 1.
     * 3. Se for seguido de 5 seguido de zeros, há duas situações:
     *    a) Se o algarismo a ser conservado for PAR, permanece inalterado.
     *    b) Se o algarismo a ser conservado for ÍMPAR, soma-se 1.
     *
     * Nota: No domínio dos racionais puros, a NBR 5891 é equivalente ao Banker's Rounding (Half-Even).
     */
    NBR5891: (val, p) => {
        return RoundingHandlers.HALF_EVEN(val, p);
    },
};

/**
 * Aplica uma estratégia de arredondamento a um RationalNumber.
 *
 * @param val O número racional de alta precisão.
 * @param strategy A estratégia a ser aplicada (ex: NBR5891, HALF_UP).
 * @param precision A quantidade de casas decimais desejada.
 * @returns Um novo RationalNumber arredondado na escala solicitada.
 */
export function applyRounding(
    val: RationalNumber,
    strategy: RoundingStrategy,
    precision: number,
): RationalNumber {
    const handler = RoundingHandlers[strategy];
    return handler(val, precision);
}
