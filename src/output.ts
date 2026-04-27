/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalculationNode, RationalValue, SerializedCalculation } from "./ast/types.ts";
import type { RationalNumber } from "./core/rational.ts";
import { DEFAULT_DECIMAL_PRECISION, ROUNDING_IDS, type RoundingStrategy } from "./core/constants.ts";
import { applyRounding } from "./core/rounding.ts";
import { getLocale } from "./output_internal/i18n.ts";
import type { CalcAUYCustomOutput, CalcAUYCustomOutputContext, CalcAUYLocaleA11y } from "./output_internal/types.ts";
import { toSubscript } from "./output_internal/unicode.ts";
import { renderAST } from "./output_internal/renderer.ts";
import { performSlice, performSliceByRatio } from "./output_internal/slicer.ts";
import { renderMermaidSequence } from "./output_internal/mermaid_sequence_renderer.ts";
import type { OutputOptions } from "./output_internal/types.ts";
import { getSubLogger, startSpan } from "./utils/logger.ts";
import type { InstanceConfig } from "./core/types.ts";

const logger = getSubLogger("output");

/**
 * Chaves de saída suportadas pelo método toJSON.
 */
export type OutputKey =
    | "toStringNumber"
    | "toFloatNumber"
    | "toScaledBigInt"
    | "toRawInternalNumber"
    | "toMonetary"
    | "toLaTeX"
    | "toUnicode"
    | "toMermaidGraph"
    | "toVerbalA11y"
    | "toSlice"
    | "toSliceByRatio"
    | "toAuditTrace";

/**
 * CalcAUYOutput - Container imutável para resultados de cálculo e múltiplos formatos de exportação.
 *
 * Esta classe é gerada pelo método `CalcAUYLogic.commit()`. Ela encapsula o resultado final
 * (como um `RationalNumber`) e a AST original, permitindo que o desenvolvedor extraia
 * a informação no formato mais adequado para cada canal (UI, Relatórios, Logs, A11y).
 *
 * @class
 */
