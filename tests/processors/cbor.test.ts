import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { cborHydrator, cborProcessor } from "@processor/cbor/processor.cbor.ts";

describe("Processor: CBOR", () => {
    it("deve serializar e reanimar via CBOR mantendo integridade", async () => {
        const Calc = CalcAUY.create({ contextLabel: "cbor-test", salt: "s1" });
        const inicial = await Calc.from(100).mult(1.5).commit();

        const buffer = inicial.toCustomOutput(cborProcessor);
        assert(buffer instanceof Uint8Array);

        const astObject = cborHydrator(buffer);
        const reanimado = await Calc.hydrate(astObject, { salt: "s1" });

        const final = await reanimado.add(50).commit();
        assertEquals(final.toStringNumber(), "200.00");
    });
});
