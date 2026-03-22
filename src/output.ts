import { roundToPrecisionNBR5891 } from "./internal/rounding.ts";
import { INTERNAL_CALCULATION_PRECISION } from "./constants.ts";
import { formatBigIntToString, formatMonetary } from "./output_helpers/formatting.ts";
import { generateHTML } from "./output_helpers/html_generator.ts";
import { generateVerbal } from "./output_helpers/verbal_generator.ts";
import { generateImageBuffer } from "./output_helpers/image_generator.ts";

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

    constructor(
        value: bigint,
        defaultDecimals: number,
        latexExpression: string,
        verbalExpression: string,
        unicodeExpression: string,
    ) {
        this.value = value;
        this.defaultDecimals = defaultDecimals;
        this.latexExpression = latexExpression;
        this.verbalExpression = verbalExpression;
        this.unicodeExpression = unicodeExpression;
    }

    /**
     * Retorna o valor arredondado e formatado como string decimal.
     * @param decimals Opcional. Sobrescreve a precisão padrão definida no commit.
     */
    public toString(decimals: number = this.defaultDecimals): string {
        const rounded = roundToPrecisionNBR5891(this.value, INTERNAL_CALCULATION_PRECISION, decimals);
        return formatBigIntToString(rounded, decimals);
    }

    /**
     * Retorna o valor como um número de ponto flutuante (JavaScript Number).
     * @warning Pode haver perda de precisão para valores muito grandes ou muito precisos.
     */
    public toFloatNumber(decimals: number = this.defaultDecimals): number {
        return Number(this.toString(decimals));
    }

    /**
     * Retorna o valor bruto como BigInt (na escala interna de 10^12).
     */
    public toBigInt(): bigint {
        return this.value;
    }

    /**
     * Retorna o resultado formatado como moeda.
     * @param locale O locale (ex: "pt-BR").
     * @param currency A moeda (ex: "BRL").
     * @param decimals Opcional. Sobrescreve a precisão padrão.
     */
    // deno-lint-ignore default-param-last
    public toMonetary(locale: string = "pt-BR", currency: string = "BRL", decimals?: number): string {
        // Moeda geralmente usa 2 casas, mas permitimos sobrescrever.
        const str = this.toString(decimals ?? 2);
        return formatMonetary(str, locale, currency);
    }

    /**
     * Retorna a expressão completa e o resultado em LaTeX.
     */
    public toLaTeX(decimals: number = this.defaultDecimals): string {
        return `$$ ${this.latexExpression} = ${this.toString(decimals)} $$`;
    }

    /**
     * Retorna o HTML renderizado (com KaTeX) para a fórmula.
     */
    public toHTML(decimals: number = this.defaultDecimals): string {
        return generateHTML(
            this.latexExpression,
            this.toString(decimals),
            this.toVerbalA11y(decimals),
        );
    }

    /**
     * Retorna a descrição verbal acessível.
     */
    public toVerbalA11y(decimals: number = this.defaultDecimals): string {
        return generateVerbal(this.verbalExpression, this.toString(decimals));
    }

    /**
     * Retorna a expressão em Unicode para terminal/CLI.
     */
    public toUnicode(decimals: number = this.defaultDecimals): string {
        return `${this.unicodeExpression} = ${this.toString(decimals)}`;
    }

    /**
     * Retorna um buffer de imagem (SVG) contendo a renderização visual.
     */
    public toImageBuffer(decimals: number = this.defaultDecimals): Uint8Array {
        return generateImageBuffer(
            this.latexExpression,
            this.toString(decimals),
            this.toVerbalA11y(decimals),
        );
    }

    /**
     * Retorna um objeto JSON contendo os resultados dos métodos solicitados.
     * @param elements Array de métodos desejados. Se vazio, retorna todos.
     * @param decimals Casas decimais para os métodos que suportam.
     */
    public toJson(elements: CurrencyOutputMethod[] = [], decimals: number = this.defaultDecimals): string {
        const targetElements = elements.length > 0 ? elements : AVAILABLE_OUTPUT_METHODS;
        const result: Record<string, unknown> = {};

        for (const key of targetElements) {
            switch (key) {
                case "toString":
                    result[key] = this.toString(decimals);
                    break;
                case "toFloatNumber":
                    result[key] = this.toFloatNumber(decimals);
                    break;
                case "toBigInt":
                    result[key] = this.toBigInt().toString();
                    break;
                case "toMonetary":
                    result[key] = this.toMonetary("pt-BR", "BRL", decimals);
                    break;
                case "toLaTeX":
                    result[key] = this.toLaTeX(decimals);
                    break;
                case "toHTML":
                    result[key] = this.toHTML(decimals);
                    break;
                case "toVerbalA11y":
                    result[key] = this.toVerbalA11y(decimals);
                    break;
                case "toUnicode":
                    result[key] = this.toUnicode(decimals);
                    break;
                case "toImageBuffer":
                    result[key] = Array.from(this.toImageBuffer(decimals));
                    break;
            }
        }

        return JSON.stringify(result);
    }
}
