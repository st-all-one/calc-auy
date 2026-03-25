// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { INTERNAL_CALCULATION_PRECISION, INTERNAL_SCALE_FACTOR } from "../constants.ts";
import { CalcAUDError } from "../errors.ts";

/**
 * @module Parser
 * Motor de análise léxica e conversão de strings numéricas para BigInt.
 *
 * Este parser é propositalmente restritivo (strict) para garantir que
 * nenhum valor ambíguo ou mal formatado entre na engine de cálculo.
 */

// Definições de Regex para validação rigorosa seguindo padrões matemáticos comuns.
const DIGITS = String.raw`\d+(?:_\d+)*`;
const SIGN = String.raw`[+-]?`;
const EXP = String.raw`[eE]${SIGN}${DIGITS}`;

// Suporte a literais BigInt nativos do JS (ex: 100n)
const RE_BIGINT = new RegExp(String.raw`^${SIGN}${DIGITS}n$`);

// Suporte a frações literais para precisão absoluta (ex: 1/3)
const RE_FRACTION = new RegExp(String.raw`^${SIGN}${DIGITS}\/${SIGN}${DIGITS}$`);

// Suporte a notação científica (ex: 1.5e-2)
const RE_SCIENTIFIC = new RegExp(String.raw`^${SIGN}(?:(?:${DIGITS}(?:\.(?:${DIGITS})?)?)|(?:\.(?:${DIGITS})))${EXP}$`);

// Suporte a decimais e inteiros padrão
const RE_DECIMAL = new RegExp(String.raw`^${SIGN}(?:(?:${DIGITS}(?:\.(?:${DIGITS})?)?)|(?:\.(?:${DIGITS})))$`);

/**
 * Analisa uma string numérica estritamente e a converte para um BigInt na escala interna (10^12).
 *
 * @param value A string representando o número.
 * @returns O valor BigInt escalado.
 * @throws CalcAUDError se o formato for inválido ou ambíguo.
 */
export function parseStringValue(value: string): bigint {
    // Verificamos os formatos do mais específico para o mais geral
    if (RE_BIGINT.test(value)) {
        return parseBigIntLiteral(value);
    }
    if (RE_FRACTION.test(value)) {
        return parseFractionLiteral(value);
    }
    if (RE_SCIENTIFIC.test(value)) {
        return parseScientificLiteral(value);
    }
    if (RE_DECIMAL.test(value)) {
        // Reutilizamos a lógica científica com expoente 0 para simplificar a manutenção
        return parseScientificLiteral(value + "e0");
    }

    throw new CalcAUDError({
        type: "invalid-numeric-format",
        title: "Erro de Parsing Numérico",
        detail:
            `O tipo '${typeof value}' não corresponde a nenhum formato permitido (Decimal, Fração, Científico ou BigInt).`,
        operation: "parse",
    });
}

function removeUnderscores(s: string): string {
    return s.replaceAll("_", "");
}

/**
 * Converte literal '100n' -> 100000000000000n (escala 12)
 */
function parseBigIntLiteral(value: string): bigint {
    const clean = removeUnderscores(value.slice(0, -1));
    return BigInt(clean) * INTERNAL_SCALE_FACTOR;
}

/**
 * Converte '1/3' aplicando arredondamento Half-Up na 12ª casa decimal.
 */
function parseFractionLiteral(value: string): bigint {
    const parts = value.split("/");
    const numStr = removeUnderscores(parts[0]);
    const denStr = removeUnderscores(parts[1]);

    const num = BigInt(numStr);
    const den = BigInt(denStr);

    if (den === 0n) {
        throw new CalcAUDError({
            type: "division-by-zero",
            title: "Erro de Parsing de Fração",
            detail: "Denominador da fração não pode ser zero.",
            operation: "parse",
        });
    }

    const finalSign = (num < 0n) === (den < 0n) ? 1n : -1n;
    const absNum = num < 0n ? -num : num;
    const absDen = den < 0n ? -den : den;

    const absScaled = absNum * INTERNAL_SCALE_FACTOR;
    const absQuotient = absScaled / absDen;
    const absRem = absScaled % absDen;

    // Implementação manual do Round Half Away From Zero para frações de input
    if (2n * absRem >= absDen) {
        return (absQuotient + 1n) * finalSign;
    }
    return absQuotient * finalSign;
}

/**
 * Resolve notação científica mantendo a precisão interna de 12 casas.
 */
function parseScientificLiteral(value: string): bigint {
    const lower = value.toLowerCase();
    const parts = lower.split("e");
    let mantissaStr = removeUnderscores(parts[0]);
    const expStr = removeUnderscores(parts[1]);

    const exp = BigInt(expStr);
    let mantissaDecimals = 0;

    if (mantissaStr.includes(".")) {
        const [intPart, decPart] = mantissaStr.split(".");
        mantissaDecimals = decPart.length;
        mantissaStr = intPart + decPart;
    }

    const mantissaInt = BigInt(mantissaStr || "0");

    // Calculamos a potência final combinando o expoente 'e' com a escala de 10^12
    const power = exp + BigInt(INTERNAL_CALCULATION_PRECISION) - BigInt(mantissaDecimals);

    if (power >= 0n) {
        return mantissaInt * (10n ** power);
    } else {
        // Caso a potência seja negativa, precisamos dividir e arredondar
        const denominator = 10n ** (-power);
        const absMantissa = mantissaInt < 0n ? -mantissaInt : mantissaInt;
        const sign = mantissaInt < 0n ? -1n : 1n;

        const quotient = absMantissa / denominator;
        const remainder = absMantissa % denominator;

        if (2n * remainder >= denominator) {
            return (quotient + 1n) * sign;
        }
        return quotient * sign;
    }
}
