import { INTERNAL_CALCULATION_PRECISION, INTERNAL_SCALE_FACTOR } from "../constants.ts";
import { CurrencyNBRError } from "../errors.ts";

/**
 * Analisa uma string numérica e a converte para um BigInt na escala interna.
 * Lida com valores negativos e precisão decimal.
 *
 * @param value A string representando o número.
 * @returns O valor BigInt escalado.
 * @throws CurrencyNBRError se o formato for inválido.
 */
export function parseStringValue(value: string): bigint {
    const numericPattern = /^(-?\d+)(?:\.(\d+))?$/;
    const match = value.match(numericPattern);
    if (!match) {
        throw new CurrencyNBRError({
            type: "invalid-numeric-format",
            title: "Erro de Parsing Numérico",
            detail: `O valor '${value}' não é um formato numérico válido (ex: 123.45).`,
            operation: "parse",
        });
    }
    const [_, integerPart, decimalPart = ""] = match;
    const isNegative = integerPart.startsWith("-");
    const absoluteInteger = BigInt(integerPart.replace("-", "")) * INTERNAL_SCALE_FACTOR;
    let absoluteDecimal = 0n;
    if (decimalPart) {
        const normalizedDecimal = decimalPart.slice(0, INTERNAL_CALCULATION_PRECISION + 1).padEnd(
            INTERNAL_CALCULATION_PRECISION + 1,
            "0",
        );
        absoluteDecimal = BigInt(normalizedDecimal.slice(0, INTERNAL_CALCULATION_PRECISION));
        if (Number(normalizedDecimal[INTERNAL_CALCULATION_PRECISION]) >= 5) { absoluteDecimal += 1n; }
    }
    const totalAbsoluteValue = absoluteInteger + absoluteDecimal;
    return isNegative ? -totalAbsoluteValue : totalAbsoluteValue;
}
