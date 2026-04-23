// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalcAUYOutput } from "@calc-auy";
import katex from "@katex";

import { encodeBase64 } from "jsr:@std/encoding/base64";

/**
 * Mapeia todos os formatos de saída de uma instância CalcAUYOutput para um
 * objeto serializável, incluindo conversões binárias para visualização na web.
 *
 * @param output A instância de saída a ser mapeada.
 * @returns Objeto contendo todas as representações do cálculo.
 */
export function mapAllOutputs(
    output: CalcAUYOutput,
): Record<string, string | number | null> {
    // 1. Gera todos os outputs via toJSON, agora passando o katex para permitir HTML e Imagem
    const jsonStr = output.toJSON([
        "toStringNumber",
        "toFloatNumber",
        "toRawInternalNumber",
        "toScaledBigInt",
        "toMonetary",
        "toLaTeX",
        "toVerbalA11y",
        "toUnicode",
        "toAuditTrace",
        "toHTML",
        "toImageBuffer",
    ], katex);
    const baseData = JSON.parse(jsonStr);

    // 2. Processamento de imagem (Responsabilidade da aplicação converter o Uint8Array do core para Base64)
    // Nota: baseData.toImageBuffer vem como string JSON ou array de números dependendo do parser
    const buffer = output.toImageBuffer(katex);
    const base64 = encodeBase64(buffer);

    // 3. Exemplos de Slicing (Demonstração fixa)
    const slices = output.toSlice(3);
    const ratioSlices = output.toSliceByRatio(["60%", "30%", "10%"]);

    // 4. Exemplo de processador customizado (Simples e Didático)
    const processorCode = `(ctx) => {
    return \`[REPORT] Result: \${ctx.result.n}/\${ctx.result.d} | Strategy: \${ctx.roundStrategy}\`;
}`;

    const customReport = output.toCustomOutput((ctx) => {
        return `[REPORT] Result: ${ctx.result.n}/${ctx.result.d} | Strategy: ${ctx.roundStrategy}`;
    });

    return {
        toString: baseData.toStringNumber,
        toFloatNumber: baseData.toFloatNumber,
        toRawInternalNumber: `${baseData.toRawInternalNumber.n}/${baseData.toRawInternalNumber.d}`,
        toScaledBigInt: baseData.toScaledBigInt,
        toMonetary: baseData.toMonetary,
        toLaTeX: baseData.toLaTeX,
        toVerbalA11y: baseData.toVerbalA11y,
        toUnicode: baseData.toUnicode,
        toAuditTrace: baseData.toAuditTrace,
        toHTML: baseData.toHTML,
        toCustomOutput: customReport,
        toCustomOutputProcessor: processorCode,
        toImageDataBase64: `data:image/svg+xml;base64,${base64}`,
        toJson: jsonStr,
        toSliceDemo: JSON.stringify(slices),
        toSliceByRatioDemo: JSON.stringify(ratioSlices),
    };
}
