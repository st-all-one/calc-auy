import { calculateBigIntPower, calculateNthRoot } from "./internal/math_utils.ts";
import { parseStringValue } from "./internal/parser.ts";
import { toSuperscript } from "./internal/superscript.ts";
import { wrapLaTeX, wrapUnicode } from "./internal/wrappers.ts";
import { CurrencyNBROutput } from "./output.ts";
import { DEFAULT_DISPLAY_PRECISION, INTERNAL_SCALE_FACTOR } from "./constants.ts";

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
        const rawValue = typeof value === "bigint" ? value * INTERNAL_SCALE_FACTOR : parseStringValue(value.toString());
        const initialExpression = value.toString();
        const initialVerbal = initialExpression.replace(".", ",");
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
            `menos ${other.activeTermVerbal}`,
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
        const nextActiveVerbal = `${this.activeTermVerbal} multiplicado por ${other.getFullVerbalExpression()}`;
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
        if (otherValue === 0n) { throw new Error("Division by zero"); }
        const nextActiveValue = (this.activeTermValue * INTERNAL_SCALE_FACTOR) / otherValue;

        const nextActiveExpr = `\\frac{${this.activeTermExpression}}{${other.getFullLaTeXExpression()}}`;
        const nextActiveVerbal = `${this.activeTermVerbal} dividido por ${other.getFullVerbalExpression()}`;
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
            nextVerbal = `raiz de índice ${den} de ${baseVerbal}${num === 1n ? "" : " elevado a " + num}`;
            nextUnicode = `${denSup === "²" ? "" : denSup}√(${baseUnicode}${numSup})`;
        } else {
            const exp = BigInt(expStr);
            const expSup = toSuperscript(expStr);

            nextExpr = `{${baseExpr}}^{${expStr}}`;
            nextVerbal = `${baseVerbal} elevado a ${expStr}`;
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
        const groupedVerbal = `em grupo, ${this.getFullVerbalExpression()}, fim do grupo`;
        const groupedUnicode = `(${this.getFullUnicodeExpression()})`;
        return new CurrencyNBR(0n, totalValue, "", groupedExpr, "", groupedVerbal, "", groupedUnicode);
    }

    /**
     * Finaliza o cálculo e retorna um objeto de saída para formatação.
     * @param decimals A precisão padrão desejada para o output (default: 6).
     */
    public commit(decimals: number = DEFAULT_DISPLAY_PRECISION): CurrencyNBROutput {
        const finalValue = this.accumulatedValue + this.activeTermValue;
        return new CurrencyNBROutput(
            finalValue,
            decimals,
            this.getFullLaTeXExpression(),
            this.getFullVerbalExpression(),
            this.getFullUnicodeExpression(),
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
            verbal += this.activeTermVerbal.includes("menos") ? " " : " mais ";
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
