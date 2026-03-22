import type { LOCALE_CURRENCY_MAP } from "./locales.ts";

/**
 * Métodos de arredondamento disponíveis.
 */
export const VALID_ROUNDING_METHODS = ["NBR-5891", "HALF-EVEN", "HALF-UP", "TRUNCATE", "CEIL"] as const;

/**
 * Tipo representando os métodos de arredondamento válidos.
 */
export type RoundingMethod = typeof VALID_ROUNDING_METHODS[number];

/**
 * Locales suportados, inferidos do mapa de moedas com tipagem literal.
 */
export type LocaleLang = keyof typeof LOCALE_CURRENCY_MAP;

/**
 * Interface para configurar o output da CurrencyNBROutput.
 */
export interface CurrencyNBROutputOptions {
    /**
     * Define o algoritmo de arredondamento.
     * @default "NBR-5891"
     */
    roundingMethod?: RoundingMethod;

    /**
     * Define o locale padrão para formatação numérica e moeda.
     * @default "pt-BR"
     */
    locale?: LocaleLang;
}

/**
 * Valores padrão para as opções.
 */
export const DEFAULT_OPTIONS: Required<CurrencyNBROutputOptions> = {
    roundingMethod: "NBR-5891",
    locale: "pt-BR",
};
