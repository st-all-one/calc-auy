import type { CalculationNode } from "./ast/types.ts";
import type { RationalNumber } from "./core/rational.ts";
import {
    DEFAULT_DECIMAL_PRECISION,
    KATEX_CSS_MINIFIED,
    ROUNDING_IDS,
    type RoundingStrategy,
} from "./core/constants.ts";
import { applyRounding } from "./rounding/rounding.ts";
import { getLocale } from "./i18n/i18n.ts";
import { CalcAUYError } from "./core/errors.ts";
import { toSubscript } from "./utils/unicode.ts";
import { renderAST } from "./output_internal/renderer.ts";
import { performSlice, performSliceByRatio } from "./output_internal/slicer.ts";
import { generateSVG } from "./output_internal/image_utils.ts";
import type { IKatex, OutputOptions } from "./core/types.ts";
import { getSubLogger, measureTime } from "./utils/logger.ts";

const logger = getSubLogger("output");

export type ICalcAUYCustomOutput<Toutput> = (
    this: CalcAUYOutput,
    context: ICalcAUYCustomOutputContext,
) => Toutput;

export interface ICalcAUYCustomOutputContext {
    result: RationalNumber;
    ast: CalculationNode;
    strategy: RoundingStrategy;
    audit: {
        latex: string;
        unicode: string;
        verbal: string;
    };
    options: Readonly<OutputOptions>;
    methods: Pick<
        CalcAUYOutput,
        "toStringNumber" | "toMonetary" | "toCentsInBigInt" | "toFloatNumber"
    >;
}

/**
 * CalcAUYOutput - Container for calculation results and multiple export formats.
 */
