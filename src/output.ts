import { CalculationNode } from "./ast.ts";
import { RationalNumber } from "./rational.ts";
import { ROUNDING_IDS, RoundingStrategy } from "./constants.ts";
import { applyRounding } from "./rounding.ts";
import { getLocale, LocaleDefinition } from "./i18n.ts";
import { CalcAUYError } from "./errors.ts";
import { toSubscript, toSuperscript } from "./unicode_utils.ts";

export interface OutputOptions {
    decimalPrecision?: number;
    locale?: string;
    currency?: string;
}

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
        "toString" | "toMonetary" | "toCentsInBigInt" | "toFloatNumber"
    >;
}

export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #strategy: RoundingStrategy;

    constructor(result: RationalNumber, ast: CalculationNode, strategy: RoundingStrategy) {
        this.#result = result;
        this.#ast = ast;
        this.#strategy = strategy;
    }

    toString(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? 2;
        const rounded = applyRounding(this.#result, this.#strategy, p);
        return rounded.toDecimalString(p);
    }

    toFloatNumber(options?: OutputOptions): number {
        return parseFloat(this.toString(options));
    }

    toCentsInBigInt(options?: OutputOptions): bigint {
        const p = options?.decimalPrecision ?? 2;
        const pScale = 10n ** BigInt(p);
        const rounded = applyRounding(this.#result, this.#strategy, p);
        return (rounded.n * pScale) / rounded.d;
    }

    toRawInternalBigInt(): bigint {
        return this.#result.n;
    }

    toMonetary(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? 2;
        const loc = getLocale(options?.locale);
        const currency = options?.currency ?? loc.currency;
        const val = this.toString(options);

        // Simple manual formatting for agnostic runtime (no Intl dependency for basic case)
        const [int, dec] = val.split(".");
        const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, loc.thousandSeparator);
        const symbol = currency === "BRL" ? "R$ " : "$ ";
        return `${symbol}${formattedInt}${loc.decimalSeparator}${dec || "0".repeat(p)}`;
    }

    toLaTeX(): string {
        return this.renderAST(this.#ast, "latex");
    }

    toUnicode(): string {
        return this.renderAST(this.#ast, "unicode");
    }

    toHTML(katexRenderer: (latex: string) => string): string {
        const latex = this.toLaTeX();
        const verbal = this.toVerbalA11y();
        const html = katexRenderer(latex);
        // Encapsulamento com A11y
        return `<div class="calc-auy-result" aria-label="${verbal}">${html}</div>`;
    }

    async toImageBuffer(
        katexRenderer: (latex: string) => string,
        _options?: OutputOptions,
    ): Promise<Uint8Array> {
        const html = this.toHTML(katexRenderer);
        const latex = this.toLaTeX();

        // Heurística de dimensão baseada no comprimento do LaTeX
        const width = Math.max(300, Math.min(2000, latex.length * 15));
        const height = latex.includes("\\frac") ? 150 : 80;

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100%;">
                        ${html}
                    </div>
                </foreignObject>
            </svg>
        `.trim();

        return new TextEncoder().encode(svg);
    }

    toVerbalA11y(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? 2;
        const loc = getLocale(options?.locale);
        const base = this.renderAST(this.#ast, "verbal", loc);
        const strategyName = ROUNDING_IDS[this.#strategy];

        // Formata o número final com o separador falado (ex: " vírgula " ou " point ")
        const finalValueStr = this.toString(options).replace(".", loc.voicedSeparator);

        const { phrases } = loc;
        return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
    }

    toSlice(parts: number, options?: OutputOptions): string[] {
        if (parts <= 0) { throw new CalcAUYError("invalid-precision", "Número de partes deve ser maior que zero."); }
        const p = options?.decimalPrecision ?? 2;
        const totalCents = this.toCentsInBigInt(options);

        const baseCents = totalCents / BigInt(parts);
        const remainder = totalCents % BigInt(parts);

        const slices: string[] = [];
        for (let i = 0; i < parts; i++) {
            let cents = baseCents;
            if (BigInt(i) < remainder) { cents += 1n; }

            // Convert cents back to string
            const r = RationalNumber.from(`${cents}/${10n ** BigInt(p)}`);
            slices.push(r.toDecimalString(p));
        }
        return slices;
    }

    toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[] {
        if (ratios.length === 0) { return []; }
        const p = options?.decimalPrecision ?? 2;
        const totalCents = this.toCentsInBigInt(options);

        // 1. Normalizar ratios para frações decimais
        const normalized = ratios.map((r) => {
            if (typeof r === "string" && r.endsWith("%")) {
                return parseFloat(r) / 100;
            }
            return typeof r === "string" ? parseFloat(r) : r;
        });

        const ratioSum = normalized.reduce((a, b) => a + b, 0);

        // 2. Alocação inicial baseada na parte inteira da proporção
        const alocacoes = normalized.map((r) =>
            (totalCents * BigInt(Math.floor(r * 1000000))) / BigInt(Math.floor(ratioSum * 1000000))
        );
        let centsAlocados = alocacoes.reduce((a, b) => a + b, 0n);

        // 3. Distribuição do resto (simplificada: para os primeiros)
        let diff = totalCents - centsAlocados;
        for (let i = 0; i < Number(diff); i++) {
            alocacoes[i % alocacoes.length] += 1n;
        }

        return alocacoes.map((cents) => {
            const r = RationalNumber.from(`${cents}/${10n ** BigInt(p)}`);
            return r.toDecimalString(p);
        });
    }

    toAuditTrace(): any {
        return {
            ast: this.#ast,
            finalResult: this.#result.toJSON(),
            strategy: this.#strategy,
        };
    }

    toCustomOutput<T>(processor: ICalcAUYCustomOutput<T>): T {
        const context: ICalcAUYCustomOutputContext = {
            result: this.#result,
            ast: this.#ast,
            strategy: this.#strategy,
            audit: {
                latex: this.toLaTeX(),
                unicode: this.toUnicode(),
                verbal: this.toVerbalA11y(),
            },
            options: {},
            methods: {
                toString: this.toString.bind(this),
                toMonetary: this.toMonetary.bind(this),
                toCentsInBigInt: this.toCentsInBigInt.bind(this),
                toFloatNumber: this.toFloatNumber.bind(this),
            },
        };
        return processor.call(this, context);
    }

    private renderAST(node: CalculationNode, format: "latex" | "unicode" | "verbal", loc?: LocaleDefinition): string {
        // Logic to traverse AST and generate strings based on format
        // This is a simplified version for implementation
        if (node.kind === "literal") { return node.originalInput; }
        if (node.kind === "group") {
            const inner = this.renderAST(node.child, format, loc);
            if (format === "latex") { return `\\left( ${inner} \\right)`; }
            if (format === "verbal") { return `${loc?.operators.group_start} ${inner} ${loc?.operators.group_end}`; }
            return `(${inner})`;
        }

        const ops = node.operands.map((o) => this.renderAST(o, format, loc));
        if (format === "latex") {
            if (node.type === "div") { return `\\frac{${ops[0]}}{${ops[1]}}`; }
            const symbols: any = { add: "+", sub: "-", mul: "\\times", pow: "^", mod: "\\bmod", divInt: "//" };
            return ops.join(` ${symbols[node.type]} `);
        }

        if (format === "verbal") {
            return ops.join(` ${loc?.operators[node.type]} `);
        }

        const symbols: any = { add: "+", sub: "-", mul: "*", div: "/", pow: "^", mod: "%", divInt: "//" };
        return ops.join(` ${symbols[node.type]} `);
    }
}
