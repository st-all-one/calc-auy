import { describe, it } from "@std/testing/bdd";
import { assertStringIncludes } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { htmlProcessor } from "@processor/html/processor.html.ts";

describe("Processor: HTML", () => {
    it("deve gerar rastro HTML completo usando KaTeX e CSS inlined", async () => {
        const Calc = CalcAUY.create({ contextLabel: "html-test", salt: "s1" });
        const res = await Calc.from(10).add(5).commit();

        const html = res.toCustomOutput(htmlProcessor);

        assertStringIncludes(html, '<div class="calc-auy-result"');
        assertStringIncludes(html, "aria-label=");
        assertStringIncludes(html, "katex"); // Conteúdo renderizado pelo katex
        assertStringIncludes(html, ".calc-auy-result {"); // Estilo customizado
        assertStringIncludes(html, "base64,d09GMgABAAAA"); // CSS com fontes embutidas
    });
});
