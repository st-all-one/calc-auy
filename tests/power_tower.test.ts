import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { describe, it } from "@std/testing/bdd";
import { CalcAUD } from "../src/main.ts";

describe("CalcAUD - Torres de Potência e Cenários Complexos", () => {
    it("deve respeitar a associatividade à direita em torres de potência (2^3^2 = 512)", () => {
        // Matematicamente: 2^(3^2) = 2^9 = 512
        // Se fosse linear (2^3)^2 = 8^2 = 64
        const res = CalcAUD.from(2).pow(3).pow(2).commit(0);
        
        console.log("Power Tower LaTeX:", res.toLaTeX());
        console.log("Power Tower Unicode:", res.toUnicode());
        
        assertEquals(res.toString(), "512");
    });

    it("deve validar o cenário aninhado proposto resultando em 105628", () => {
        // Fórmula: 3 + (5 + 5 * 4^3)^2
        // Cálculo: 4^3 = 64 -> 5 * 64 = 320 -> 5 + 320 = 325 -> 325^2 = 105625 -> 3 + 105625 = 105628
        
        const inner = CalcAUD.from(5).add(5).mult(4).pow(3);
        const res = CalcAUD.from(3).add(inner).pow(2).commit(0);
        
        console.log("Complex Scenario Result:", res.toString());
        assertEquals(res.toString(), "105628");
    });

    it("deve permitir torres de altura 3 (2^2^2^2 = 2^65536... não, 2^16 = 65536)", () => {
        // 2^(2^(2^2)) = 2^(2^4) = 2^16 = 65536
        const res = CalcAUD.from(2).pow(2).pow(2).pow(2).commit(0);
        assertEquals(res.toString(), "65536");
    });
});
