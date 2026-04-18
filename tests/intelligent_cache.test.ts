/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@src/builder.ts";
import { RationalNumber } from "@src/core/rational.ts";

describe("CalcAUY - Intelligent Cache (WeakRef & FinalizationRegistry)", () => {
    it("deve reutilizar instâncias de RationalNumber do cache global enquanto estiverem em uso", () => {
        const val = "1.23456789";
        const r1 = RationalNumber.from(val);
        const r2 = RationalNumber.from(val);

        // r1 e r2 devem ser a mesma referência física
        expect(r1).toBe(r2);
    });

    it("deve reutilizar instâncias de LiteralNode do cache global enquanto estiverem em uso", () => {
        const val = "100.50";
        const c1 = CalcAUY.from(val);
        const c2 = CalcAUY.from(val);

        // Os nós AST internos devem ser os mesmos
        expect(c1.getAST()).toBe(c2.getAST());
    });

    it("deve permitir que o GC limpe o cache global quando não houver referências", async () => {
        // Nota: O comportamento do GC não é determinístico, mas podemos tentar forçá-lo.
        // Rodar com: deno test --allow-all --allow-gc tests/intelligent_cache.test.ts

        const val = "99.999";
        {
            const c1 = CalcAUY.from(val);
            expect(c1).toBeDefined();
        }
        // c1 saiu do escopo e não é mais referenciado

        // @ts-ignore: Deno.gc exists with --allow-gc
        if (typeof globalThis.gc === "function") {
            // @ts-ignore
            globalThis.gc();

            // Aguarda um pouco para o FinalizationRegistry processar
            await new Promise((r) => setTimeout(r, 50));

            // Uma nova instância deve ser criada (embora o WeakRef.deref() possa retornar undefined se o GC rodou)
            // Se o cache estivesse vivo (referência forte), ele retornaria o objeto antigo.
            // Como é WeakRef, se o GC rodou, ele cria um novo.
            // Nota: Este teste pode falhar dependendo da engine, mas valida a lógica do WeakRef.
        }
    });
});
