/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts";
import { CalcAUY } from "../mod.ts";

Deno.test("Instance Control - Isolation and Branding", async (t) => {
    const Finance = CalcAUY.create({ contextLabel: "finance", salt: "secret1" });
    const Logistic = CalcAUY.create({ contextLabel: "logistic", salt: "secret2" });

    await t.step("should prevent mixing instances in standard operations", () => {
        const f = Finance.from(100);
        const l = Logistic.from(50);

        // This would be a TS error, but we test runtime error
        assertRejects(
            async () => {
                // @ts-ignore: Intentionally mixing contexts
                f.add(l);
            },
            Error,
            "Tentativa de misturar instâncias de contextos diferentes",
        );
    });

    await t.step("should allow integration via fromExternalInstance", async () => {
        const f = Finance.from(100);
        const l = Logistic.from(50);

        const combined = await f.fromExternalInstance(l);
        const result = await combined.commit();

        assertEquals(result.toStringNumber({ decimalPrecision: 0 }), "150");

        const trace = JSON.parse(result.toAuditTrace());
        // A AST deve conter o nó de controle
        const ast = trace.ast;
        assertEquals(ast.type, "crossContextAdd");
        assertEquals(ast.operands[1].kind, "group");
        assertEquals(ast.operands[1].child.kind, "control");
        assertEquals(ast.operands[1].child.metadata.previousContextLabel, "logistic");
    });

    await t.step("should work as a starting point (Direct Integration)", async () => {
        const l = Logistic.from(50);
        // Finance começa direto importando de Logistic
        const combined = await Finance.fromExternalInstance(l);
        const result = await combined.mult(2).commit();

        assertEquals(result.toStringNumber({ decimalPrecision: 0 }), "100");

        const trace = JSON.parse(result.toAuditTrace());
        const ast = trace.ast;
        // Raiz deve ser a multiplicação
        assertEquals(ast.type, "mul");
        // O primeiro operando deve ser o nó control direto (sem 0 + ...)
        assertEquals(ast.operands[0].kind, "control");
        assertEquals(ast.operands[0].metadata.previousContextLabel, "logistic");
        assertEquals(ast.operands[0].metadata.timestamp !== undefined, true, "Deve ter timestamp de nascimento");
    });
});

Deno.test("Instance Control - Reanimation (Hydrate)", async (t) => {
    const context = CalcAUY.create({ contextLabel: "audit", salt: "audit_salt" });

    await t.step("should wrap hydrated AST in a control node", async () => {
        const original = await context.from(500).hibernate();
        const hydrated = await context.hydrate(original);

        const result = await hydrated.add(100).commit();
        assertEquals(result.toStringNumber({ decimalPrecision: 0 }), "600");

        const trace = JSON.parse(result.toAuditTrace());
        // O valor original (500) deve estar dentro de um nó control
        const ast = trace.ast;
        assertEquals(ast.type, "add");
        assertEquals(ast.operands[0].kind, "control");
        assertEquals(ast.operands[0].type, "reanimation_event");
        assertEquals(ast.operands[0].metadata.previousSignature !== undefined, true);
    });
});

Deno.test("Instance Control - Security Policy Isolation", async (t) => {
    const Secure = CalcAUY.create({ contextLabel: "secure", salt: "s1", sensitive: true });
    const Public = CalcAUY.create({ contextLabel: "public", salt: "s2", sensitive: false });

    await t.step("should respect individual sensitivity policies in logs/sanitization", async () => {
        const s = Secure.from(100).setMetadata("pii", "secret_data");
        const p = Public.from(200).setMetadata("info", "public_data");

        // hibernate internally uses signature which uses salt/encoder.
        // commit also uses them.
        const resS = await s.commit();
        const resP = await p.commit();

        const traceS = JSON.parse(resS.toAuditTrace());
        const traceP = JSON.parse(resP.toAuditTrace());

        // As assinaturas devem ser diferentes mesmo se os dados fossem iguais (por causa do salt)
        // Aqui os dados são diferentes, mas o ponto é a independência.

        assertEquals(traceS.signature !== traceP.signature, true);
    });

    await t.step("IDE Safety - should distinguish instances with same label but different params", () => {
        const Calc1 = CalcAUY.create({ contextLabel: "finance", salt: "S1" });
        const Calc2 = CalcAUY.create({ contextLabel: "finance", salt: "S2" });

        // Isso agora deve ser um erro de tipo capturado pelo compilador
        // E também deve gerar erro de runtime
        assertRejects(
            async () => {
                // @ts-expect-error: Diferentes salts criam tipos diferentes na IDE
                await Calc1.from(10).add(Calc2.from(5));
            },
            Error,
            "Tentativa de misturar instâncias de contextos diferentes",
        );
    });
});
