import { describe, it } from "@std/testing/bdd";
import { assert, assertStringIncludes } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { imageBufferProcessor } from "@processor/image-buffer/processor.imagebuffer.ts";

describe("Processor: ImageBuffer", () => {
    it("deve gerar um Uint8Array contendo um SVG válido", async () => {
        const Calc = CalcAUY.create({ contextLabel: "img-test", salt: "s1" });
        const res = await Calc.from(100).div(3).commit();

        const buffer = res.toCustomOutput(imageBufferProcessor);
        assert(buffer instanceof Uint8Array);

        const svg = new TextDecoder().decode(buffer);
        assertStringIncludes(svg, "<svg");
        assertStringIncludes(svg, "foreignObject");
        assertStringIncludes(svg, "katex"); // Conteúdo HTML dentro do SVG
    });
});
