/**
 * Ponto de entrada oficial da biblioteca currency-math-audit.
 * Exporta a classe principal e tipos para cálculos financeiros precisos e auditáveis.
 */

export { CurrencyNBR } from "./src/main.ts";
export { CurrencyNBROutput } from "./src/output.ts";
export type { CurrencyNBRAllowedValue } from "./src/main.ts";

/**
 * Re-exporta configurações de precisão para uso externo, se necessário.
 */
export { DEFAULT_DISPLAY_PRECISION, INTERNAL_CALCULATION_PRECISION } from "./src/constants.ts";
