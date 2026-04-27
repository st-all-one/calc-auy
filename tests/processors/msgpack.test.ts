import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { msgpackProcessor } from "@processor/msgpack/processor.msgpack.ts";
import { decode } from "@std/msgpack";

describe("Processor: MessagePack", () => {
    it("deve gerar um buffer MessagePack e permitir a decodificação fiel", async () => {
        const Calc = CalcAUY.create({ contextLabel: "msg-test", salt: "s1" });
        const res = await Calc.from(10).add(20).commit();

        const buffer = res.toCustomOutput(msgpackProcessor);
        assert(buffer instanceof Uint8Array);

        const decoded = decode(buffer) as any;
        assertEquals(decoded.contextLabel, "msg-test");
        assertEquals(decoded.ast.kind, 2); // 2 = Operation (conforme contrato msgpack.md)
        assertEquals(decoded.ast.type, 1); // 1 = add
    });
});
