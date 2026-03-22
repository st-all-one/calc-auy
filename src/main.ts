// deno-lint-ignore-file ban-unused-ignore default-param-last

import { calculateBigIntPower, calculateNthRoot } from "./internal/math_utils.ts";
import { parseStringValue } from "./internal/parser.ts";
import { toSuperscript } from "./internal/superscript.ts";
import { wrapLaTeX, wrapUnicode } from "./internal/wrappers.ts";
import { CurrencyNBROutput } from "./output.ts";
import { DEFAULT_DISPLAY_PRECISION, INTERNAL_SCALE_FACTOR } from "./constants.ts";
import type { CurrencyNBROutputOptions } from "./output_helpers/options.ts";
import { VERBAL_TOKENS } from "./output_helpers/i18n.ts";
import { CurrencyNBRError } from "./errors.ts";

/**
 * Representa qualquer valor que possa ser convertido em um montante auditável.
 */
export type CurrencyNBRAllowedValue = string | number | bigint | CurrencyNBR;

/**
 * Classe principal para cálculos financeiros precisos, auditáveis e acessíveis.
 */
export class CurrencyNBR {
    private readonly accumulatedValue: bigint;
    private readonly activeTermValue: bigint;
    private readonly accumulatedExpression: string;
    private readonly activeTermExpression: string;
    private readonly accumulatedVerbal: string;
    private readonly activeTermVerbal: string;
    private readonly accumulatedUnicode: string;
    private readonly activeTermUnicode: string;

    private constructor(
        accumulatedValue: bigint,
        activeTermValue: bigint,
        accumulatedExpression: string,
        activeTermExpression: string,
        accumulatedVerbal: string,
        activeTermVerbal: string,
        accumulatedUnicode: string,
        activeTermUnicode: string,
    ) {
        this.accumulatedValue = accumulatedValue;
        this.activeTermValue = activeTermValue;
        this.accumulatedExpression = accumulatedExpression;
        this.activeTermExpression = activeTermExpression;
        this.accumulatedVerbal = accumulatedVerbal;
        this.activeTermVerbal = activeTermVerbal;
        this.accumulatedUnicode = accumulatedUnicode;
        this.activeTermUnicode = activeTermUnicode;
    }

    public static from(value: CurrencyNBRAllowedValue): CurrencyNBR {
        if (value instanceof CurrencyNBR) { return value; }

        // Validação rigorosa em runtime para tipos não suportados
        const isValidType = value !== null
            && value !== undefined
            && (typeof value === "string" || typeof value === "number" || typeof value === "bigint");

        const isActuallyNaN = typeof value === "number" && isNaN(value);

        if (!isValidType || isActuallyNaN) {
            throw new CurrencyNBRError({
                type: "invalid-currency-format",
                title: "Tipo de Dado Inválido",
                detail: `O valor '${
                    String(value)
                }' do tipo '${typeof value}' não é um formato de moeda válido para inicialização.`,
                operation: "from",
            });
        }

        const rawValue = typeof value === "bigint" ? value * INTERNAL_SCALE_FACTOR : parseStringValue(value.toString());
        const initialExpression = value.toString();
        // Não substituímos mais o ponto por vírgula aqui. Deixamos para o gerador final.
        const initialVerbal = initialExpression;
        const initialUnicode = initialExpression;
        return new CurrencyNBR(
            0n,
            rawValue,
            "",
            initialExpression,
            "",
            initialVerbal,
            "",
            initialUnicode,
        );
    }

    public add(value: CurrencyNBRAllowedValue): CurrencyNBR {
        const other = CurrencyNBR.from(value);
        const newAccumulatedValue = this.accumulatedValue + this.activeTermValue;
        return new CurrencyNBR(
            newAccumulatedValue,
            other.accumulatedValue + other.activeTermValue,
            this.getFullLaTeXExpression(),
            other.activeTermExpression,
            this.getFullVerbalExpression(),
            other.activeTermVerbal,
            this.getFullUnicodeExpression(),
            other.activeTermUnicode,
        );
    }

