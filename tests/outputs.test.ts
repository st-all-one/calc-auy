import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Outputs Exaustivos (Unit)", () => {
    const calc = CurrencyNBR.from(100.50).add(50.25);
    const output = calc.commit(2);

    describe("toString", () => {
        it("deve retornar o valor formatado com a precisão correta", () => {
            expect(output.toString()).toBe("150.75");
        });

        it("deve respeitar arredondamentos diferentes no output", () => {
            const out = CurrencyNBR.from("10.555").commit(2, { roundingMethod: "TRUNCATE" });
            expect(out.toString()).toBe("10.55");
        });
    });

    describe("toFloatNumber", () => {
        it("deve converter para number do JS mantendo precisão do output", () => {
            expect(output.toFloatNumber()).toBe(150.75);
            expect(typeof output.toFloatNumber()).toBe("number");
        });
    });

    describe("toBigInt", () => {
        it("deve retornar o valor bruto escalado (10^12)", () => {
            const raw = output.toBigInt();
            expect(typeof raw).toBe("bigint");
            // 150.75 * 10^12 = 150750000000000
            expect(raw.toString()).toBe("150750000000000");
        });
    });

    describe("toMonetary", () => {
        it("deve formatar como Real Brasileiro por padrão", () => {
            // No Deno, o Intl pode variar o espaço entre o R$ e o número dependendo do ambiente
            // Mas o conteúdo básico deve estar lá
            const monetary = output.toMonetary();
            expect(monetary).toContain("R$");
            expect(monetary).toContain("150,75");
        });

        it("deve suportar outros locales (ex: en-US)", () => {
            const outUS = calc.commit(2, { locale: "en-US" });
            const monetary = outUS.toMonetary();
            expect(monetary).toContain("$");
            expect(monetary).toContain("150.75");
        });
    });

    describe("toLaTeX", () => {
        it("deve gerar uma expressão LaTeX válida com delimitadores", () => {
            const latex = output.toLaTeX();
            expect(latex.startsWith("$$")).toBe(true);
            expect(latex.endsWith("$$")).toBe(true);
            expect(latex).toContain("100.5 + 50.25");
            expect(latex).toContain("=");
            expect(latex).toContain("150.75");
        });
    });

    describe("toUnicode", () => {
        it("deve gerar uma expressão Unicode legível", () => {
            const unicode = output.toUnicode();
            expect(unicode).toContain("100.5 + 50.25");
            expect(unicode).toContain("=");
            expect(unicode).toContain("150.75");
        });
    });

    describe("toVerbalA11y", () => {
        it("deve gerar narração verbal acessível em PT-BR (Padrão)", () => {
            const verbal = output.toVerbalA11y();
            expect(verbal).toContain("100 vírgula 5");
            expect(verbal).toContain("mais");
            expect(verbal).toContain("50 vírgula 25");
            expect(verbal).toContain("é igual a");
        });

        it("deve gerar narração verbal para todos os idiomas suportados", () => {
            const locales = ["pt-BR", "en-US", "en-EU", "es-ES", "fr-FR", "zh-CN", "ru-RU", "ja-JP"] as const;
            
            for (const locale of locales) {
                const outLocale = calc.commit(2, { locale });
                const verbal = outLocale.toVerbalA11y();
                expect(verbal).toBeDefined();
                expect(typeof verbal).toBe("string");
                expect(verbal.length).toBeGreaterThan(0);
                
                // Verifica se contém o termo de igualdade correto por língua
                if (locale === "pt-BR") expect(verbal).toContain(" é igual a ");
                if (locale === "en-US" || locale === "en-EU") expect(verbal).toContain(" equals ");
                if (locale === "es-ES") expect(verbal).toContain(" es igual a ");
                if (locale === "fr-FR") expect(verbal).toContain(" est égal à ");
                if (locale === "zh-CN") expect(verbal).toContain(" 等于 ");
                if (locale === "ru-RU") expect(verbal).toContain(" равно ");
                if (locale === "ja-JP") expect(verbal).toContain(" は ");
            }
        });
    });

    describe("toHTML", () => {
        it("deve conter a expressão LaTeX e narração verbal", () => {
            const html = output.toHTML();
            expect(html).toContain("<div");
            expect(html).toContain("100.5 + 50.25"); // O conteúdo LaTeX
            expect(html).toContain("aria-label"); // Narração verbal para SR
        });
    });

    describe("toImageBuffer", () => {
        it("deve retornar um Uint8Array", () => {
            const buffer = output.toImageBuffer();
            expect(buffer).toBeInstanceOf(Uint8Array);
            expect(buffer.length).toBeGreaterThan(0);
        });
    });

    describe("toJson", () => {
        it("deve retornar todos os outputs por padrão em formato string JSON", () => {
            const jsonStr = output.toJson();
            const data = JSON.parse(jsonStr);
            
            expect(data.meta).toBeDefined();
            expect(data.toString).toBe("150.75");
            expect(data.toFloatNumber).toBe(150.75);
            expect(data.toMonetary).toBeDefined();
            expect(data.toLaTeX).toBeDefined();
            expect(data.toUnicode).toBeDefined();
            expect(data.toVerbalA11y).toBeDefined();
            expect(data.toImageBuffer).toBeInstanceOf(Array); // Convertido para array no JSON
        });

        it("deve retornar apenas elementos selecionados", () => {
            const jsonStr = output.toJson(["toString", "toBigInt"]);
            const data = JSON.parse(jsonStr);
            
            expect(data.toString).toBe("150.75");
            expect(data.toBigInt).toBe("150750000000000");
            expect(data.toFloatNumber).toBeUndefined();
            expect(data.toMonetary).toBeUndefined();
        });
    });
});
