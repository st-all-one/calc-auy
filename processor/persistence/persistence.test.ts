import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { persistenceProcessor } from "@processor/persistence/processor.persistence.ts";

describe("Processor: Persistence (SQL/Prisma)", () => {
    it("deve achatar o rastro para o formato de colunas do banco", async () => {
        const Calc = CalcAUY.create({ contextLabel: "db-test", salt: "s1", roundStrategy: "HALF_UP" });
        const res = await Calc.from(123.45).commit();

        const record = res.toCustomOutput(persistenceProcessor);

        assertEquals(record.context_label, "db-test");
        assertEquals(record.round_strategy, "HALF_UP");
        assertEquals(record.result_numerator, "2469");
        assertEquals(record.result_denominator, "20");
        assertEquals(record.ast.kind, "literal");
        assertEquals(typeof record.signature, "string");
    });
});
