import { CurrencyNBRError } from "../errors.ts";

/**
 * Utilitários matemáticos de alta precisão otimizados para o tipo BigInt.
 */

/**
 * Calcula a potência de um BigInt usando o algoritmo de exponenciação binária (Square-and-Multiply).
 *
 * @param base A base do cálculo.
 * @param exponent O expoente (deve ser não-negativo).
 * @returns O resultado da base elevada ao expoente.
 */
export function calculateBigIntPower(base: bigint, exponent: bigint): bigint {
    if (exponent < 0n) {
        throw new CurrencyNBRError({
            type: "negative-exponent",
            title: "Operação de Potência Inválida",
            detail: "Expoentes negativos não são suportados para operações de potência com BigInt nesta biblioteca.",
            operation: "power",
        });
    }
    if (exponent === 0n) { return 1n; }
    if (exponent === 1n) { return base; }

    let result = 1n;
    let currentBase = base;
    let currentExponent = exponent;

    while (currentExponent > 0n) {
        if (currentExponent % 2n === 1n) {
            result *= currentBase;
        }
        currentBase *= currentBase;
        currentExponent /= 2n;
    }
    return result;
}

/**
 * Calcula a raiz n-ésima de um BigInt utilizando o método de Newton-Raphson.
 *
 * @param value O valor do radicando.
 * @param rootIndex O índice da raiz (ex: 2 para quadrada, 3 para cúbica).
 * @returns A parte inteira da raiz calculada.
 */
export function calculateNthRoot(value: bigint, rootIndex: bigint): bigint {
    if (rootIndex <= 0n) {
        throw new CurrencyNBRError({
            type: "invalid-root-index",
            title: "Operação de Raiz Inválida",
            detail: "O índice da raiz deve ser um número inteiro positivo.",
            operation: "root",
        });
    }
    if (value < 0n && rootIndex % 2n === 0n) {
        throw new CurrencyNBRError({
            type: "even-root-of-negative",
            title: "Operação de Raiz Inválida",
            detail: "Não é possível calcular a raiz par de um número negativo (resultado complexo não suportado).",
            operation: "root",
        });
    }
    if (value === 0n) { return 0n; }

    const isValueNegative = value < 0n;
    const absoluteValue = isValueNegative ? -value : value;

    // Estimativa inicial baseada no comprimento do número
    let currentGuess = 10n ** (BigInt(absoluteValue.toString().length) / rootIndex + 1n);

    while (true) {
        const previousGuess = currentGuess;
        const guessPowMinusOne = previousGuess ** (rootIndex - 1n);

        // Fórmula de Newton: x_{n+1} = ((k-1)x_n + A / x_n^{k-1}) / k
        currentGuess = ((rootIndex - 1n) * previousGuess + absoluteValue / guessPowMinusOne)
            / rootIndex;

        // Verifica convergência (estabilidade entre -1 e 1)
        if (currentGuess >= previousGuess - 1n && currentGuess <= previousGuess + 1n) { break; }
    }

    // Ajuste fino para garantir a maior raiz inteira que satisfaça r^n <= x
    if (currentGuess ** rootIndex > absoluteValue) {
        while (currentGuess ** rootIndex > absoluteValue) { currentGuess--; }
    } else {
        while ((currentGuess + 1n) ** rootIndex <= absoluteValue) { currentGuess++; }
    }

    return isValueNegative ? -currentGuess : currentGuess;
}

/**
 * Calcula a potência fracionária de um BigInt com um fator de escala.
 * Representa matematicamente: (base / scale) ^ (num / den) * scale
 * Simplificado para: nthRoot(base^num * scale^(den-num), den)
 *
 * @param base O valor base (já escalonado).
 * @param num O numerador do expoente.
 * @param den O denominador do expoente.
 * @param scale O fator de escala interna.
 * @returns O resultado da operação, escalonado.
 */
export function calculateFractionalPower(base: bigint, num: bigint, den: bigint, scale: bigint): bigint {
    if (den <= 0n) {
        throw new CurrencyNBRError({
            type: "invalid-root-index",
            title: "Operação de Raiz Inválida",
            detail: "O denominador de um expoente fracionário deve ser um número inteiro positivo.",
            operation: "power",
        });
    }

    const exponentDiff = den - num;

    let radicand: bigint;
    if (exponentDiff >= 0n) {
        radicand = calculateBigIntPower(base, num) * calculateBigIntPower(scale, exponentDiff);
    } else {
        // Quando num > den, o expoente de scale (den - num) é negativo.
        // Representa (base^num / scale^(num - den)).
        radicand = calculateBigIntPower(base, num) / calculateBigIntPower(scale, -exponentDiff);
    }

    return calculateNthRoot(radicand, den);
}
