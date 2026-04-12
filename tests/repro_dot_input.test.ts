
import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { CalcAUY } from "../src/builder.ts";
import katex from "npm:katex@^0.16.40";

describe("Repro: Normalização de Input com Ponto Inicial", () => {
    it("deve renderizar '.5' como '0.5' em Unicode e LaTeX", () => {
        const res = CalcAUY.from(".5").add(10).commit();
        
        // Unicode
        assertEquals(res.toUnicode().includes("0.5"), true, "Deveria conter 0.5 no Unicode");
        assertEquals(res.toUnicode().includes(" .5"), false, "Não deveria conter .5 isolado");

        // LaTeX
        assertStringIncludes(res.toLaTeX(), "0.5");
    });

    it("deve renderizar '-.5' como '-0.5'", () => {
        const res = CalcAUY.from("-.5").commit();
        assertEquals(res.toUnicode().includes("-0.5"), true);
    });

    it("deve propagar a correção para o HTML (KaTeX)", () => {
        const res = CalcAUY.from(".5").commit();
        const html = res.toHTML(katex);
        // Verifica se o valor normalizado 0.5 aparece no aria-label em vez de .5
        assertStringIncludes(html, 'aria-label="0.5 é igual a');
    });

    it("não deve afetar frações explícitas", () => {
        const res = CalcAUY.from("1/2").commit();
        assertStringIncludes(res.toLaTeX(), "frac{1}{2}");
    });
});
