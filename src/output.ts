// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { INTERNAL_CALCULATION_PRECISION } from "./constants.ts";
import { formatBigIntToString, formatMonetary } from "./output_helpers/formatting.ts";
import { generateHTML } from "./output_helpers/html_generator.ts";
import { translateVerbal } from "./output_helpers/verbal_translator.ts";
import { generateImageBuffer } from "./output_helpers/image_generator.ts";
import {
    type CalcAUDOutputOptions,
    DEFAULT_OPTIONS,
    type RoundingMethod,
    VALID_ROUNDING_METHODS,
} from "./output_helpers/options.ts";
import { outputLazyRounding } from "./output_helpers/lazy_rounding.ts";
import { LOCALE_CURRENCY_MAP } from "./output_helpers/locales.ts";
import { CalcAUDError } from "./errors.ts";
import { Logger } from "./logger.ts";
import { toSubscript } from "./internal/subscript.ts";
import type { ICalcAUDCustomOutput } from "./output_helpers/custom_formatter.ts";

/**
 * Métodos de saída disponíveis para a classe CalcAUDOutput.
 * Define todas as formas possíveis de exportar o resultado de um cálculo.
 */
export const AVAILABLE_OUTPUT_METHODS = [
    "toString",
    "toFloatNumber",
    "toCentsInBigInt",
    "toRawInternalBigInt",
    "toMonetary",
    "toLaTeX",
    "toHTML",
    "toVerbalA11y",
    "toUnicode",
    "toImageBuffer",
] as const;

/**
 * Tipo representando as chaves de saída permitidas na biblioteca CalcAUD.
 */
export type CalcAUDOutputMethod = typeof AVAILABLE_OUTPUT_METHODS[number];

/**
 * Elementos padrão incluídos na exportação JSON caso nenhum seja especificado.
 */
const DEFAULT_JSON_ELEMENTS: CalcAUDOutputMethod[] = [
    "toString",
    "toCentsInBigInt",
    "toMonetary",
    "toLaTeX",
    "toUnicode",
    "toVerbalA11y",
];

/**
 * Siglas para os métodos de arredondamento utilizados em representações simbólicas.
 */
const ROUNDING_ABBREVIATIONS: Record<RoundingMethod, string> = {
    "NBR-5891": "NBR",
    "HALF-EVEN": "HE",
    "HALF-UP": "HU",
    "TRUNCATE": "TR",
    "CEIL": "CE",
};

/**
 * Classe responsável por formatar e exibir o resultado final de um cálculo CalcAUD.
 *
 * Esta classe utiliza um mecanismo de cache interno para garantir que operações
 * custosas de arredondamento e formatação sejam realizadas apenas uma vez.
 *
 * @example
 * ```ts
 * // Exemplo 1: Exportação Monetária
 * const res = CalcAUD.from(100).add(25.5).commit(2);
 * console.log(res.toMonetary()); // "R$ 125,50"
 * ```
 *
 * @example
 * ```ts
 * // Exemplo 2: Integração com Frontend (LaTeX/HTML)
 * const res = CalcAUD.from(10).div(3).commit(2);
 * document.body.innerHTML = res.toHTML(); // Renderiza fórmula bonita via KaTeX
 * ```
 *
 * @example
 * ```ts
 * // Exemplo 3: Uso em APIs (JSON)
 * const res = CalcAUD.from("1234.567").commit(2);
 * const payload = res.toJson(["toMonetary", "toVerbalA11y"]);
 * ```
 */
export class CalcAUDOutput {
    private readonly value: bigint;
    private readonly defaultDecimals: number;
    private readonly latexExpression: string;
    private readonly verbalExpression: string;
    private readonly unicodeExpression: string;
    private readonly options: Required<CalcAUDOutputOptions>;

    // Cache privado para o arredondamento preguiçoso (Lazy Rounding)
    // O objetivo é evitar recalculação de arredondamento ao chamar múltiplos métodos de saída.
    private _cachedStringValue: string | null = null;
    private _cachedCentsValue: bigint | null = null;

