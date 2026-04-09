import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { CalcAUY } from "../src/builder.ts";
import { sanitizeAST, sanitizeObject } from "../src/utils/sanitizer.ts";

describe("Telemetria e Proteção de PII (Security by Default)", () => {
    it("deve ocultar dados por padrão (sensitive: true)", () => {
        CalcAUY.setLoggingPolicy({ sensitive: true });
        const calc = CalcAUY.from(100);
        const sanitized = sanitizeAST(calc.getAST()) as any;
        expect(sanitized.value).toBe("[PII]");
    });

    it("deve mostrar PII quando a política global sensitive for false", () => {
        CalcAUY.setLoggingPolicy({ sensitive: false });
        const calc = CalcAUY.from(100);
        const sanitized = sanitizeAST(calc.getAST()) as any;
        expect(sanitized.value.n).toBe("100");
        
        // Reset para padrão seguro
        CalcAUY.setLoggingPolicy({ sensitive: true });
    });

    it("deve ocultar um nó específico com pii: true mesmo com política sensitive: false", () => {
        CalcAUY.setLoggingPolicy({ sensitive: false });
        const calc = CalcAUY.from(100).setMetadata("pii", true);
        const sanitized = sanitizeAST(calc.getAST()) as any;
        expect(sanitized.value).toBe("[PII]");
        
        CalcAUY.setLoggingPolicy({ sensitive: true });
    });

    it("deve mostrar um nó específico com pii: false mesmo com política sensitive: true", () => {
        CalcAUY.setLoggingPolicy({ sensitive: true });
        const calc = CalcAUY.from(100).setMetadata("pii", false);
        const sanitized = sanitizeAST(calc.getAST()) as any;
        expect(sanitized.value.n).toBe("100");
    });

    it("deve permitir controle fluente de política no output", () => {
        const output = CalcAUY.from(10).add(5).commit();
        
        // Ativando exibição (sensitive: false -> não é sensível)
        output.setLoggingPolicy({ sensitive: false });
        const context = { value: 100 };
        expect(sanitizeObject(context)).toEqual({ value: 100 });

        // Voltando para ocultação (sensitive: true -> é sensível)
        output.setLoggingPolicy({ sensitive: true });
        expect(sanitizeObject(context)).toEqual({ value: "[PII]" });
    });

    it("deve respeitar a política global na sanitização de objetos de erro", () => {
        CalcAUY.setLoggingPolicy({ sensitive: true });
        const context = { rawInput: "123.45" };
        expect(sanitizeObject(context)).toEqual({ rawInput: "[PII]" });

        CalcAUY.setLoggingPolicy({ sensitive: false });
        expect(sanitizeObject(context)).toEqual({ rawInput: "123.45" });
        
        CalcAUY.setLoggingPolicy({ sensitive: true });
    });
});
