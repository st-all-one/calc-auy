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
    const htmlContent = generateHTML(latexExpression, result, verbalDescription);

    // Cria um SVG simples que envolve o HTML
    // Nota: O dimensionamento exato pode ser difícil sem renderização real,
    // então usamos um tamanho genérico ou tentamos estimar.
    // Para simplificar, usamos um tamanho fixo grande o suficiente.
    const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`.trim();

    return new TextEncoder().encode(svgString);
}
