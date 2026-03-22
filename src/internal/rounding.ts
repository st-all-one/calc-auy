/**
 * Implementação rigorosa do arredondamento decimal conforme a norma ABNT NBR 5891:1977.
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
    // Se a precisão desejada for maior ou igual à atual, apenas escala para cima.
    if (currentPrecision <= targetPrecision) {
        const scaleFactor = 10n ** BigInt(targetPrecision - currentPrecision);
        return value * scaleFactor;
    }

    const precisionDifference = currentPrecision - targetPrecision;
    const divisor = 10n ** BigInt(precisionDifference);
    const midPointThreshold = divisor / 2n;

    const integralPart = value / divisor;
    const fractionalRemainder = value % divisor;
    const absoluteRemainder = fractionalRemainder < 0n ? -fractionalRemainder : fractionalRemainder;

    // Regra 1 e 2: Menor que 5 mantém, Maior que 5 aumenta.
    if (absoluteRemainder < midPointThreshold) {
        return integralPart;
    } else if (absoluteRemainder > midPointThreshold) {
        const adjustment = value >= 0n ? 1n : -1n;
        return integralPart + adjustment;
    } else {
        /**
         * Regra 3: Exatamente 5 seguido de zeros.
         * Critério de desempate: Arredonda para o algarismo par mais próximo.
         */
        const lastDigitOfIntegral = integralPart < 0n ? -(integralPart % 10n) : (integralPart % 10n);
        const isLastDigitEven = lastDigitOfIntegral % 2n === 0n;

        if (isLastDigitEven) {
            // Se for par, permanece invariável.
            return integralPart;
        } else {
            // Se for ímpar, aumenta em uma unidade (em magnitude).
            const adjustment = value >= 0n ? 1n : -1n;
            return integralPart + adjustment;
        }
    }
}
