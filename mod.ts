/**
 * # CalcAUY - Engine de Cálculo Auditável e Acessível
 *
 * A CalcAUY é uma biblioteca de alta precisão projetada para sistemas que exigem
 * **integridade matemática absoluta** e **rastro de auditoria**.
 *
 * Diferente de operações tradicionais com `number` (IEEE 754), que podem introduzir
 * imprecisões decimais acumuladas, a CalcAUY utiliza uma Árvore de Sintaxe Abstrata (AST)
 * para representar expressões e resolve-as utilizando frações racionais (`n/d`)
 * baseadas em `BigInt`.
 *
 * ### Pilares da Engenharia:
 * 1. **Imutabilidade:** Cada operação gera uma nova instância da árvore, facilitando o rastreio.
 * 2. **Auditabilidade Forense:** Cada nó pode carregar metadados de negócio via `.setMetadata()`.
 * 3. **Acessibilidade (A11y):** Geração nativa de rastro verbalizado localizado para leitores de tela.
 * 4. **Ciclo de Vida Controlado:** O cálculo é construído (Build), finalizado (Commit) e então exportado (Output).
 *
 * @example Uso Fluido (Fluent API)
 * ```ts
 * import { CalcAUY } from "./mod.ts";
 *
 * const total = CalcAUY.from(100)
 *   .add(50)
 *   .mult("0.10")
 *   .setMetadata("context", "taxa_administrativa")
 *   .commit();
 *
 * console.log(total.toMonetary({ precision: 2 })); // "R$ 15,00"
 * ```
 *
 * @module
 */

export { CalcAUY } from "./src/builder.ts";
export { CalcAUYOutput } from "./src/output.ts";
export { CalcAUYError } from "./src/core/errors.ts";
export type { ICalcAUYCustomOutput } from "./src/output.ts";
export type { CalcAUYLocaleA11y } from "./src/i18n/i18n.ts";
export type { OutputOptions } from "./src/core/types.ts";
