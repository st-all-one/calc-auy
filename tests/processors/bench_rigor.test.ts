import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { msgpackHydrator, msgpackProcessor } from "@processor/msgpack/processor.msgpack.ts";
import { protobufHydrator, protobufProcessor } from "@processor/protobuffer/processor.protobuffer.ts";

describe("Stress & Bench: Encoders/Decoders Otimizados", () => {
    const salt = "bench-salt-2026";
    const encoder = new TextEncoder();

    it("deve validar eficiência e integridade em árvore profunda", async () => {
        const Calc = CalcAUY.create({ contextLabel: "bench", salt });

        // Cria uma árvore profunda (50 níveis de profundidade)
        let chain = Calc.from(1);
        for (let i = 0; i < 50; i++) {
            chain = chain.add(1).setMetadata(`step_${i}`, i);
        }
        const res = await chain.commit();
        const originalObj = res.toLiveTrace();

        // --- 1. Bench JSON (Baseline) ---
        const jsonStr = res.toAuditTrace();
        const jsonBytes = encoder.encode(jsonStr).length;

        // --- 2. Bench MessagePack (Otimizado via Enums) ---
        const startMsg = performance.now();
        const msgBuffer = res.toCustomOutput(msgpackProcessor);
        const msgDecoded = msgpackHydrator(msgBuffer);
        const endMsg = performance.now();

        // --- 3. Bench Protobuf (Otimizado via Schema) ---
        const startProto = performance.now();
        const protoBuffer = res.toCustomOutput(protobufProcessor);
        const protoDecoded = protobufHydrator(protoBuffer);
        const endProto = performance.now();

        // --- Relatório de Eficiência ---
        console.log(`\n--- Relatório de Eficiência (Árvore Profunda: 50 níveis) ---`);
        console.log(`JSON:      ${jsonBytes} bytes`);
        console.log(
            `MsgPack:   ${msgBuffer.length} bytes (Redução: ${Math.round((1 - msgBuffer.length / jsonBytes) * 100)}%)`,
        );
        console.log(
            `Protobuf:  ${protoBuffer.length} bytes (Redução: ${
                Math.round((1 - protoBuffer.length / jsonBytes) * 100)
            }%)`,
        );
        console.log(`----------------------------------------------------------`);
        console.log(`Tempo MsgPack:   ${(endMsg - startMsg).toFixed(4)}ms`);
        console.log(`Tempo Protobuf:  ${(endProto - startProto).toFixed(4)}ms`);

        // --- Validação de Integridade ---
        // Comparamos as assinaturas e o resultado final
        assertEquals(msgDecoded.signature, originalObj.signature, "MsgPack Signature mismatch");
        assertEquals(protoDecoded.signature, originalObj.signature, "Protobuf Signature mismatch");
        assertEquals(msgDecoded.finalResult?.n, originalObj.finalResult?.n, "MsgPack Result mismatch");
        assertEquals(protoDecoded.finalResult?.n, originalObj.finalResult?.n, "Protobuf Result mismatch");

        // Protobuf deve ser consideravelmente menor que JSON
        assert(protoBuffer.length < jsonBytes, "Protobuf deve ser menor que JSON");
        assert(msgBuffer.length < jsonBytes, "MessagePack deve ser menor que JSON");
    });
});
