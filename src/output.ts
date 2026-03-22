import { INTERNAL_CALCULATION_PRECISION } from "./constants.ts";
import { formatBigIntToString, formatMonetary } from "./output_helpers/formatting.ts";
import { generateHTML } from "./output_helpers/html_generator.ts";
import { translateVerbal } from "./output_helpers/verbal_translator.ts";
import { generateImageBuffer } from "./output_helpers/image_generator.ts";
import { type CurrencyNBROutputOptions, DEFAULT_OPTIONS, VALID_ROUNDING_METHODS } from "./output_helpers/options.ts";
import { applyRounding } from "./output_helpers/rounding_manager.ts";
import { LOCALE_CURRENCY_MAP } from "./output_helpers/locales.ts";
import { CurrencyNBRError } from "./errors.ts";

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
                title: "Opção de Arredondamento Inválida",
                detail: `O método de arredondamento '${options.roundingMethod}' não é suportado pela biblioteca.`,
                operation: "output-options",
            });
        }

        if (options?.locale && !Object.keys(LOCALE_CURRENCY_MAP).includes(options.locale)) {
            throw new CurrencyNBRError({
                type: "invalid-currency-format",
                title: "Locale não Suportado",
                detail: `O locale '${options.locale}' não está disponível para formatação nesta biblioteca.`,
                operation: "output-options",
            });
        }

        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Retorna o valor arredondado e formatado como string decimal conforme configurado no commit.
     */
    public toString(): string {
        const rounded = applyRounding(
            this.value,
            this.options.roundingMethod,
            INTERNAL_CALCULATION_PRECISION,
            this.defaultDecimals,
        );
        return formatBigIntToString(rounded, this.defaultDecimals);
    }

    /**
     * Retorna o valor como um número de ponto flutuante (JavaScript Number).
     * @warning Pode haver perda de precisão para valores muito grandes ou muito precisos.
     */
    public toFloatNumber(): number {
        return Number(this.toString());
    }

    /**
     * Retorna o valor bruto como BigInt (na escala interna).
     */
    public toBigInt(): bigint {
        return this.value;
    }

    /**
     * Retorna o resultado formatado como moeda conforme o locale e moeda definidos no commit.
     */
    public toMonetary(): string {
        const targetLocale = this.options.locale;
        const targetCurrency = LOCALE_CURRENCY_MAP[targetLocale] ?? "BRL";
        return formatMonetary(this.toString(), targetLocale, targetCurrency);
    }

    /**
     * Retorna a expressão completa e o resultado em LaTeX.
     */
    public toLaTeX(): string {
        return `$$ ${this.latexExpression} = ${this.toString()} $$`;
    }

    /**
     * Retorna o HTML renderizado (com KaTeX) para a fórmula.
     */
    public toHTML(): string {
        return generateHTML(
            this.latexExpression,
            this.toString(),
            this.toVerbalA11y(),
        );
    }

    /**
     * Retorna a descrição verbal acessível traduzida para o locale configurado.
     */
    public toVerbalA11y(): string {
        return translateVerbal(
            this.verbalExpression,
            this.toString(),
            this.options.locale,
            this.options.roundingMethod,
        );
    }

    /**
     * Retorna a expressão em Unicode para terminal/CLI.
     */
    public toUnicode(): string {
        return `${this.unicodeExpression} = ${this.toString()}`;
    }

    /**
     * Retorna um buffer de imagem (SVG) contendo a renderização visual.
     */
    public toImageBuffer(): Uint8Array {
        return generateImageBuffer(
            this.latexExpression,
            this.toString(),
            this.toVerbalA11y(),
        );
    }

    /**
     * Retorna um objeto JSON contendo os resultados dos métodos solicitados e as opções utilizadas.
     * @param elements Array de métodos desejados. Se vazio, retorna todos os disponíveis.
     */
    public toJson(elements: CurrencyOutputMethod[] = []): string {
        const targetElements = elements.length > 0 ? elements : AVAILABLE_OUTPUT_METHODS;
        const result: Record<string, unknown> = {
            meta: {
                options: this.options,
                decimals: this.defaultDecimals,
            },
        };

        for (const key of targetElements) {
            switch (key) {
                case "toString":
                    result[key] = this.toString();
                    break;
                case "toFloatNumber":
                    result[key] = this.toFloatNumber();
                    break;
                case "toBigInt":
                    result[key] = this.toBigInt().toString();
                    break;
                case "toMonetary":
                    result[key] = this.toMonetary();
                    break;
                case "toLaTeX":
                    result[key] = this.toLaTeX();
                    break;
                case "toHTML":
                    result[key] = this.toHTML();
                    break;
                case "toVerbalA11y":
                    result[key] = this.toVerbalA11y();
                    break;
                case "toUnicode":
                    result[key] = this.toUnicode();
                    break;
                case "toImageBuffer":
                    result[key] = Array.from(this.toImageBuffer());
                    break;
            }
        }

        return JSON.stringify(result);
    }
}
