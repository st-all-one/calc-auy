import type { CalcAUYCustomOutput, OutputOptions } from "@calc-auy";
import { KATEX_CSS_MINIFIED } from "./vendor.ts";
import katex from "katex";

/**
 * Opções customizadas para o processador HTML.
 */
export type HtmlProcessorOptions = OutputOptions & {
    /** Opções diretas para o motor de renderização KaTeX. */
    katexOptions?: any;
    /** Classe CSS adicional para o container do resultado. */
    containerClass?: string;
};

/**
 * Processador oficial para renderização de fórmulas matemáticas em HTML.
 *
 * **Engenharia:** Injeta o motor KaTeX e o CSS minificado (com fontes)
 * diretamente no rastro, gerando um fragmento auto-contido e acessível.
 */
export const htmlProcessor: CalcAUYCustomOutput<string, HtmlProcessorOptions> = function (
    ctx,
): string {
    const { audit, options } = ctx;

    // Recupera o LaTeX já calculado pelo core
    const fullLatex = audit.latex;

    // Renderização visual via KaTeX, integrando opções customizadas
    const rendered = katex.renderToString(fullLatex, {
        displayMode: true,
        throwOnError: false,
        ...(options.katexOptions || {}),
    });

    // Recupera a tradução verbal para acessibilidade (ARIA)
    const verbal = audit.verbal;
    const containerClass = options.containerClass ? ` ${options.containerClass}` : "";

    const result = `
<div class="calc-auy-result${containerClass}" aria-label="${verbal}">
  <style>
    ${KATEX_CSS_MINIFIED}
    .calc-auy-result { margin: 1em 0; overflow-x: auto; }
  </style>
  ${rendered}
</div>`.trim();

    return result;
};
