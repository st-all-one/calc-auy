import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { CalcAUY } from "../mod.ts";
import { CalcAUYError } from "../src/core/errors.ts";

describe("CalcAUYOutput - HTML & Image Generation", () => {
    const mockKatex = {
        renderToString: (latex: string) => `<span class="katex">${latex}</span>`,
    };

    it("toHTML deve lançar erro se o katex for inválido", () => {
        const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
        assertThrows(() => res.toHTML({} as any), CalcAUYError, "O módulo 'katex' é obrigatório");
    });

    it("toHTML deve gerar HTML com CSS e rastro de auditoria", () => {
        const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
        const html = res.toHTML(mockKatex, { decimalPrecision: 2 });

        assertStringIncludes(html, '<div class="calc-auy-result"');
        assertStringIncludes(html, 'aria-label="10 mais 5 é igual a 15 vírgula 00');
        assertStringIncludes(html, "<style>");
        assertStringIncludes(html, ".calc-auy-result { margin: 1em 0; overflow-x: auto; }");
        // Check audit trail in LaTeX
        assertStringIncludes(html, "\\text{round}_{\\text{NBR}}(10 + 5, 2) = 15.00");
    });

    it("toImageBuffer deve gerar um buffer contendo SVG com rastro e metadados", () => {
        const res = CalcAUY.from(10).add(5).commit({ roundStrategy: "NBR5891" });
        const buffer = res.toImageBuffer(mockKatex, { decimalPrecision: 2 });
        const svg = new TextDecoder().decode(buffer);

        assertStringIncludes(svg, "<svg");
        assertStringIncludes(svg, 'viewBox="0 0');
        assertStringIncludes(svg, 'aria-label="10 mais 5 é igual a 15 vírgula 00');
        assertStringIncludes(svg, "<title>10 mais 5 é igual a 15 vírgula 00");
        assertStringIncludes(svg, "<foreignObject");
        assertStringIncludes(svg, "\\text{round}_{\\text{NBR}}(10 + 5, 2) = 15.00");
    });

    it("toImageBuffer deve ajustar altura para frações e raízes", () => {
        const res = CalcAUY.from(10).div(3).commit({ roundStrategy: "HALF_UP" });
        const buffer = res.toImageBuffer(mockKatex);
        const svg = new TextDecoder().decode(buffer);

        // Heurística de altura deve ser maior que 80 para frações
        const heightMatch = svg.match(/height="(\d+)"/);
        const height = heightMatch ? parseInt(heightMatch[1]) : 0;
        assertEquals(height >= 80, true);
    });
});
