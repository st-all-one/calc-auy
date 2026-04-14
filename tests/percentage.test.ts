import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@src/builder.ts";

describe("CalcAUY - Suporte a Percentual", () => {
    it("deve aceitar percentual na ingestão direta via from()", () => {
        const res = CalcAUY.from("10%").commit();
        assertEquals(res.toStringNumber({ decimalPrecision: 2 }), "0.10");

        // Verifica normalização do rastro
        const trace = JSON.parse(res.toAuditTrace());
        assertEquals(trace.ast.originalInput, "10/100");
    });

    it("deve aceitar percentual com decimais e underscores", () => {
        const res = CalcAUY.from("1_000.5%").commit();
        assertEquals(res.toStringNumber({ decimalPrecision: 3 }), "10.005");
    });

    it("deve parsear percentual em expressões matemáticas como sufixo", () => {
        // 10% + 5 = 0.1 + 5 = 5.1
        const res = CalcAUY.parseExpression("10% + 5").commit();
        assertEquals(res.toStringNumber({ decimalPrecision: 1 }), "5.1");
    });

    it("deve manter o funcionamento do operador de módulo (infix)", () => {
        // 10 % 3 = 1
        const res = CalcAUY.parseExpression("10 % 3").commit();
        assertEquals(res.toStringNumber({ decimalPrecision: 0 }), "1");
    });

    it("deve lidar com casos ambíguos sem espaços", () => {
        // 10% de 5 (não suportado como justaposição, deve ser erro ou módulo se houver operando)
        // 10% + 5% = 0.1 + 0.05 = 0.15
        const res = CalcAUY.parseExpression("10% + 5%").commit();
        assertEquals(res.toStringNumber({ decimalPrecision: 2 }), "0.15");
    });
});
