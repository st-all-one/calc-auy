import { CalculationNode } from "./ast.ts";
import { RationalNumber } from "./rational.ts";
import {
    DEFAULT_DECIMAL_PRECISION,
    KATEX_CSS_MINIFIED,
    ROUNDING_IDS,
    RoundingStrategy,
} from "./constants.ts";
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
        "toStringNumber" | "toMonetary" | "toCentsInBigInt" | "toFloatNumber"
    >;
}

export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #strategy: RoundingStrategy;
    readonly #cache = new Map<number, RationalNumber>();
    static #cachedKaTeXCSS: string | null = null;

    constructor(result: RationalNumber, ast: CalculationNode, strategy: RoundingStrategy) {
        this.#result = result;
        this.#ast = ast;
        this.#strategy = strategy;
    }

    /**
     * Internal helper to get or calculate rounded result (Lazy Cache).
     */
    private getRounded(precision: number): RationalNumber {
        if (!this.#cache.has(precision)) {
            const rounded = applyRounding(this.#result, this.#strategy, precision);
            this.#cache.set(precision, rounded);
        }
        return this.#cache.get(precision)!;
    }

    toStringNumber(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const rounded = this.getRounded(p);
        return rounded.toDecimalString(p);
    }

    toFloatNumber(options?: OutputOptions): number {
        return parseFloat(this.toStringNumber(options));
    }

    toCentsInBigInt(options?: OutputOptions): bigint {
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const pScale = 10n ** BigInt(p);
        const rounded = this.getRounded(p);
        return (rounded.n * pScale) / rounded.d;
    }

    toRawInternalBigInt(): bigint {
        return this.#result.n;
    }

    toMonetary(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const loc = getLocale(options?.locale);
        const currency = options?.currency ?? loc.currency;
        const val = this.toStringNumber(options);

        // Simple manual formatting for agnostic runtime
        const [int, dec] = val.split(".");
        const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, loc.thousandSeparator);
        const symbol = currency === "BRL" ? "R$ " : "$ ";
        return `${symbol}${formattedInt}${loc.decimalSeparator}${dec || "0".repeat(p)}`;
    }

    toLaTeX(): string {
        return this.renderAST(this.#ast, "latex");
    }

    toUnicode(options?: OutputOptions): string {
        const base = this.renderAST(this.#ast, "unicode");
        const strategyId = ROUNDING_IDS[this.#strategy];
        const subStrategy = toSubscript(strategyId);
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;

        return `round${subStrategy}(${base}, ${p}) = ${this.toStringNumber(options)}`;
    }

    /**
     * Gera o HTML para exibição da fórmula matemática utilizando o motor KaTeX.
     * Requer a passagem do módulo 'katex' como parâmetro para inversão de dependência.
     */
    toHTML(katex: any, options?: OutputOptions): string {
        if (!katex || typeof katex.renderToString !== "function") {
            throw new CalcAUYError(
                "invalid-syntax",
                "O módulo 'katex' é obrigatório para toHTML e deve possuir a função renderToString.",
            );
        }

        const baseLatex = this.toLaTeX();
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const roundedStr = this.toStringNumber(options);
        const strategyId = ROUNDING_IDS[this.#strategy];
        const verbal = this.toVerbalA11y(options);

        // Audit Trail simplificado: round_{ESTRATÉGIA}(Expressão, Precisão) = Resultado
        const fullLatex = `\\text{round}_{\\text{${strategyId}}}(${baseLatex}, ${p}) = ${roundedStr}`;

        const rendered = katex.renderToString(fullLatex, {
            displayMode: true,
            throwOnError: false,
        });

        if (!CalcAUYOutput.#cachedKaTeXCSS) {
            CalcAUYOutput.#cachedKaTeXCSS = KATEX_CSS_MINIFIED;
        }

        return `
<div class="calc-auy-result" aria-label="${verbal}">
  <style>
    ${CalcAUYOutput.#cachedKaTeXCSS}
    .calc-auy-result { margin: 1em 0; overflow-x: auto; }
  </style>
  ${rendered}
</div>`.trim();
    }

    /**
     * Gera uma imagem (SVG) contendo a representação visual do cálculo.
     */
    toImageBuffer(
        katex: any,
        options?: OutputOptions,
    ): Uint8Array {
        const html = this.toHTML(katex, options);
        const latex = this.toLaTeX();
        const verbal = this.toVerbalA11y(options);
        const roundedStr = this.toStringNumber(options);
        const strategyId = ROUNDING_IDS[this.#strategy];
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;

        // 1. Engenharia do Cálculo Heurístico do ViewBox
        const scaleFactor = 1.3;
        const averagePxPerChar = 8;
        const paddingHorizontal = 16;
        const paddingVertical = 16;

        // Medimos o comprimento do rastro de auditoria simplificado para estimar a largura
        const textToMeasure = `round_{${strategyId}}(${latex}, ${p}) = ${roundedStr}`;
        const estimatedWidth = (textToMeasure.length * averagePxPerChar * scaleFactor) +
            (paddingHorizontal * 2);
        const finalWidth = Math.max(300, Math.min(2000, Math.ceil(estimatedWidth)));

        // Expansão vertical baseada em frações e raízes
        let verticalExpansion = 0;
        const fracMatches = latex.match(/\\frac/g);
        if (fracMatches) verticalExpansion += fracMatches.length * 15;
        const sqrtMatches = latex.match(/\\sqrt/g);
        if (sqrtMatches) verticalExpansion += sqrtMatches.length * 25;

        const baseHeight = (24 * scaleFactor) + (paddingVertical * 2) + verticalExpansion;
        const finalHeight = Math.max(80, Math.min(1000, Math.ceil(baseHeight)));

        // 2. Construção do SVG com A11y
        const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${finalWidth} ${finalHeight}"
  width="${finalWidth}"
  height="${finalHeight}"
  preserveAspectRatio="xMidYMid meet"
  aria-label="${verbal}"
  role="img"
  style="background: white; border-radius: 8px; border: 1px solid #eee;"
>
  <title>${verbal}</title>
  <foreignObject width="100%" height="100%">
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        padding: ${paddingVertical}px ${paddingHorizontal}px;
        margin: 0;
        font-family: sans-serif;
      "
    >
      <div style="font-size: ${scaleFactor}em; margin: 0; color: #333;">
        ${html}
      </div>
    </div>
  </foreignObject>
</svg>`.trim();

        return new TextEncoder().encode(svg);
    }

    toVerbalA11y(options?: OutputOptions): string {
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const loc = getLocale(options?.locale);
        const base = this.renderAST(this.#ast, "verbal", loc);
        const strategyName = ROUNDING_IDS[this.#strategy];

        // Formata o número final com o separador falado (ex: " vírgula " ou " point ")
        const finalValueStr = this.toStringNumber(options).replace(".", loc.voicedSeparator);

        const { phrases } = loc;
        return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
    }

    toSlice(parts: number, options?: OutputOptions): string[] {
        if (parts <= 0) { throw new CalcAUYError("invalid-precision", "Número de partes deve ser maior que zero."); }
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
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
        const p = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
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

    toAuditTrace(): string {
        return JSON.stringify({
            ast: this.#ast,
            finalResult: this.#result.toJSON(),
            strategy: this.#strategy,
        });
    }

    toJSON(outputs?: string[]): Record<string, unknown> {
        const keys = outputs ?? [
            "toStringNumber",
            "toCentsInBigInt",
            "toMonetary",
            "toLaTeX",
            "toUnicode",
            "toVerbalA11y",
            "toAuditTrace",
        ];
        const res: Record<string, unknown> = {};
        for (const key of keys) {
            if (key === "toJSON" || key === "toCustomOutput") continue;
            const method = (this as any)[key];
            if (typeof method === "function") {
                const val = method.call(this);
                // Ensure BigInt is serialized as string
                res[key] = typeof val === "bigint" ? val.toString() : val;
            }
        }
        return res;
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
                toStringNumber: this.toStringNumber.bind(this),
                toMonetary: this.toMonetary.bind(this),
                toCentsInBigInt: this.toCentsInBigInt.bind(this),
                toFloatNumber: this.toFloatNumber.bind(this),
            },
        };
        return processor.call(this, context);
    }

    private renderAST(node: CalculationNode, format: "latex" | "unicode" | "verbal", loc?: LocaleDefinition): string {
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
            const symbols: Record<string, string> = {
                add: "+",
                sub: "-",
                mul: "\\times",
                pow: "^",
                mod: "\\bmod",
                divInt: "//",
            };
            return ops.join(` ${symbols[node.type]} `);
        }

        if (format === "unicode") {
            if (node.type === "pow") {
                const expNode = node.operands[1];
                if (expNode.kind === "literal" && expNode.originalInput.includes("/")) {
                    const [num, den] = expNode.originalInput.split("/");

                    if (num === "1") {
                        if (den === "2") { return `√(${ops[0]})`; }
                        if (den === "3") { return `∛(${ops[0]})`; }
                        if (den === "4") { return `∜(${ops[0]})`; }
                        return `${toSuperscript(den)}√(${ops[0]})`;
                    }

                    // Ex: x^(7/3) -> ∛(x⁷)
                    if (den === "2") { return `√(${ops[0]}${toSuperscript(num)})`; }
                    if (den === "3") { return `∛(${ops[0]}${toSuperscript(num)})`; }
                    if (den === "4") { return `∜(${ops[0]}${toSuperscript(num)})`; }
                    return `${toSuperscript(den)}√(${ops[0]}${toSuperscript(num)})`;
                }
                return `${ops[0]}${toSuperscript(ops[1])}`;
            }
            const symbols: Record<string, string> = { add: "+", sub: "-", mul: "×", div: "÷", mod: "%", divInt: "//" };
            return ops.join(` ${symbols[node.type]} `);
        }

        if (format === "verbal") {
            return ops.join(` ${loc?.operators[node.type]} `);
        }

        const symbols: Record<string, string> = {
            add: "+",
            sub: "-",
            mul: "*",
            div: "/",
            pow: "^",
            mod: "%",
            divInt: "//",
        };
        return ops.join(` ${symbols[node.type]} `);
    }
}
