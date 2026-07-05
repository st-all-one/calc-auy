import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { CalcAUY } from "@src/main.ts";
import { CalcAUYError } from "@src/core/errors.ts";
import { BIRTH_TICKET_MOCK } from "@src/core/constants.ts";

describe("Builder: Persistence (Hibernate/Hydrate)", () => {
    const System = CalcAUY.create({
        contextLabel: "persistence-test",
        salt: "secret-key",
        roundStrategy: "NBR5891",
    });

    it("deve hibernar e hidratar um cálculo mantendo a integridade", async () => {
        const original = System.from(1000).add(500).setMetadata("test", true);
        const signedJson = await original.hibernate();

        const restored = await System.hydrate(signedJson);
        const result = await restored.mult(2).commit();

        // (1000 + 500) * 2 = 3000
        assertEquals(result.toStringNumber(), "3000.00");
    });

    it("deve lançar erro se a assinatura for violada", async () => {
        const original = System.from(100);
        const signedData = JSON.parse(await original.hibernate());

        // Violação maliciosa: muda o valor no AST mas mantém a assinatura antiga
        signedData.ast.value.n = "999999";

        await assertRejects(
            () => System.hydrate(signedData),
            CalcAUYError,
            "Integrity violation during hydration.",
        );
    });

    it("deve suportar hidratação a partir de um Audit Trace (commit)", async () => {
        const output = await System.from(100).add(20).commit();
        const auditTrace = output.toAuditTrace();

        const resumed = await System.hydrate(auditTrace);
        const final = await resumed.add(5).commit();

        assertEquals(final.toStringNumber(), "125.00");
    });

    it("deve registrar evento de reanimação no rastro de auditoria", async () => {
        const signed = await System.from(100).hibernate();
        const restored = await System.hydrate(signed);
        const output = await restored.commit();

        const trace = output.toLiveTrace();
        // O nó raiz de um hidratado deve ser um grupo contendo um control node de reanimation
        assertEquals(trace.ast.kind, "group");
        // @ts-ignore: Navegando na AST para teste
        assertEquals(trace.ast.child.kind, "control");
        // @ts-ignore: Navegando na AST para teste
        assertEquals(trace.ast.child.type, "reanimation_event");
    });

    it("deve suportar fromExternalInstance para integração entre contextos", async () => {
        const Branch = CalcAUY.create({ contextLabel: "branch-ny", salt: "branch-secret" });
        const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master-salt" });

        // Branch faz um cálculo
        const branchCalc = Branch.from(1000).add(200).setMetadata("dept", "sales");

        // HQ incorpora o cálculo da Branch
        const hqCalc = await HQ.fromExternalInstance(branchCalc);
        const result = await hqCalc.add(100).commit();

        assertEquals(result.toStringNumber(), "1300.00");

        // Verifica se o rastro contém o handover
        const trace = result.toLiveTrace();
        // O nó raiz deve ser a operação 'add' (o + 100)
        assertEquals(trace.ast.kind, "operation");
        // @ts-ignore
        assertEquals(trace.ast.type, "add");

        // O primeiro operando deve ser o grupo que contém o reanimation_event
        // @ts-ignore
        const reanimationGroup = trace.ast.operands[0];
        assertEquals(reanimationGroup.kind, "group");
        assertEquals(reanimationGroup.child.type, "reanimation_event");
        assertEquals(reanimationGroup.child.metadata.previousContextLabel, "branch-ny");
    });

    it("deve suportar fromExternalInstance a partir de uma string JSON assinada", async () => {
        const Branch = CalcAUY.create({ contextLabel: "branch-ny", salt: "branch-secret" });
        const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master-salt" });

        const signed = await Branch.from(500).hibernate();

        const hqCalc = await HQ.fromExternalInstance(signed);
        const result = await hqCalc.mult(2).commit();

        assertEquals(result.toStringNumber(), "1000.00");
    });

    it("deve lançar erro em fromExternalInstance se a assinatura estiver ausente", async () => {
        const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master-salt" });
        const invalidData = { ast: { kind: "literal", value: { n: "100", d: "1" } } };

        await assertRejects(
            () => HQ.fromExternalInstance(invalidData),
            CalcAUYError,
            "External instance missing integrity signature.",
        );
    });

    it("deve manter metadados originais após hibernação e hidratação", async () => {
        const original = System.from(100).setMetadata("owner", "alice");
        const signed = await original.hibernate();

        const restored = await System.hydrate(signed);
        const output = await restored.commit();
        const trace = output.toLiveTrace();

        // Os metadados devem estar dentro do nó literal que foi reanimado
        // @ts-ignore
        assertEquals(trace.ast.child.child.metadata.owner, "alice");
    });

    it("deve persistir o timestamp de nascimento (birth ticket) se disponível", async () => {
        const birth = "2026-05-01T10:00:00.000Z";
        const CustomSystem = CalcAUY.create({
            contextLabel: "c1",
            salt: "s1",
            [BIRTH_TICKET_MOCK]: birth,
        });

        const original = CustomSystem.from(100);
        const signed = await original.hibernate();
        const data = JSON.parse(signed);

        assertEquals(data.ast.metadata.timestamp, birth);

        const restored = await CustomSystem.hydrate(signed);
        const output = await restored.commit();
        const trace = output.toLiveTrace();

        assertEquals(trace.ast.metadata?.timestamp, birth);
    });
});
