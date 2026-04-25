/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { CalcAUY } from "../mod.ts";
import { BIRTH_TICKET_MOCK } from "../src/core/symbols.ts";

Deno.test("Deterministic Signature - Birth Certificate Pattern", async (t) => {
    const fixedTime = "2026-04-23T10:00:00.000Z";

    // @ts-ignore: Usando symbol interno para teste
    const instance = CalcAUY.create({
        contextLabel: "determinismo",
        salt: "S1",
        [BIRTH_TICKET_MOCK]: fixedTime,
    });

    await t.step("should generate same signature regardless of when hibernate is called", async () => {
        const calc = instance.from(100).add(50);

        const h1 = await calc.hibernate();
        const s1 = JSON.parse(h1).signature;

        // Simula passagem de tempo (embora hibernate não use mais Date.now())
        await new Promise((r) => setTimeout(r, 10));

        const h2 = await calc.hibernate();
        const s2 = JSON.parse(h2).signature;

        assertEquals(s1, s2, "Assinaturas devem ser idênticas");
        assertEquals(JSON.parse(h1).data.metadata.timestamp, fixedTime);
    });

    await t.step("should preserve birth timestamp through hydration", async () => {
        const original = await instance.from(50).hibernate();

        // Simula reidratação em outro momento
        const restored = await instance.hydrate(original);
        const hibernatedRestored = await restored.hibernate();

        // A assinatura deve mudar porque o hydrate envolve em um nó 'control'
        // MAS o timestamp dentro do 'control.child' deve ser o original
        const ast: any = JSON.parse(hibernatedRestored).data;
        assertEquals(ast.kind, "control");
        assertEquals(ast.child.metadata.timestamp, fixedTime);
    });
});
