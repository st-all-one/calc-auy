/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { CalcAUY } from "@src/main.ts";
import { CalcAUYError } from "@src/core/errors.ts";
import { BIRTH_TICKET_MOCK } from "@src/core/constants.ts";

describe("Security: Cryptographic Integrity & Determinism", () => {
    const salt = "security-secret-2026";
    const fixedTime = "2026-05-01T10:00:00.000Z";

    it("deve gerar assinaturas determinísticas usando BIRTH_TICKET_MOCK", async () => {
        // @ts-ignore: Usando symbol interno para teste
        const Vault = CalcAUY.create({
            contextLabel: "deterministic-vault",
            salt: salt,
            [BIRTH_TICKET_MOCK]: fixedTime,
        });

        const calc = Vault.from(100).add(50);
        const h1 = await calc.hibernate();
        const s1 = JSON.parse(h1).signature;

        // Simula passagem de tempo
        await new Promise((r) => setTimeout(r, 10));

        const h2 = await calc.hibernate();
        const s2 = JSON.parse(h2).signature;

        assertEquals(s1, s2, "Assinaturas devem ser idênticas independentemente do momento da hibernação");
        assertEquals(JSON.parse(h1).ast.metadata.timestamp, fixedTime);
    });

    it("deve detectar adulteração de dados durante a hidratação (Integridade BLAKE3)", async () => {
        const Vault = CalcAUY.create({ contextLabel: "v", salt });
        const original = await Vault.from(1000).setMetadata("status", "approved").hibernate();

        // Ataque: Altera o valor de 1000 para 9000 no JSON assinado
        const tampered = original.replace('"1000"', '"9000"');

        await assertRejects(
            () => Vault.hydrate(tampered),
            CalcAUYError,
            "Integrity violation during hydration",
        );
    });

    it("deve verificar integridade via método estático checkIntegrity", async () => {
        const Vault = CalcAUY.create({ contextLabel: "v", salt });
        const output = await Vault.from(500).commit();
        const auditTrace = output.toAuditTrace();

        const isValid = await CalcAUY.checkIntegrity(auditTrace, { salt });
        assertEquals(isValid, true);

        // Falha com salt errado
        await assertRejects(
            () => CalcAUY.checkIntegrity(auditTrace, { salt: "wrong-salt" }),
            CalcAUYError,
            "Integrity violation detected",
        );
    });

    it("deve validar a integridade do rastro de auditoria (commit trace)", async () => {
        const Vault = CalcAUY.create({ contextLabel: "v", salt, roundStrategy: "TRUNCATE" });
        const output = await Vault.from(100).add(50).commit();
        const auditTrace = output.toAuditTrace();

        // Deve hidratar com sucesso
        const rehydrated = await Vault.hydrate(auditTrace);
        assertEquals((await rehydrated.commit()).toStringNumber(), "150.00");

        // Violação na estratégia de arredondamento no rastro
        const corruptedTrace = auditTrace.replace('"TRUNCATE"', '"NBR5891"');
        await assertRejects(
            () => Vault.hydrate(corruptedTrace),
            CalcAUYError,
            "Integrity violation during hydration",
        );
    });
});
