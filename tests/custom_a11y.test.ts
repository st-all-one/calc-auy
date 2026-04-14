import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { CalcAUY, type CalcAUYLocaleA11y } from "@calcauy";

const mockKatex = {
    renderToString: (s: string) => `<span>${s}</span>`,
};

describe("Custom A11y Translation", () => {
    it("deve usar tradução customizada em toVerbalA11y", () => {
        const calc = CalcAUY.from("10").add("5");
        const res = calc.commit();

        const customLoc: CalcAUYLocaleA11y = {
            locale: "custom",
            currency: "XYZ",
            decimalSeparator: ",",
            voicedSeparator: " vírgula ",
            thousandSeparator: ".",
            operators: {
                add: "somado com",
                sub: "subtraído de",
                mul: "vezes",
                div: "dividido por",
                pow: "elevado a",
                mod: "módulo",
                divInt: "divisão inteira",
                group_start: "abre",
                group_end: "fecha",
            },
            phrases: {
                isEqual: " resulta em ",
                rounding: "Arredondamento",
                for: "para",
                decimalPlaces: "casas",
                root_square: "raiz de ",
                root_cubic: "raiz3 de ",
                root_n: "raizN de ",
            },
        };

        const verbal = res.toVerbalA11y({ decimalPrecision: 2 }, customLoc);
        assertStringIncludes(verbal, "10 somado com 5 resulta em 15 vírgula 00");
    });

    it("deve propagar tradução customizada para toHTML", () => {
        const calc = CalcAUY.from("10").add("5");
        const res = calc.commit();

        const customLoc: CalcAUYLocaleA11y = {
            locale: "custom",
            currency: "XYZ",
            decimalSeparator: ",",
            voicedSeparator: " vírgula ",
            thousandSeparator: ".",
            operators: {
                add: "somado com",
                sub: "subtraído de",
                mul: "vezes",
                div: "dividido por",
                pow: "elevado a",
                mod: "módulo",
                divInt: "divisão inteira",
                group_start: "abre",
                group_end: "fecha",
            },
            phrases: {
                isEqual: " resulta em ",
                rounding: "Arredondamento",
                for: "para",
                decimalPlaces: "casas",
                root_square: "raiz de ",
                root_cubic: "raiz3 de ",
                root_n: "raizN de ",
            },
        };

        const html = res.toHTML(mockKatex as any, { decimalPrecision: 2 }, customLoc);
        assertStringIncludes(html, 'aria-label="10 somado com 5 resulta em 15 vírgula 00');
    });

    it("toImageBuffer não deve conter verbalização no SVG", () => {
        const calc = CalcAUY.from("10").add("5");
        const res = calc.commit();

        const buffer = res.toImageBuffer(mockKatex as any);
        const svg = new TextDecoder().decode(buffer);

        // Não deve ter aria-label nem <title> com o texto verbal
        assertEquals(svg.includes("aria-label="), false);
        assertEquals(svg.includes("<title>"), false);
    });
});