export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #roundStrategy: RoundingStrategy;
    readonly #signature: string;
    readonly #config: Required<InstanceConfig>;
    readonly #cache: Map<number, RationalNumber> = new Map<number, RationalNumber>();
    readonly #outputCache: Map<string, string | Uint8Array> = new Map();
    #cachedLiveTrace: SerializedCalculation | null = null;
    #cachedMethods: CalcAUYCustomOutputContext["methods"] | null = null;
    #cachedResultJSON: RationalValue | null = null;

    static readonly #formatterCache = new Map<string, Intl.NumberFormat>();

    public constructor(
        result: RationalNumber,
        ast: CalculationNode,
        roundStrategy: RoundingStrategy,
        signature: string,
        config: Required<InstanceConfig>,
    ) {
        this.#result = result;
        this.#ast = ast;
        this.#roundStrategy = roundStrategy;
        this.#signature = signature;
        this.#config = config;
    }

    private getRounded(precision: number): RationalNumber {
        if (!this.#cache.has(precision)) {
            const rounded: RationalNumber = applyRounding(this.#result, this.#roundStrategy, precision);
            this.#cache.set(precision, rounded);
        }
        // deno-lint-ignore no-non-null-assertion
        return this.#cache.get(precision)!;
    }

    private getEffectivePrecision(options?: OutputOptions): number {
        if (options?.decimalPrecision !== undefined) { return options.decimalPrecision; }
        return this.#roundStrategy === "NONE" ? 50 : DEFAULT_DECIMAL_PRECISION;
    }

    private getResultJSON(): RationalValue {
        if (!this.#cachedResultJSON) {
            this.#cachedResultJSON = this.#result.toJSON() as RationalValue;
        }
        return this.#cachedResultJSON;
    }

    public toStringNumber(options?: OutputOptions): string {
        using _span = startSpan("toStringNumber", logger, options);
        return this.toStringNumberInternal(options);
    }

    private toStringNumberInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toStringNumber:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const result = isNone ? this.#result.toDecimalString(p) : this.getRounded(p).toDecimalString(p);

        // Se for NONE, removemos zeros à direita desnecessários para mostrar o valor "limpo"
        const finalResult = isNone ? result.replace(/\.?0+$/, "").replace(/\.$/, "") || "0" : result;

        this.#outputCache.set(cacheKey, finalResult);
        return finalResult;
    }

    public toFloatNumber(options?: OutputOptions): number {
        using _span = startSpan("toFloatNumber", logger, options);
        return Number.parseFloat(this.toStringNumberInternal(options));
    }

    public toScaledBigInt(options?: OutputOptions): bigint {
        using _span = startSpan("toScaledBigInt", logger, options);
        return this.toScaledBigIntInternal(options);
    }

    private toScaledBigIntInternal(options?: OutputOptions): bigint {
        const p: number = this.getEffectivePrecision(options);
        const pScale: bigint = 10n ** BigInt(p);
        const rounded: RationalNumber = this.getRounded(p);
        return (rounded.n * pScale) / rounded.d;
    }

    public toRawInternalNumber(): { n: bigint; d: bigint } {
        using _span = startSpan("toRawInternalNumber", logger, {});
        return this.toRawInternalNumberInternal();
    }

    private toRawInternalNumberInternal(): { n: bigint; d: bigint } {
        return { n: this.#result.n, d: this.#result.d };
    }

    /**
     * Retorna o rastro completo da execução como um objeto para inspeção programática.
     *
     * **Engenharia:** Semelhante ao `toAuditTrace`, mas retorna o objeto tipado
     * (sem serialização JSON) e objetivamente "vivo".
     */
    public toLiveTrace(): SerializedCalculation {
        using _span = startSpan("toLiveTrace", logger, {});
        return this.toLiveTraceInternal();
    }
    private toLiveTraceInternal(): SerializedCalculation {
        if (!this.#cachedLiveTrace) {
            this.#cachedLiveTrace = {
                // Otimização: Shallow copy do root. Nós da AST são imutáveis por design.
                ast: { ...this.#ast },
                finalResult: this.getResultJSON(),
                roundStrategy: this.#roundStrategy,
                signature: this.#signature,
                contextLabel: this.#config.contextLabel,
            };
        }
        return { ...this.#cachedLiveTrace };
    }

    public toMonetary(options?: OutputOptions): string {
        using _span = startSpan("toMonetary", logger, options);
        return this.toMonetaryInternal(options);
    }

    private toMonetaryInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const loc = getLocale(options?.locale);
        const currency: string = options?.currency ?? loc.currency;
        const val: string = this.toStringNumberInternal(options);

        const numberValue = Number.parseFloat(val);
        if (Number.isNaN(numberValue)) { return val; }

        const cacheKey = `${loc.locale}:${currency}:${p}:${this.#roundStrategy === "NONE"}`;
        let formatter = CalcAUYOutput.#formatterCache.get(cacheKey);
        if (!formatter) {
            formatter = new Intl.NumberFormat(loc.locale, {
                style: "currency",
                currency,
                minimumFractionDigits: p,
                maximumFractionDigits: p,
            });
            CalcAUYOutput.#formatterCache.set(cacheKey, formatter);
        }

        return formatter.format(numberValue);
    }

    public toLaTeX(options?: OutputOptions): string {
        using _span = startSpan("toLaTeX", logger, options);
        return this.toLaTeXInternal(options);
    }

    private toLaTeXInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toLaTeX:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const base: string = renderAST(this.#ast, "latex");
        let roundedStr: string = this.toStringNumberInternal(options);
        // Escapar % no resultado para LaTeX para evitar erros de comentário
        roundedStr = roundedStr.replace(/%/g, String.raw`\%`);
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const result = String.raw`\text{round}_{\text{${strategyName}}}(${base}, ${p}) = ${roundedStr}`;
        this.#outputCache.set(cacheKey, result);
        return result;
    }

    public toUnicode(options?: OutputOptions): string {
        using _span = startSpan("toUnicode", logger, options);
        return this.toUnicodeInternal(options);
    }

    private toUnicodeInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toUnicode:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const base: string = renderAST(this.#ast, "unicode");
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const subStrategy: string = toSubscript(strategyName);
        const result = `round${subStrategy}(${base}, ${p}) = ${this.toStringNumberInternal(options)}`;
        this.#outputCache.set(cacheKey, result);
        return result;
    }

    public toMermaidGraph(options?: OutputOptions): string {
        using _span = startSpan("toMermaidGraph", logger, options);
        return this.toMermaidGraphInternal(options);
    }

    private toMermaidGraphInternal(options?: OutputOptions): string {
        const loc = getLocale(options?.locale);
        const cacheKey = `toMermaidGraph:${loc.locale}`;
        let graph = this.#outputCache.get(cacheKey) as string;
        if (graph === undefined) {
            graph = renderMermaidSequence(this.#ast, this.#config, this.#signature, loc);
            this.#outputCache.set(cacheKey, graph);
        }
        return graph;
    }

    public toVerbalA11y(options?: OutputOptions, customLocale?: CalcAUYLocaleA11y): string {
        using _span = startSpan("toVerbalA11y", logger, options);
        return this.toVerbalA11yInternal(options, customLocale);
    }

    private toVerbalA11yInternal(options?: OutputOptions, customLocale?: CalcAUYLocaleA11y): string {
        const p: number = this.getEffectivePrecision(options);
        const loc = customLocale || getLocale(options?.locale);
        const base: string = renderAST(this.#ast, "verbal", loc);
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const finalValueStr: string = this.toStringNumberInternal(options).replace(".", loc.voicedSeparator);
        const { phrases } = loc;
        return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
    }

    public toSlice(parts: number, options?: OutputOptions): string[] {
        using _span = startSpan("toSlice", logger, { ...options, parts });
        return this.toSliceInternal(parts, options);
    }

    private toSliceInternal(parts: number, options?: OutputOptions): string[] {
        const p: number = this.getEffectivePrecision(options);
        const totalCents: bigint = this.toScaledBigIntInternal(options);
        return performSlice(totalCents, parts, p);
    }

    public toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[] {
        using _span = startSpan("toSliceByRatio", logger, { ...options, ratios });
        return this.toSliceByRatioInternal(ratios, options);
    }

    private toSliceByRatioInternal(ratios: (number | string)[], options?: OutputOptions): string[] {
        const p: number = this.getEffectivePrecision(options);
        const totalCents: bigint = this.toScaledBigIntInternal(options);
        return performSliceByRatio(totalCents, ratios, p);
    }

    public toAuditTrace(): string {
        using _span = startSpan("toAuditTrace", logger, {});
        return this.toAuditTraceInternal();
    }

    private toAuditTraceInternal(): string {
        const cacheKey = "auditTrace";
        let trace = this.#outputCache.get(cacheKey) as string;
        if (trace === undefined) {
            trace = JSON.stringify(this.toLiveTraceInternal());
            this.#outputCache.set(cacheKey, trace);
        }
        return trace;
    }

    public toJSON<T extends OutputKey>(
        outputs?: T[],
        options?: OutputOptions,
    ): string {
        using _span = startSpan("toJSON", logger, { outputs, options });
        const keys: OutputKey[] = (outputs as OutputKey[])
            ?? [
                "toStringNumber",
                "toScaledBigInt",
                "toMonetary",
                "toLaTeX",
                "toUnicode",
                "toVerbalA11y",
                "toAuditTrace",
            ];
        const res: Record<string, unknown> = {};
        const self = this as unknown as Record<string, (opts?: OutputOptions) => unknown>;

        for (const key of keys) {
            if (key === ("toJSON" as OutputKey) || key === ("toCustomOutput" as OutputKey)) {
                continue;
            }

            const internalKey = `${key}Internal`;
            const method = self[internalKey] || self[key];

            if (typeof method === "function") {
                let val: unknown;
                if (key === "toSlice") {
                    continue;
                } else {
                    val = method.call(this, options);
                }
                res[key] = typeof val === "bigint" ? val.toString() : val;
            }
        }

        res.signature = this.#signature;
        res.contextLabel = this.#config.contextLabel;

        return JSON.stringify(res, (_key, value) => typeof value === "bigint" ? value.toString() : value);
    }

    public toCustomOutput<Toutput, Toptions extends OutputOptions = OutputOptions>(
        processor: CalcAUYCustomOutput<Toutput, Toptions>,
        options: Toptions = {} as Toptions,
    ): Toutput {
        using _span = startSpan("toCustomOutput", logger, options);

        if (!this.#cachedMethods) {
            this.#cachedMethods = Object.freeze({
                toStringNumber: this.toStringNumber.bind(this),
                toFloatNumber: this.toFloatNumber.bind(this),
                toScaledBigInt: this.toScaledBigInt.bind(this),
                toRawInternalNumber: this.toRawInternalNumber.bind(this),
                toLiveTrace: this.toLiveTrace.bind(this),
                toMonetary: this.toMonetary.bind(this),
                toLaTeX: this.toLaTeX.bind(this),
                toUnicode: this.toUnicode.bind(this),
                toMermaidGraph: this.toMermaidGraph.bind(this),
                toVerbalA11y: this.toVerbalA11y.bind(this),
                toSlice: this.toSlice.bind(this),
                toSliceByRatio: this.toSliceByRatio.bind(this),
                toAuditTrace: this.toAuditTrace.bind(this),
                toJSON: this.toJSON.bind(this),
            });
        }

        const context: CalcAUYCustomOutputContext<Toptions> = {
            result: this.#result,
            ast: this.#ast,
            roundStrategy: this.#roundStrategy,
            audit: {
                latex: this.toLaTeXInternal(options),
                unicode: this.toUnicodeInternal(options),
                verbal: this.toVerbalA11yInternal(options),
            },
            options,
            methods: this.#cachedMethods,
        };
        return processor.call(this, context);
    }
}
