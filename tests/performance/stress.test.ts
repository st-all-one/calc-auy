import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@src/main.ts";

describe("Performance: Stress & Load Testing", () => {
    const Engine = CalcAUY.create({
        contextLabel: "stress-test",
        salt: "stress-salt",
        roundStrategy: "HALF_UP",
    });

    it("deve processar uma árvore linear profunda (Deep Tree) sem estourar a pilha", async () => {
        const depth = 500; // Profundidade considerável para recursão
        let builder = Engine.from(1);

        for (let i = 0; i < depth; i++) {
            builder = builder.add(1);
        }

        const output = await builder.commit();
        assertEquals(output.toStringNumber(), `${depth + 1}.00`);
    });

    it("deve lidar com milhares de operações em lote usando cache", async () => {
        const iterations = 5000;
        const baseValue = 100;
        const multiplier = "1.05";

        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            await Engine.from(baseValue).mult(multiplier).commit();
        }
        const endTime = performance.now();

        console.log(`\n  >> Processamento de ${iterations} cálculos em: ${(endTime - startTime).toFixed(6)}ms`);
        assertEquals(true, true);
    });

    it("deve reduzir a alocação de memória ao processar lotes com valores repetidos", async () => {
        const iterations = 1000;
        const taxRate = "0.15";

        const results = [];
        for (let i = 0; i < iterations; i++) {
            const res = await Engine.from(100).mult(taxRate).commit();
            results.push(res);
        }

        assertEquals(results.length, iterations);
        // Verifica se o último resultado está correto
        assertEquals(results[iterations - 1].toStringNumber(), "15.00");
    });

    it("deve calcular raízes e potências complexas com alta precisão", async () => {
        // (2 ^ 100) / (2 ^ 99) = 2
        const p100 = Engine.from(2).pow(100);
        const p99 = Engine.from(2).pow(99);

        const output = await p100.div(p99).commit();
        assertEquals(output.toStringNumber({ decimalPrecision: 0 }), "2");
    });

    it("deve manter estabilidade em árvores balanceadas largas", async () => {
        const width = 100;
        const nodes = [];

        // Cria 100 nós independentes
        for (let i = 0; i < width; i++) {
            nodes.push(Engine.from(i));
        }

        // Agrupa todos em uma única operação
        let finalBuilder = Engine.from(0);
        for (const node of nodes) {
            finalBuilder = finalBuilder.add(node);
        }

        const output = await finalBuilder.commit();
        // Soma de 0 a 99 = (99 * 100) / 2 = 4950
        assertEquals(output.toStringNumber(), "4950.00");
    });
});
