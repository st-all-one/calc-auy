/**
 * CalcAUY Demo - Output Mapper
 * @module
 */

import katex from "@katex";
import type { CalcAUYOutput } from "@calc-auy";

/**
 * Maps all output formats of a CalcAUYOutput instance to a serializable
 * object, including binary conversions for web visualization.
 *
 * @param output The output instance to be mapped.
 * @returns Object containing all representations of the calculation.
 */
export async function mapAllOutputs(
    output: CalcAUYOutput,
): Promise<Record<string, unknown>> {
    // KaTeX renderer mockup for server-side demo (since we don't have real KaTeX on server yet)
    // In a real scenario, we might use a JSR/NPM package for KaTeX

    const buffer = await output.toImageBuffer(katex.renderToString);
    const hex = Array.from(buffer).map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    const base64 = btoa(String.fromCharCode(...buffer));

    // Custom processor example
    const customReport = output.toCustomOutput((ctx) => {
        return `[AUDIT-REPORT] Result: ${ctx.result.n}/${ctx.result.d} | Strategy: ${ctx.strategy} | Precision: ${
            ctx.options.decimalPrecision ?? "default"
        }`;
    });

    return {
        toStringNumber: output.toStringNumber(),
        toFloatNumber: output.toFloatNumber(),
        toRawInternalBigInt: output.toRawInternalBigInt().toString(),
        toCentsInBigInt: output.toCentsInBigInt().toString(),
        toMonetary: output.toMonetary(),
        toLaTeX: output.toLaTeX(),
        toHTML: output.toHTML(katex.renderToString),
        toVerbalA11y: output.toVerbalA11y(),
        toUnicode: output.toUnicode(),
        toAuditTrace: JSON.parse(output.toAuditTrace()),
        toJSON: output.toJSON(),
        toCustomOutput: customReport,
        toImageBufferHex: hex,
        toImageDataBase64: `data:image/svg+xml;base64,${base64}`,
    };
}
