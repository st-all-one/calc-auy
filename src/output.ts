import { INTERNAL_CALCULATION_PRECISION } from "./constants.ts";
import { formatBigIntToString, formatMonetary } from "./output_helpers/formatting.ts";
import { generateHTML } from "./output_helpers/html_generator.ts";
import { translateVerbal } from "./output_helpers/verbal_translator.ts";
import { generateImageBuffer } from "./output_helpers/image_generator.ts";
import { type CurrencyNBROutputOptions, DEFAULT_OPTIONS, type RoundingMethod, VALID_ROUNDING_METHODS } from "./output_helpers/options.ts";
import { applyRounding } from "./output_helpers/rounding_manager.ts";
import { LOCALE_CURRENCY_MAP } from "./output_helpers/locales.ts";
import { CurrencyNBRError } from "./errors.ts";
import { Logger } from "./logger.ts";
import { toSubscript } from "./internal/subscript.ts";

/**
 * Métodos de saída disponíveis para a classe CurrencyNBROutput.
 */
export const AVAILABLE_OUTPUT_METHODS = [
    "toString",
    "toFloatNumber",
    "toBigInt",
    "toMonetary",
    "toLaTeX",
    "toHTML",
    "toVerbalA11y",
    "toUnicode",
    "toImageBuffer",
] as const;

/**
 * Tipo representando as chaves de saída permitidas.
 */
export type CurrencyOutputMethod = typeof AVAILABLE_OUTPUT_METHODS[number];

/**
 * Siglas para os métodos de arredondamento.
 */
const ROUNDING_ABBREVIATIONS: Record<RoundingMethod, string> = {
    "NBR-5891": "NBR",
    "HALF-EVEN": "HE",
    "HALF-UP": "HU",
    "TRUNCATE": "TR",
    "CEIL": "CE",
};

/**
 * Classe responsável por formatar e exibir o resultado de um cálculo CurrencyNBR.
 */
export class CurrencyNBROutput {
    private readonly value: bigint;
    private readonly defaultDecimals: number;
    private readonly latexExpression: string;
    private readonly verbalExpression: string;
    private readonly unicodeExpression: string;
    private readonly options: Required<CurrencyNBROutputOptions>;

    constructor(
        value: bigint,
        defaultDecimals: number,
        latexExpression: string,
        verbalExpression: string,
        unicodeExpression: string,
        options?: CurrencyNBROutputOptions,
    ) {
        this.value = value;
        this.defaultDecimals = defaultDecimals;
        this.latexExpression = latexExpression;
        this.verbalExpression = verbalExpression;
        this.unicodeExpression = unicodeExpression;

        if (
            options?.roundingMethod && !(VALID_ROUNDING_METHODS as readonly string[]).includes(options.roundingMethod)
        ) {
            throw new CurrencyNBRError({
                type: "invalid-currency-format",
                title: "Arredondamento Inválido",
                detail: `O método '${options.roundingMethod}' não é suportado.`,
                operation: "output-options",
            });
        }

        if (options?.locale && !Object.keys(LOCALE_CURRENCY_MAP).includes(options.locale)) {
            throw new CurrencyNBRError({
                type: "invalid-currency-format",
                title: "Locale não Suportado",
                detail: `O locale '${options.locale}' não está disponível.`,
                operation: "output-options",
            });
        }

        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Retorna o valor arredondado e formatado como string decimal.
     */
    public toString(): string {
        const start = performance.now();
        const rounded = applyRounding(
            this.value,
            this.options.roundingMethod,
            INTERNAL_CALCULATION_PRECISION,
            this.defaultDecimals,
        );
        const result = formatBigIntToString(rounded, this.defaultDecimals);
        const end = performance.now();
        Logger.getChild(["output", "string"]).info("String output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Retorna o valor como Number.
     */
    public toFloatNumber(): number {
        const start = performance.now();
        const result = Number(this.toString());
        const end = performance.now();
        Logger.getChild(["output", "toFloatNumber"]).info("Float output generated {*}", {
            calcTime: end - start,
            result,
        });
        return result;
    }

    /**
     * Retorna o valor como BigInt.
     */
    public toBigInt(): bigint {
        const start = performance.now();
        const result = this.value;
        const end = performance.now();
        Logger.getChild(["output", "toBigInt"]).info("BigInt output generated {*}", {
            calcTime: end - start,
            result: result.toString(),
        });
        return result;
    }

    /**
     * Retorna o resultado formatado como moeda.
     */
    public toMonetary(): string {
        const start = performance.now();
        const targetLocale = this.options.locale;
        const targetCurrency = LOCALE_CURRENCY_MAP[targetLocale] ?? "BRL";
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
     * Retorna a expressão e o resultado em LaTeX.
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
     * Retorna o HTML renderizado para a fórmula.
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
     * Retorna a descrição verbal acessível.
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
     * Retorna a expressão em Unicode.
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
     * Retorna um buffer de imagem contendo a renderização.
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
     * Retorna um objeto JSON contendo os resultados solicitados.
     */
    public toJson(elements: CurrencyOutputMethod[] = []): string {
        const start = performance.now();
        const targetElements = elements.length > 0 ? elements : AVAILABLE_OUTPUT_METHODS;
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
                case "toBigInt":
                    resultObj[key] = this.toBigInt().toString();
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
        Logger.getChild(["output", "toJson"]).info("JSON output generated {*}", {
            calcTime: end - start,
            elements: targetElements,
        });
        return result;
    }

    private getRoundingAbbreviation(): string {
        return ROUNDING_ABBREVIATIONS[this.options.roundingMethod] || "??";
    }

    private getUnroundedString(): string {
        const full = formatBigIntToString(this.value, INTERNAL_CALCULATION_PRECISION);
        if (full.indexOf(".") !== -1) {
            return full.replace(/\.?0+$/, "");
        }
        return full;
    }
}
