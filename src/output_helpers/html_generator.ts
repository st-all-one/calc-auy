import katex from "@katex";
import { KATEX_CSS_MINIFIED } from "../constants.ts";

// Cache estático para o CSS do KaTeX
let cachedKaTeXCSS: string | null = null;

/**
 * Gera o HTML para exibição da fórmula usando KaTeX.
 *
 * @param latexExpression A expressão LaTeX completa.
 * @param result O resultado formatado.
 * @param verbalDescription A descrição verbal para acessibilidade (aria-label).
 * @returns O HTML completo.
 */
export function generateHTML(latexExpression: string, result: string, verbalDescription: string): string {
    if (!cachedKaTeXCSS) {
        cachedKaTeXCSS = KATEX_CSS_MINIFIED;
    }
    const fullLatex = `${latexExpression} = ${result}`;
    const renderedHTML = katex.renderToString(fullLatex, {
        displayMode: true,
        throwOnError: false,
    });
    return `
<div class="auditable-amount-container" aria-label="${verbalDescription}">
  <style>
    ${cachedKaTeXCSS}
    .auditable-amount-container { margin: 1em 0; overflow-x: auto; }
  </style>
  ${renderedHTML}
</div>`.trim();
}
