/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@src/main.ts";

describe("Audit: Forensic Integrity & Scale", () => {
    const salt = "forensic-audit-2026";
    const Auditor = CalcAUY.create({ contextLabel: "forensic", salt, roundStrategy: "HALF_EVEN" });

    it("deve garantir re-hidratação bit-perfect de cálculos complexos", async () => {
        // Cálculo com múltiplos passos, metadados e arredondamento customizado
        const original = await Auditor.from("1234.567")
            .mult("1.05")
            .setMetadata("invoice", "INV-999")
            .commit();

        const auditTrace = original.toAuditTrace();

        // Simula armazenamento e recuperação (Hydrate)
        const restored = await Auditor.hydrate(auditTrace);
        const result = await restored.commit();

        const resultData = JSON.parse(result.toAuditTrace());
        const originalData = JSON.parse(auditTrace);

        assertEquals(resultData.finalResult, originalData.finalResult, "O resultado final deve ser idêntico");
        assertEquals(
            resultData.roundStrategy,
            originalData.roundStrategy,
            "A estratégia de arredondamento deve ser preservada",
        );
        assertEquals(result.toStringNumber(), original.toStringNumber());
    });

    it("deve registrar o evento de reanimação no rastro", async () => {
        const h1 = await Auditor.from(100).hibernate();
        const restored = await Auditor.hydrate(h1);
        const output = await restored.add(50).commit();

        const trace = output.toLiveTrace();
        // O primeiro operando deve ser um nó de controle de reanimação
        // @ts-ignore
        assertEquals(trace.ast.operands[0].kind, "group");
        // @ts-ignore
        assertEquals(trace.ast.operands[0].child.type, "reanimation_event");
        // @ts-ignore
        assertEquals(trace.ast.operands[0].child.metadata.previousContextLabel, "forensic");
    });

    it("deve suportar integração Cross-Context via fromExternalInstance", async () => {
        const Branch = CalcAUY.create({ contextLabel: "branch-a", salt: "s1" });
        const HQ = CalcAUY.create({ contextLabel: "hq", salt: "s2" });

        const branchCalc = await Branch.from(1000).setMetadata("dept", "sales").hibernate();

        // HQ importa o cálculo assinado da Branch
        const hqCalc = await HQ.fromExternalInstance(branchCalc);
        const result = await hqCalc.add(200).commit();

        assertEquals(result.toStringNumber(), "1200.00");

        const trace = result.toLiveTrace();
        // Verifica o handover no rastro
        // @ts-ignore
        assertEquals(trace.ast.operands[0].child.metadata.previousContextLabel, "branch-a");
    });
});
