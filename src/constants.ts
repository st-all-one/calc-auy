/**
 * CalcAUY - Global Constants
 * @module
 */

export const LIB_NAME = "calc-auy";
export const LOG_NAMESPACE = [LIB_NAME] as const;

export const PRECISION_BIGINT = 50n;
export const SCALE_BIGINT = 10n ** PRECISION_BIGINT;

export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";

export const ROUNDING_IDS = {
    NBR5891: "NBR",
    HALF_UP: "HU",
    HALF_EVEN: "HE",
    TRUNCATE: "TR",
    CEIL: "CE",
} as const;

export type RoundingStrategy = keyof typeof ROUNDING_IDS;