    public sub(value: CurrencyNBRAllowedValue): CurrencyNBR {
        const other = CurrencyNBR.from(value);
        const otherValue = other.accumulatedValue + other.activeTermValue;
        const newAccumulatedValue = this.accumulatedValue + this.activeTermValue;
        return new CurrencyNBR(
            newAccumulatedValue,
            -otherValue,
            this.getFullLaTeXExpression(),
            `- ${other.activeTermExpression}`,
            this.getFullVerbalExpression(),
            `${VERBAL_TOKENS.SUB}${other.activeTermVerbal}`, // Usando Token
            this.getFullUnicodeExpression(),
            `- ${other.activeTermUnicode}`,
        );
    }

    public mult(value: CurrencyNBRAllowedValue): CurrencyNBR {
        const other = CurrencyNBR.from(value);
        const otherValue = other.accumulatedValue + other.activeTermValue;
        const nextActiveValue = (this.activeTermValue * otherValue) / INTERNAL_SCALE_FACTOR;

        const nextActiveExpr = `${wrapLaTeX(this.activeTermExpression)} \\times ${
            wrapLaTeX(other.getFullLaTeXExpression())
        }`;
        // Usando Token MULT
        const nextActiveVerbal = `${this.activeTermVerbal}${VERBAL_TOKENS.MULT}${other.getFullVerbalExpression()}`;
        const nextActiveUnicode = `${wrapUnicode(this.activeTermUnicode)} × ${
            wrapUnicode(other.getFullUnicodeExpression())
        }`;

        return new CurrencyNBR(
            this.accumulatedValue,
            nextActiveValue,
            this.accumulatedExpression,
            nextActiveExpr,
            this.accumulatedVerbal,
            nextActiveVerbal,
            this.accumulatedUnicode,
            nextActiveUnicode,
        );
    }

    public div(value: CurrencyNBRAllowedValue): CurrencyNBR {
        const other = CurrencyNBR.from(value);
        const otherValue = other.accumulatedValue + other.activeTermValue;
        if (otherValue === 0n) {
            throw new CurrencyNBRError({
                type: "division-by-zero",
                title: "Operação Matemática Inválida",
                detail: "Tentativa de divisão por um montante acumulado igual a zero.",
                operation: "division",
                latex: `\\frac{${this.activeTermExpression}}{0}`,
                unicode: `${this.activeTermUnicode} ÷ 0`,
            });
        }
        const nextActiveValue = (this.activeTermValue * INTERNAL_SCALE_FACTOR) / otherValue;

        const nextActiveExpr = `\\frac{${this.activeTermExpression}}{${other.getFullLaTeXExpression()}}`;
        // Usando Token DIV
        const nextActiveVerbal = `${this.activeTermVerbal}${VERBAL_TOKENS.DIV}${other.getFullVerbalExpression()}`;
        const nextActiveUnicode = `${wrapUnicode(this.activeTermUnicode)} ÷ ${
            wrapUnicode(other.getFullUnicodeExpression())
        }`;

        return new CurrencyNBR(
            this.accumulatedValue,
            nextActiveValue,
            this.accumulatedExpression,
            nextActiveExpr,
            this.accumulatedVerbal,
            nextActiveVerbal,
            this.accumulatedUnicode,
            nextActiveUnicode,
        );
    }

