import { assertRejects } from "https://deno.land/std/assert/mod.ts";
import { describe, it } from "https://deno.land/std/testing/bdd.ts";
import { CalcAUD } from "../mod.ts";
import { CalcAUDError } from "../src/errors.ts";

describe("CalcAUD error boundary", () => {
    const instance = CalcAUD.from(10);

    // Criamos um mock que simula um CalcAUD válido para o `from`,
    // mas que lança erro ao acessar o accumulatedValue durante a operação.
    const brokenInstance = Object.create(instance);
    Object.defineProperty(brokenInstance, "accumulatedValue", {
        get: () => { throw new Error("CRITICAL_SYSTEM_FAILURE"); }
    });
    Object.defineProperty(brokenInstance, "activeTermValue", { get: () => 0n });
    Object.defineProperty(brokenInstance, "accumulatedExpression", { get: () => "" });
    Object.defineProperty(brokenInstance, "activeTermExpression", { get: () => "" });
    Object.defineProperty(brokenInstance, "accumulatedVerbal", { get: () => "" });
    Object.defineProperty(brokenInstance, "activeTermVerbal", { get: () => "" });
    Object.defineProperty(brokenInstance, "accumulatedUnicode", { get: () => "" });
    Object.defineProperty(brokenInstance, "activeTermUnicode", { get: () => "" });

    const methods = [
        { name: "add", fn: () => instance.add(brokenInstance) },
        { name: "sub", fn: () => instance.sub(brokenInstance) },
        { name: "mult", fn: () => instance.mult(brokenInstance) },
        { name: "div", fn: () => instance.div(brokenInstance) },
        { name: "divInt", fn: () => instance.divInt(brokenInstance) },
        { name: "mod", fn: () => instance.mod(brokenInstance) },
    ];

    for (const method of methods) {
        it(`Should catch and re-throw generic error in ${method.name}`, async () => {
            await assertRejects(
                async () => {
                    method.fn();
                },
                Error,
                "CRITICAL_SYSTEM_FAILURE",
            );
        });
    }

    it("Should handle CalcAUDError in commit", async () => {
        await assertRejects(
            async () => {
                instance.commit(-1);
            },
            CalcAUDError,
            "O número de casas decimais deve ser um inteiro positivo",
        );
    });
});
