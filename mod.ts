/**
 * CalcAUY - Cálculo Auditável e com Acessibilidade
 * @module
 */

export { CalcAUY } from "./src/builder.ts";
export { CalcAUYOutput } from "./src/output.ts";
export { CalcAUYError } from "./src/core/errors.ts";
export { RationalNumber } from "./src/core/rational.ts";
export type { ICalcAUYCustomOutput, ICalcAUYCustomOutputContext } from "./src/output.ts";
export type { OutputOptions, CalcAUYLocale, IKatex } from "./src/core/types.ts";
export type { CalculationNode, NodeKind, OperationType } from "./src/ast/types.ts";
export type { RoundingStrategy } from "./src/core/constants.ts";