    public pow(exponent: string | number): CurrencyNBR {
        const baseValue = this.activeTermValue;
        const baseExpr = wrapLaTeX(this.activeTermExpression);
        const baseVerbal = this.activeTermVerbal;
        const baseUnicode = wrapUnicode(this.activeTermUnicode);

        let nextExpr: string;
        let nextVerbal: string;
        let nextUnicode: string;
        let nextValue: bigint;

        const expStr = exponent.toString();
        if (expStr.includes("/")) {
            const [num, den] = expStr.split("/").map((s) => BigInt(s.trim()));
            nextValue = calculateNthRoot(
                calculateBigIntPower(baseValue, num) * calculateBigIntPower(INTERNAL_SCALE_FACTOR, den - num),
                den,
            );

            const denSup = toSuperscript(den.toString());
            const numSup = num === 1n ? "" : toSuperscript(num.toString());

            nextExpr = num === 1n ? `\\sqrt[${den}]{${baseExpr}}` : `\\sqrt[${den}]{${baseExpr}^{${num}}}`;
            // Verbal usando Tokens de Raiz
            // ex: raiz de índice 3 de base elevado a 2
            nextVerbal = `${VERBAL_TOKENS.ROOT_IDX}${den}${VERBAL_TOKENS.ROOT_OF}${baseVerbal}${
                num === 1n ? "" : VERBAL_TOKENS.POW + num
            }`;
            nextUnicode = `${denSup === "²" ? "" : denSup}√(${baseUnicode}${numSup})`;
        } else {
            const exp = BigInt(expStr);
            const expSup = toSuperscript(expStr);

            nextExpr = `{${baseExpr}}^{${expStr}}`;
            // Verbal usando Token POW
            nextVerbal = `${baseVerbal}${VERBAL_TOKENS.POW}${expStr}`;
            nextUnicode = `${baseUnicode}${expSup}`;

            if (exp === 0n) { nextValue = INTERNAL_SCALE_FACTOR; }
            else if (exp > 0n) {
                nextValue = calculateBigIntPower(baseValue, exp)
                    / calculateBigIntPower(INTERNAL_SCALE_FACTOR, exp - 1n);
            } else {
                const denVal = calculateBigIntPower(baseValue, -exp)
                    / calculateBigIntPower(INTERNAL_SCALE_FACTOR, (-exp) - 1n);
                nextValue = (INTERNAL_SCALE_FACTOR * INTERNAL_SCALE_FACTOR) / denVal;
            }
        }
        return new CurrencyNBR(
            this.accumulatedValue,
            nextValue,
            this.accumulatedExpression,
            nextExpr,
            this.accumulatedVerbal,
            nextVerbal,
            this.accumulatedUnicode,
            nextUnicode,
        );
    }

    public group(): CurrencyNBR {
        const totalValue = this.accumulatedValue + this.activeTermValue;
        const groupedExpr = `\\left( ${this.getFullLaTeXExpression()} \\right)`;
        // Usando Tokens de Grupo
        const groupedVerbal = `${VERBAL_TOKENS.GRP_START}${this.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`;
        const groupedUnicode = `(${this.getFullUnicodeExpression()})`;
        return new CurrencyNBR(0n, totalValue, "", groupedExpr, "", groupedVerbal, "", groupedUnicode);
    }

    /**
     * Finaliza o cálculo e retorna um objeto de saída para formatação.
     * @param decimals A precisão padrão desejada para o output (default: 6).
     * @param options Opções de formatação e arredondamento.
     */
    public commit(
        decimals: number = DEFAULT_DISPLAY_PRECISION,
        options?: CurrencyNBROutputOptions,
    ): CurrencyNBROutput {
        const finalValue = this.accumulatedValue + this.activeTermValue;
        return new CurrencyNBROutput(
            finalValue,
            decimals,
            this.getFullLaTeXExpression(),
            this.getFullVerbalExpression(),
            this.getFullUnicodeExpression(),
            options,
        );
    }

    private getFullLaTeXExpression(): string {
        let expr = this.accumulatedExpression;
        if (this.accumulatedExpression && this.activeTermExpression) {
            expr += this.activeTermExpression.startsWith("-") ? " " : " + ";
        }
        expr += this.activeTermExpression;
        return expr;
    }

    private getFullVerbalExpression(): string {
        let verbal = this.accumulatedVerbal;
        if (this.accumulatedVerbal && this.activeTermVerbal) {
            // Verifica se o termo ativo já começa com token de subtração (negativo)
            // Se sim, usa espaço, senão usa ADD
            verbal += this.activeTermVerbal.includes(VERBAL_TOKENS.SUB) ? " " : VERBAL_TOKENS.ADD;
        }
        verbal += this.activeTermVerbal;
        return verbal;
    }

    private getFullUnicodeExpression(): string {
        let unicode = this.accumulatedUnicode;
        if (this.accumulatedUnicode && this.activeTermUnicode) {
            unicode += this.activeTermUnicode.startsWith("-") ? " " : " + ";
        }
        unicode += this.activeTermUnicode;
        return unicode;
    }
}
