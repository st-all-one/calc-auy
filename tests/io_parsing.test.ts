import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CurrencyNBR } from "../mod.ts";

describe("Parsing e I/O (Unit)", () => {
    describe("Sanitização de Entrada", () => {
        it("deve fazer parse de string com vírgula (formato BR: '1.234,56')", () => {
            const result = CurrencyNBR.from("1.234,56").commit(2);
            expect(result.toString()).toBe("1234.56");
        });

        it("deve fazer parse de string com ponto (formato US: '1,234.56')", () => {
            const result = CurrencyNBR.from("1,234.56").commit(2);
            expect(result.toString()).toBe("1234.56");
        });

        it("deve fazer parse de inteiro nativo do JS", () => {
            const result = CurrencyNBR.from(1234).commit(0);
            expect(result.toString()).toBe("1234");
        });

        it("deve fazer parse de float nativo do JS", () => {
            const result = CurrencyNBR.from(1234.56).commit(2);
            expect(result.toString()).toBe("1234.56");
        });

        it("deve fazer parse direto de BigInt (já escalado)", () => {
            // Se passar BigInt, a lib multiplica pelo SCALE_FACTOR
            const result = CurrencyNBR.from(100n).commit(0);
            expect(result.toString()).toBe("100");
        });

        it("deve rejeitar strings malformadas ('1.23.4')", () => {
            expect(() => CurrencyNBR.from("1.23.4")).toThrow();
        });

        it("deve rejeitar strings não numéricas ('abc')", () => {
            expect(() => CurrencyNBR.from("abc")).toThrow();
        });
    });

    describe("Validação de Exportação (Auditoria)", () => {
        const calc = CurrencyNBR.from(100).add(50).div(2).pow(2).commit(2);

        it("deve validar a string exportada em LaTeX (verifica chaves e comandos)", () => {
            const latex = calc.toLaTeX();
            expect(latex).toContain("\\frac");
            expect(latex).toContain("^{2}");
            expect(latex).toContain("=");
            expect(latex.startsWith("$$")).toBe(true);
            expect(latex.endsWith("$$")).toBe(true);
        });

        it("deve validar a string exportada em Unicode (verifica símbolos ÷, ², √)", () => {
            const unicode = calc.toUnicode();
            expect(unicode).toContain("÷");
            expect(unicode).toContain("²");
            expect(unicode).toContain("=");
        });

        it("deve validar a string exportada Verbal (verifica conectivos e igualdade)", () => {
            const verbal = calc.toVerbalA11y();
            expect(verbal).toContain("mais");
            expect(verbal).toContain("dividido por");
            expect(verbal).toContain("elevado a");
            expect(verbal).toContain("é igual a");
        });
    });
});
