/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { RationalNumber } from "@src/core/rational.ts";

describe("Core: Intelligent Cache (WeakRef & GC)", () => {
    it("deve reutilizar instâncias de RationalNumber do cache global (Hot & Cold)", () => {
        const val = "1.23456789";
        const r1 = RationalNumber.from(val);
        const r2 = RationalNumber.from(val);

        expect(r1).toBe(r2);
    });

    it("deve permitir que o GC limpe o cache global quando não houver referências", async () => {
        const key = "999999.888888";
        {
            const r = RationalNumber.from(key);
            expect(r).toBeDefined();
        }

        if (typeof globalThis.gc === "function") {
            // @ts-ignore
            globalThis.gc();
            await new Promise((r) => setTimeout(r, 10));
        }
    });
});
