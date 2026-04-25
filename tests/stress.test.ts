/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY, type CalcAUYOutput } from "@calcauy";
import { ProcessBatchAUY } from "@src/utils/batch.ts";

describe("CalcAUY - Testes de Estresse e Performance Extrema", () => {
    const results: Record<string, string> = {};

    it("Cenário 1: Limite de CPU (Raízes Fracionárias de Alta Precisão)", async () => {
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t1" });
        const res = await base
            .from("1234567.89123456789")
            .pow("353/1141")
            .pow("17/19")
            .div(base.from("0.0000001").pow("1/7"))
            .commit();
        const end = performance.now();
        results["1_cpu_limit_complex_root"] = `${(end - start).toFixed(4)}ms`;
        // console.log(res.toStringNumber());
        expect(res.toFloatNumber()).toBeGreaterThan(0);
    });

    it("Cenário 2: Operação Extensa (AST de Alta Profundidade)", async () => {
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t2" });
        let calc = base.from("1");
        for (let i = 0; i < 450; i++) {
            calc = calc.add("0.0001");
        }
        const res = await calc.commit();
        const end = performance.now();
        results["2_extensive_ast_depth"] = `${(end - start).toFixed(4)}ms`;
        // console.log(res.toStringNumber());
        expect(res.toStringNumber({ decimalPrecision: 4 })).toBe("1.0450");
    });

    it("Cenário 3: Operação Muito Custosa (Milhares de vezes)", async () => {
        const ITERATIONS = 100_000;
        const start = performance.now();
        const res: CalcAUYOutput[] = [];
        const base = CalcAUY.create({ contextLabel: "t3" });
        for (let i = 0; i < ITERATIONS; i++) {
            res.push(
                await base
                    .from("1000.50")
                    .mult("1.05")
                    .pow(12)
                    .div("3.14159265")
                    .commit(),
            );
        }
        const end = performance.now();
        results["3_costly_repeated_pow"] = `${(end - start).toFixed(4)}ms (iterations: ${ITERATIONS})`;

        // console.log(res[43].toStringNumber());
    });

    it("Cenário 4: Operação Simples Real (Milhares de vezes)", async () => {
        const ITERATIONS = 100_000;
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t4" });
        for (let i = 0; i < ITERATIONS; i++) {
            await base
                .from("150.00")
                .add("25.50")
                .mult("1.18")
                .commit();
        }
        const end = performance.now();
        results["4_simple_real_repeated"] = `${(end - start).toFixed(4)}ms (iterations: ${ITERATIONS})`;
    });

    it("Cenário 5: Estresse de Imutabilidade (Metadata Bloat)", async () => {
        const ITERATIONS = 1000;
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t5" });
        let calc = base.from("100.00");
        for (let i = 0; i < ITERATIONS; i++) {
            calc = calc.setMetadata(`audit_key_${i}`, `audit_value_${i}`);
        }
        const res = await calc.commit();
        const end = performance.now();
        results["5_metadata_cloning_stress"] = `${(end - start).toFixed(4)}ms (metadata_keys: ${ITERATIONS})`;
        expect(res.toFloatNumber()).toBe(100);
    });

    it("Cenário 6: Explosão de Precisão Racional (GCD Stress)", async () => {
        const start = performance.now();
        const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
        const base = CalcAUY.create({ contextLabel: "t6" });
        let calc = base.from(0);
        for (const p of primes) {
            calc = calc.add(`1/${p}`);
        }
        await calc.group().pow(3).commit();
        const end = performance.now();
        // console.log(res.toUnicode());
        results["6_rational_explosion_gcd"] = `${(end - start).toFixed(4)}ms`;
    });

    it("Cenário 7: Massacre de Rateio (Slicing Massivo)", async () => {
        const SLICES = 100_000;
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t7" });
        const output = await base.from("1000000.00").commit();
        const slices = output.toSlice(SLICES, { decimalPrecision: 2 });
        const end = performance.now();
        results["7_slicing_massacre"] = `${(end - start).toFixed(4)}ms (slices: ${SLICES})`;
        expect(slices.length).toBe(SLICES);
    });

    it("Cenário 8: Burst Concurrency (DDoS Simulation)", async () => {
        const CONCURRENT_REQUESTS = 1000; // Reduzido de 100k para 1k devido ao limite de threads/async
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t8" });

        const tasks = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, i) => {
            return await base.from(i).add(10).mult("1.15").commit();
        });

        await Promise.all(tasks);

        const end = performance.now();
        results["8_burst_concurrency_ddos"] = `${
            (end - start).toFixed(4)
        }ms (concurrent_tasks: ${CONCURRENT_REQUESTS})`;
    });

    it("Cenário 9: Batch Processing (Controlled Throughput)", async () => {
        const TOTAL_TASKS = 10_000; // Reduzido de 100k para 10k
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t9" });

        const items = Array.from({ length: TOTAL_TASKS }).map((_, i) => i);

        await ProcessBatchAUY(items, async (i) => {
            return await base.from(i).add(10).mult("1.15").commit();
        }, {
            batchSize: 1000,
        });

        const end = performance.now();
        results["9_batch_processing_controlled"] = `${(end - start).toFixed(4)}ms (total_tasks: ${TOTAL_TASKS})`;
    });

    it("Cenário 10: BigInt Limit Torture (Tower of Power DoS)", async () => {
        const start = performance.now();
        let caught = false;
        const base = CalcAUY.create({ contextLabel: "t10" });
        try {
            await base.from(2).pow(1_000_001).commit();
            // console.log(a);
        } catch (err: any) {
            // console.log(err);
            if (err.title === "math-overflow") { caught = true; }
        }

        const end = performance.now();
        results["10_bigint_limit_torture"] = `${(end - start).toFixed(4)}ms (caught_overflow: ${caught})`;
        expect(caught).toBe(true);
    });

    it("Cenário 11: Malicious Hydration (JSON Bomb)", async () => {
        const start = performance.now();
        const base = CalcAUY.create({ contextLabel: "t11" });
        const bomb = {
            kind: "operation",
            type: "add",
            operands: Array.from({ length: 10000 }).map(() => ({ kind: "literal", value: { n: "1", d: "1" } })),
            signature: "dummy",
        };

        let caught = false;
        try {
            await base.hydrate(bomb);
        } catch (err: any) {
            caught = true;
        }

        const end = performance.now();
        results["11_malicious_json_hydration"] = `${(end - start).toFixed(4)}ms (deflected: ${caught})`;
    });

    it("Consolidação de Resultados Finais", () => {
        console.log("\n=== RELATÓRIO DE ESTRESSE DE GUERRA (WAR GAMING) ===");
        console.table(results);
        expect(Object.keys(results).length).toBe(11);
    });
});
