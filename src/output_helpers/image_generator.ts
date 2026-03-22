import { generateHTML } from "./html_generator.ts";

/**
 * Gera um buffer de imagem (representação binária) para o resultado.
 * Atualmente gera um SVG contendo o HTML renderizado via foreignObject.
 *
 * @param latexExpression A expressão LaTeX.
 * @param result O resultado formatado.
 * @param verbalDescription A descrição verbal.
 * @returns Um Uint8Array contendo os bytes do SVG.
 */
export function generateImageBuffer(latexExpression: string, result: string, verbalDescription: string): Uint8Array {
    // 1. Gera o HTML puro (assumindo que já contém a estrutura simbólica via KaTeX SSR)
    const htmlContent = generateHTML(latexExpression, result, verbalDescription);

    // --- ENGENHARIA DO CÁLCULO HEURÍSTICO DO VIEWBOX ---
    // Como o SVG foreignObject não "abraça" o conteúdo HTML automaticamente
    // ao exportar como imagem isolada, precisamos estimar o tamanho final.

    // Fator de escala desejado (substituindo o transform: scale)
    const scaleFactor = 1.3;

    // Estimativa pragmática de pixels por caractere na fonte padrão (at 1em)
    // Usamos uma média conservadora que cobre símbolos matemáticos e texto.
    const averagePxPerChar = 8;

    // Padding genérico desejado (32px nas laterais ~ equivale a 2rem)
    const paddingHorizontal = 16;
    const paddingVertical = 16;

    // Texto total a ser medido (LaTeX original + Descrição)
    // Nota: A string LaTeX original é frequentemente mais curta que o HTML gerado,
    // mas serve como uma base de cálculo segura.
    const textToMeasure = `${latexExpression} = ${result}`;
    const textLength = textToMeasure.length;

    // Cálculo da Largura Estimada
    // (Comprimento do texto * média de px * fator de escala) + padding das duas laterais
    const estimatedWidth = (textLength * averagePxPerChar * scaleFactor) + (paddingHorizontal * 2);

    // Aplica limites de sanidade (Clamping) para evitar SVG minúsculos ou absurdamente largos
    const minWidth = 300;
    const maxWidth = 2000; // Limite para não quebrar buffers/visualizadores
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, Math.ceil(estimatedWidth)));

    // Cálculo da Altura Estimada
    // Geralmente auditores financeiros exibem em linha única.
    // Heurística baseada no font-size escalado + padding.
    let baseHeight = (16 * scaleFactor) + (paddingVertical * 2);

    // Se houver frações ou raízes, o KaTeX cresce verticalmente, aumentamos a altura.
    if (latexExpression.includes("\\frac") || latexExpression.includes("\\sqrt")) {
        baseHeight += 40; // Adiciona um respiro vertical
    }
    const finalHeight = Math.ceil(baseHeight);
    // --------------------------------------------------------------------------

    // Cria o SVG agnóstico e calculado
    const svgString = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${finalWidth} ${finalHeight}"
  width="${finalWidth}"
  height="${finalHeight}"
  preserveAspectRatio="xMidYMid meet"
  style="background: white; border-radius: 8px; border: 1px solid #eee;"
>
  <foreignObject width="100%" height="100%">
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        padding: ${paddingVertical}px ${paddingHorizontal}px;
        margin: 0;
        font-family: sans-serif; /* Garante consistência básica fora do KaTeX */
      "
    >
      <div style="font-size: ${scaleFactor}em; margin: 0; color: #333;">
        ${htmlContent}
      </div>
    </div>
  </foreignObject>
</svg>`.trim();

    return new TextEncoder().encode(svgString);
}
