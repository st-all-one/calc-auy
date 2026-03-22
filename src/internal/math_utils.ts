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
        throw new Error("Negative exponents are not supported for BigInt power operations.");
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
    if (rootIndex <= 0n) { throw new Error("Root index must be a positive integer."); }
    if (value < 0n && rootIndex % 2n === 0n) {
        throw new Error("Cannot calculate even root of a negative number.");
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
