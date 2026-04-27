/**
 * # CalcAUY - Engine de Cálculo Auditável e Acessível
 *
 * A CalcAUY é uma biblioteca de alta precisão projetada para sistemas que exigem
 * **integridade matemática absoluta** e **rastro de auditoria**.
 *
 * @module
 */

import type * as InternalTypes from "./internal-types.ts";

export { CalcAUY } from "./src/main.ts";
export { type BatchOptions, ProcessBatchAUY } from "./src/utils/batch.ts";
export { CalcAUYError } from "./src/core/errors.ts";
export type { CalcAUYOutput } from "./src/output.ts";

export type {
    CalcAUYCustomOutput,
    CalcAUYCustomOutputContext,
    CalcAUYLocaleA11y,
    OutputOptions,
} from "./src/output_internal/types.ts";

export type { InternalTypes };