export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #strategy: RoundingStrategy;
    readonly #cache: Map<number, RationalNumber> = new Map<number, RationalNumber>();
    private static cachedKaTeXCSS: string | null = null;

    public constructor(result: RationalNumber, ast: CalculationNode, strategy: RoundingStrategy) {
        this.#result = result;
        this.#ast = ast;
        this.#strategy = strategy;
    }

    private getRounded(precision: number): RationalNumber {
        if (!this.#cache.has(precision)) {
            const rounded: RationalNumber = applyRounding(this.#result, this.#strategy, precision);
            this.#cache.set(precision, rounded);
        }
        return this.#cache.get(precision) as RationalNumber;
    }

    public toStringNumber(options?: OutputOptions): string {
        return this.instrument("toStringNumber", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            return this.getRounded(p).toDecimalString(p);
        });
    }

    public toFloatNumber(options?: OutputOptions): number {
        return this.instrument("toFloatNumber", options, () => {
            return parseFloat(this.toStringNumber(options));
        });
    }

    public toCentsInBigInt(options?: OutputOptions): bigint {
        return this.instrument("toCentsInBigInt", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const pScale: bigint = 10n ** BigInt(p);
            const rounded: RationalNumber = this.getRounded(p);
            return (rounded.n * pScale) / rounded.d;
        });
    }

    public toRawInternalBigInt(): bigint {
        return this.#result.n;
    }

    public toMonetary(options?: OutputOptions): string {
        return this.instrument("toMonetary", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const loc = getLocale(options?.locale);
            const currency: string = options?.currency ?? loc.currency;
            const val: string = this.toStringNumber(options);

            const [int, dec] = val.split(".");
            const formattedInt: string = int.replace(/\B(?=(\d{3})+(?!\d))/g, loc.thousandSeparator);
            const symbol: string = currency === "BRL" ? "R$ " : "$ ";
            return `${symbol}${formattedInt}${loc.decimalSeparator}${dec || "0".repeat(p)}`;
        });
    }

    public toLaTeX(options?: OutputOptions): string {
        return this.instrument("toLaTeX", options, () => {
            const base: string = renderAST(this.#ast, "latex");
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const roundedStr: string = this.toStringNumber(options);
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            return `\\text{round}_{\\text{${strategyName}}}(${base}, ${p}) = ${roundedStr}`;
        });
    }

    public toUnicode(options?: OutputOptions): string {
        return this.instrument("toUnicode", options, () => {
            const base: string = renderAST(this.#ast, "unicode");
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            const subStrategy: string = toSubscript(strategyName);
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            return `round${subStrategy}(${base}, ${p}) = ${this.toStringNumber(options)}`;
        });
    }

    public toHTML(katex: IKatex, options?: OutputOptions): string {
        return this.instrument("toHTML", options, () => {
            if (!katex || typeof katex.renderToString !== "function") {
                throw new CalcAUYError("invalid-syntax", "O módulo 'katex' é obrigatório para toHTML.");
            }

            const fullLatex: string = this.toLaTeX(options);
            const verbal: string = this.toVerbalA11y(options);

            const rendered: string = katex.renderToString(fullLatex, { displayMode: true, throwOnError: false });

            if (!CalcAUYOutput.cachedKaTeXCSS) { CalcAUYOutput.cachedKaTeXCSS = KATEX_CSS_MINIFIED; }

            return `<div class="calc-auy-result" aria-label="${verbal}"><style>${CalcAUYOutput.cachedKaTeXCSS}.calc-auy-result { margin: 1em 0; overflow-x: auto; }</style>${rendered}</div>`;
        });
    }

    public toImageBuffer(katex: IKatex, options?: OutputOptions): Uint8Array {
        return this.instrument("toImageBuffer", options, () => {
            const html: string = this.toHTML(katex, options);
            const latex: string = this.toLaTeX(options);
            const verbal: string = this.toVerbalA11y(options);

            const svg: string = generateSVG(html, latex, verbal);
            return new TextEncoder().encode(svg);
        });
    }

    public toVerbalA11y(options?: OutputOptions): string {
        return this.instrument("toVerbalA11y", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const loc = getLocale(options?.locale);
            const base: string = renderAST(this.#ast, "verbal", loc);
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            const finalValueStr: string = this.toStringNumber(options).replace(".", loc.voicedSeparator);
            const { phrases } = loc;
            return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
        });
    }

    public toSlice(parts: number, options?: OutputOptions): string[] {
        return this.instrument("toSlice", { ...options, parts }, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const totalCents: bigint = this.toCentsInBigInt(options);
            return performSlice(totalCents, parts, p);
        });
    }

    public toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[] {
        return this.instrument("toSliceByRatio", { ...options, ratios }, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const totalCents: bigint = this.toCentsInBigInt(options);
            return performSliceByRatio(totalCents, ratios, p);
        });
    }

    public toAuditTrace(): string {
        return JSON.stringify({
            ast: this.#ast,
            finalResult: this.#result.toJSON(),
            strategy: this.#strategy,
        });
    }

    public toJSON(outputs?: string[]): Record<string, unknown> {
        const keys: string[] = outputs
            ?? [
                "toStringNumber",
                "toCentsInBigInt",
                "toMonetary",
                "toLaTeX",
                "toUnicode",
                "toVerbalA11y",
            ];
        const res: Record<string, unknown> = {};
        for (const key of keys) {
            if (key === "toJSON" || key === "toCustomOutput") { continue; }
            const method: unknown = (this as unknown as Record<string, unknown>)[key];
            if (typeof method === "function") {
                const val: unknown = method.call(this);
                res[key] = typeof val === "bigint" ? val.toString() : val;
            }
        }
        return res;
    }

    public toCustomOutput<T>(processor: ICalcAUYCustomOutput<T>): T {
        const context: ICalcAUYCustomOutputContext = {
            result: this.#result,
            ast: this.#ast,
            strategy: this.#strategy,
            audit: { latex: this.toLaTeX(), unicode: this.toUnicode(), verbal: this.toVerbalA11y() },
            options: {},
            methods: {
                toStringNumber: this.toStringNumber.bind(this),
                toMonetary: this.toMonetary.bind(this),
                toCentsInBigInt: this.toCentsInBigInt.bind(this),
                toFloatNumber: this.toFloatNumber.bind(this),
            },
        };
        return processor.call(this, context);
    }

    private instrument<T>(method: string, options: unknown, fn: () => T): T {
        const [result, duration] = measureTime(fn);
        logger.info("Output generated", {
            output_method: method,
            duration,
            options,
            internal_value: this.#result.toJSON(),
        });
        return result;
    }
}
