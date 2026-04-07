import type { RoundingStrategy } from "./constants.ts";

/**
 * Supported Locales for verbal and monetary formatting.
 */
export type CalcAUYLocale =
    | "pt-BR"
    | "en-US"
    | "en-EU"
    | "es-ES"
    | "fr-FR"
    | "de-DE"
    | "ru-RU"
    | "zh-CN"
    | "ja-JP";

/**
 * Minimal interface for KaTeX library to ensure strict typing.
 */
export interface IKatex {
    /**
     * Renders a TeX expression into an HTML string.
     */
    renderToString(latex: string, options?: KaTeXOptions): string;
}

/**
 * Simplified KaTeX options interface.
 */
export interface KaTeXOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    [key: string]: unknown;
}

/**
 * Global configuration options for outputs.
 */
export interface OutputOptions {
    decimalPrecision?: number;
    locale?: CalcAUYLocale;
    currency?: string;
    roundStrategy?: RoundingStrategy;
}
