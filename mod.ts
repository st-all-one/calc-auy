/**
 * CalcAUY - Cálculo Auditável e com Acessibilidade
 * @module
 */

export { CalcAUY } from "./src/builder.ts";
export { CalcAUYOutput } from "./src/output.ts";
export { CalcAUYError } from "./src/errors.ts";
export { RationalNumber } from "./src/rational.ts";
export type { ICalcAUYCustomOutput, ICalcAUYCustomOutputContext, OutputOptions } from "./src/output.ts";
export type { CalculationNode, NodeKind, OperationType } from "./src/ast.ts";
export type { RoundingStrategy } from "./src/constants.ts";