    constructor(
        value: bigint,
        defaultDecimals: number,
        latexExpression: string,
        verbalExpression: string,
        unicodeExpression: string,
        options?: CalcAUDOutputOptions,
    ) {
        this.value = value;
        this.defaultDecimals = defaultDecimals;
        this.latexExpression = latexExpression;
        this.verbalExpression = verbalExpression;
        this.unicodeExpression = unicodeExpression;

        if (
            options?.roundingMethod && !(VALID_ROUNDING_METHODS as readonly string[]).includes(options.roundingMethod)
        ) {
            throw new CalcAUDError({
                type: "invalid-rounding-method",
                title: "Arredondamento Inválido",
                detail: `O método '${options.roundingMethod}' não é suportado.`,
                operation: "output-options",
            });
        }

        if (options?.locale && !Object.keys(LOCALE_CURRENCY_MAP).includes(options.locale)) {
            throw new CalcAUDError({
                type: "invalid-locale",
                title: "Locale não Suportado",
                detail: `O locale '${options.locale}' não está disponível.`,
                operation: "output-options",
            });
        }

        const resolvedLocale = options?.locale ?? DEFAULT_OPTIONS.locale;
        const resolvedCurrency = options?.currency
            ?? (options?.locale ? LOCALE_CURRENCY_MAP[options.locale] : DEFAULT_OPTIONS.currency);

        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
            locale: resolvedLocale,
            currency: resolvedCurrency,
        };
    }

    /**
     * Resolve o cache de arredondamento de forma preguiçosa.
     * Garante que o cálculo ocorra apenas uma vez, independente de quantos
     * formatos de saída o usuário solicitar.
     */
    private _resolveLazyCache(): void {
        if (this._cachedStringValue !== null && this._cachedCentsValue !== null) {
            return;
        }

        const result = outputLazyRounding(
            this.value,
            this.defaultDecimals,
            this.options.roundingMethod,
        );

        this._cachedStringValue = result.stringValue;
        this._cachedCentsValue = result.centsValue;
    }

    /**
     * Retorna o valor arredondado e formatado como string decimal simples.
     *
     * @returns String decimal (ex: "1234.56").
     *
     * @example
     * ```ts
     * CalcAUD.from(10.5).commit(2).toString(); // "10.50"
     * CalcAUD.from("1/3").commit(2).toString(); // "0.33"
     * CalcAUD.from("1000").commit(0).toString(); // "1000"
     * ```
     */
    public toString(): string {
        const start = performance.now();
        this._resolveLazyCache();
        const result = this._cachedStringValue ?? "CACHE_ERROR";
        const end = performance.now();
        Logger.getChild(["output", "tostring"]).info("String output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Retorna o valor convertido para Number (float).
     * CUIDADO: Ao converter para Number, você perde a garantia de precisão arbitrária do BigInt.
     *
     * @returns O valor como number.
     *
     * @example
     * ```ts
     * const val = CalcAUD.from(10).div(2).commit(2).toFloatNumber(); // 5
     * ```
     */
    public toFloatNumber(): number {
        const start = performance.now();
        const result = Number(this.toString());
        const end = performance.now();
        Logger.getChild(["output", "toFloat"]).info("Float output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Retorna o valor como BigInt (Cents), arredondado para a escala desejada.
     * Útil para persistência em bancos de dados que armazenam centavos.
     *
     * @returns BigInt na escala reduzida.
     *
     * @example
     * ```ts
     * // 15.00 com 2 casas decimais -> retorna 1500n
     * CalcAUD.from("15.00").commit(2).toCentsInBigInt();
     * ```
     */
    public toCentsInBigInt(): bigint {
        const start = performance.now();
        this._resolveLazyCache();
        const result = this._cachedCentsValue ?? 0n;
        const end = performance.now();
        Logger.getChild(["output", "toCentsBigInt"]).info("Cents BigInt output generated {*}", {
            calcTime: end - start,
            result: result.toString(),
        });
        return result;
    }

    /**
     * Retorna o valor bruto BigInt usado internamente (escala fixa de 10^12).
     * Para auditoria técnica profunda e debug.
     *
     * @returns BigInt bruto.
     */
    public toRawInternalBigInt(): bigint {
        const start = performance.now();
        const result = this.value;
        const end = performance.now();
        Logger.getChild(["output", "rawInternalBigInt"]).info("Raw Internal BigInt output generated {*}", {
            calcTime: end - start,
            result: result.toString(),
        });
        return result;
    }

    /**
     * Retorna o resultado formatado como moeda (ex: R$ 1.234,56).
     * Respeita o 'locale' e a 'currency' definidos nas opções.
     *
     * @returns String monetária formatada.
     *
     * @example
     * ```ts
     * CalcAUD.from(1250.5).commit(2).toMonetary(); // "R$ 1.250,50"
     * CalcAUD.from(10).commit(2, { locale: "en-US" }).toMonetary(); // "$10.00"
     * ```
     */
    public toMonetary(): string {
        const start = performance.now();
        const targetLocale = this.options.locale;
        const targetCurrency = this.options.currency;
        const result = formatMonetary(this.toString(), targetLocale, targetCurrency);
        const end = performance.now();
        Logger.getChild(["output", "toMonetary"]).info("Monetary output generated {*}", {
            calcTime: end - start,
            result,
            locale: targetLocale,
            currency: targetCurrency,
        });
        return result;
    }

    /**
     * Retorna a expressão completa e o resultado em formato LaTeX.
     * Ideal para visualização em dashboards financeiros e relatórios científicos.
     *
     * @returns String LaTeX.
     */
    public toLaTeX(): string {
        const start = performance.now();
        const abbrev = this.getRoundingAbbreviation();
        const unrounded = this.getUnroundedString();
        const decimals = this.defaultDecimals;
        const rounded = this.toString();

        const roundExpr = `\\text{round}_{${abbrev}}(${unrounded}, ${decimals})`;
        const result = `$$ ${this.latexExpression} = ${roundExpr} = ${rounded} $$`;
        const end = performance.now();
        Logger.getChild(["output", "toLaTeX"]).info("LaTeX output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Retorna o HTML renderizado (via KaTeX) contendo a fórmula matemática.
     * Inclui suporte nativo para acessibilidade via 'aria-label' verbalizado.
     *
     * @returns String HTML com CSS inline.
     */
    public toHTML(): string {
        const start = performance.now();
        const abbrev = this.getRoundingAbbreviation();
        const unrounded = this.getUnroundedString();
        const decimals = this.defaultDecimals;
        const rounded = this.toString();

        const roundExpr = `\\text{round}_{${abbrev}}(${unrounded}, ${decimals})`;
        const fullExpr = `${roundExpr} = ${rounded}`;

        const result = generateHTML(
            this.latexExpression,
            fullExpr,
            this.toVerbalA11y(),
        );
        const end = performance.now();
        Logger.getChild(["output", "toHTML"]).info("HTML output generated {*}", {
            calcTime: end - start,
        });
        return result;
    }

    /**
     * Retorna a descrição verbal acessível para o cálculo.
     * Útil para leitores de tela e auditorias faladas.
     *
     * @returns Descrição textual por extenso.
     */
    public toVerbalA11y(): string {
        const start = performance.now();
        const result = translateVerbal(
            this.verbalExpression,
            this.toString(),
            this.options.locale,
            this.options.roundingMethod,
        );
        const end = performance.now();
        Logger.getChild(["output", "toVerbalA11y"]).info("Verbal output generated {*}", {
            calcTime: end - start,
            locale: this.options.locale,
        });
        return result;
    }

    /**
     * Retorna a expressão matemática e o resultado utilizando caracteres Unicode (UTF-8).
     * Ótimo para logs de terminal, e-mails simples ou mensagens de texto.
     *
     * @returns Representação textual Unicode.
     */
    public toUnicode(): string {
        const start = performance.now();
        const abbrev = this.getRoundingAbbreviation();
        const unrounded = this.getUnroundedString();
        const decimals = this.defaultDecimals;
        const rounded = this.toString();

        const subAbbrev = toSubscript(abbrev);
        const roundExpr = `round${subAbbrev}(${unrounded}, ${decimals})`;
        const result = `${this.unicodeExpression} = ${roundExpr} = ${rounded}`;
        const end = performance.now();
        Logger.getChild(["output", "toUnicode"]).info("Unicode output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Gera uma imagem (buffer SVG) contendo a representação visual do cálculo.
     *
     * @returns Uint8Array contendo os bytes da imagem SVG.
     */
    public toImageBuffer(): Uint8Array {
        const start = performance.now();
        const abbrev = this.getRoundingAbbreviation();
        const unrounded = this.getUnroundedString();
        const decimals = this.defaultDecimals;
        const rounded = this.toString();

        const roundExpr = `\\text{round}_{${abbrev}}(${unrounded}, ${decimals})`;
        const fullResultExpr = `${roundExpr} = ${rounded}`;

        const result = generateImageBuffer(
            this.latexExpression,
            fullResultExpr,
            this.toVerbalA11y(),
        );
        const end = performance.now();
        Logger.getChild(["output", "toImageBuffer"]).info("ImageBuffer output generated {*}", {
            calcTime: end - start,
        });
        return result;
    }

    /**
     * Retorna um objeto JSON contendo os resultados e metadados do cálculo.
     *
     * @param elements Lista de métodos de saída para incluir no JSON (opcional).
     * @returns String JSON serializada.
     */
    public toJson(elements: CalcAUDOutputMethod[] = []): string {
        const start = performance.now();
        const targetElements = elements.length > 0 ? elements : DEFAULT_JSON_ELEMENTS;
        const resultObj: Record<string, unknown> = {
            meta: {
                options: this.options,
                decimals: this.defaultDecimals,
            },
        };

        for (const key of targetElements) {
            switch (key) {
                case "toString":
                    resultObj[key] = this.toString();
                    break;
                case "toFloatNumber":
                    resultObj[key] = this.toFloatNumber();
                    break;
                case "toCentsInBigInt":
                    resultObj[key] = this.toCentsInBigInt().toString();
                    break;
                case "toRawInternalBigInt":
                    resultObj[key] = this.toRawInternalBigInt().toString();
                    break;
                case "toMonetary":
                    resultObj[key] = this.toMonetary();
                    break;
                case "toLaTeX":
                    resultObj[key] = this.toLaTeX();
                    break;
                case "toHTML":
                    resultObj[key] = this.toHTML();
                    break;
                case "toVerbalA11y":
                    resultObj[key] = this.toVerbalA11y();
                    break;
                case "toUnicode":
                    resultObj[key] = this.toUnicode();
                    break;
                case "toImageBuffer":
                    resultObj[key] = Array.from(this.toImageBuffer());
                    break;
            }
        }

        const result = JSON.stringify(resultObj);
        const end = performance.now();
        Logger.getChild(["output", "toJSON"]).info("JSON output generated {*}", {
            calcTime: end - start,
            elements: targetElements,
        });
        return result;
    }

    /**
     * Ponto de saída agnóstico que permite total controle sobre o processamento dos dados.
     * Ideal para implementações de protocolos binários (Protobuf), integrações externas
     * ou exportações para formatos não suportados nativamente.
     *
     * @param processor Função ou interface que processa a saída.
     * @returns O resultado no formato definido pelo desenvolvedor.
     */
    public toCustomOutput<Toutput>(
        processor: ICalcAUDCustomOutput<Toutput>,
    ): Toutput {
        const start = performance.now();

        const result = processor.call(this, {
            rawData: {
                value: this.value,
                decimalPrecision: this.defaultDecimals,
                latexExpression: this.latexExpression,
                verbalExpression: this.verbalExpression,
                unicodeExpression: this.unicodeExpression,
                options: this.options,
            },
            method: this,
        });

        const end = performance.now();
        Logger.getChild(["output", "toCustomOutput"]).info("Custom output generated {*}", {
            calcTime: end - start,
        });

        return result;
    }

    private getRoundingAbbreviation(): string {
        return ROUNDING_ABBREVIATIONS[this.options.roundingMethod] || "??";
    }

    private getUnroundedString(): string {
        const full = formatBigIntToString(this.value, INTERNAL_CALCULATION_PRECISION);
        if (full.includes(".")) {
            let endIndex = full.length;

            // Caminha de trás para frente ignorando os zeros
            while (endIndex > 0 && full[endIndex - 1] === "0") {
                endIndex--;
            }

            // Se, depois de tirar os zeros, sobrou o ponto no final, ignoramos ele também
            if (endIndex > 0 && full[endIndex - 1] === ".") {
                endIndex--;
            }

            // Retorna apenas a parte da string que importa
            return full.slice(0, endIndex);
        }
        return full;
    }
}
