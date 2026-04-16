import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@calcauy";
import { ProcessBatchAUY } from "@src/utils/batch.ts";

describe("CalcAUY - Testes de Estresse e Performance Extrema", () => {
    const results: Record<string, string> = {};

    it("Cenário 1: Limite de CPU (Raízes Fracionárias de Alta Precisão)", () => {
        const start = performance.now();
        const res = CalcAUY.from("1234567.89123456789")
            .pow("353/1141")
            .pow("17/19")
            .div(CalcAUY.from("0.0000001").pow("1/7"))
            .commit({ roundStrategy: "NBR5891" });
        const end = performance.now();
        results["1_cpu_limit_complex_root"] = `${(end - start).toFixed(4)}ms`;
        expect(res.toFloatNumber()).toBeGreaterThan(0);
    });

    it("Cenário 2: Operação Extensa (AST de Alta Profundidade)", () => {
        const start = performance.now();
        let calc = CalcAUY.from("1");
        for (let i = 0; i < 450; i++) {
            calc = calc.add("0.0001");
        }
        const res = calc.commit();
        const end = performance.now();
        results["2_extensive_ast_depth"] = `${(end - start).toFixed(4)}ms`;
        expect(res.toStringNumber({ decimalPrecision: 4 })).toBe("1.0450");
    });

    it("Cenário 3: Operação Muito Custosa (Milhares de vezes)", () => {
        const ITERATIONS = 100_000;
        const start = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            CalcAUY.from("1000.50").mult("1.05").pow(12).div("3.14159265").commit();
        }
        const end = performance.now();
        results["3_costly_repeated_pow"] = `${(end - start).toFixed(4)}ms (iterations: ${ITERATIONS})`;
    });

    it("Cenário 4: Operação Simples Real (Milhares de vezes)", () => {
        const ITERATIONS = 100_000;
        const start = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            CalcAUY.from("150.00").add("25.50").mult("1.18").commit();
        }
        const end = performance.now();
        results["4_simple_real_repeated"] = `${(end - start).toFixed(4)}ms (iterations: ${ITERATIONS})`;
    });

    it("Cenário 5: Estresse de Imutabilidade (Metadata Bloat)", () => {
        const ITERATIONS = 1000;
        const start = performance.now();
        let calc = CalcAUY.from("100.00");
        for (let i = 0; i < ITERATIONS; i++) {
            calc = calc.setMetadata(`audit_key_${i}`, `audit_value_${i}`);
        }
        const res = calc.commit();
        const end = performance.now();
        results["5_metadata_cloning_stress"] = `${(end - start).toFixed(4)}ms (metadata_keys: ${ITERATIONS})`;
        expect(res.toFloatNumber()).toBe(100);
    });

    it("Cenário 6: Explosão de Precisão Racional (GCD Stress)", () => {
        const start = performance.now();
        const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
        let calc = CalcAUY.from(0);
        for (const p of primes) {
            calc = calc.add(`1/${p}`);
        }
        calc.pow(3).commit();
        const end = performance.now();
        results["6_rational_explosion_gcd"] = `${(end - start).toFixed(4)}ms`;
    });

    it("Cenário 7: Massacre de Rateio (Slicing Massivo)", () => {
        const SLICES = 100_000;
        const start = performance.now();
        const output = CalcAUY.from("1000000.00").commit();
        const slices = output.toSlice(SLICES, { decimalPrecision: 2 });
        const end = performance.now();
        results["7_slicing_massacre"] = `${(end - start).toFixed(4)}ms (slices: ${SLICES})`;
        expect(slices.length).toBe(SLICES);
    });

    // --- CENÁRIOS DE GUERRA (DoS, CONCURRENCY, ATTACK VECTORS) ---

    it("Cenário 8: Burst Concurrency (DDoS Simulation)", async () => {
        const CONCURRENT_REQUESTS = 100_000;
        const start = performance.now();

        // Simula 100.000 requisições disparadas simultaneamente
        const tasks = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, i) => {
            return CalcAUY.from(i).add(10).mult("1.15").commit();
        });

        await Promise.all(tasks);

        const end = performance.now();
        results["8_burst_concurrency_ddos"] = `${
            (end - start).toFixed(4)
        }ms (concurrent_tasks: ${CONCURRENT_REQUESTS})`;
    });

    it("Cenário 9: Batch Processing (Controlled Throughput)", async () => {
        const TOTAL_TASKS = 100_000;
        const start = performance.now();

        const items = Array.from({ length: TOTAL_TASKS }).map((_, i) => i);

        // Processa as mesmas 100.000 tarefas, mas em lotes de 5.000 com yielding
        await ProcessBatchAUY(items, (i) => {
            return CalcAUY.from(i).add(10).mult("1.15").commit();
        }, {
            batchSize: 1000,
        });

        const end = performance.now();
        results["9_batch_processing_controlled"] = `${(end - start).toFixed(4)}ms (total_tasks: ${TOTAL_TASKS})`;
    });

    it("Cenário 10: Logging Policy Hell (Race Condition Stress)", async () => {
        const start = performance.now();
        let errorCount = 0;

        // Estressa o estado global da política de log enquanto executa cálculos pesados
        // Em JS/Deno isso testa a consistência da lib sob micro-tarefas assíncronas
        const stressor = async () => {
            for (let i = 0; i < 1000; i++) {
                try {
                    CalcAUY.setLoggingPolicy({ sensitive: i % 2 === 0 });
                    CalcAUY.from(100).pow(i).commit();
                } catch {
                    errorCount++;
                }
            }
        };

        await Promise.all([stressor(), stressor(), stressor(), stressor()]);

        const end = performance.now();
        results["10_logging_policy_race_stress"] = `${(end - start).toFixed(4)}ms (errors: ${errorCount})`;
        expect(errorCount).toBe(0);
    });

    it("Cenário 11: BigInt Limit Torture (Tower of Power DoS)", () => {
        const start = performance.now();
        let caught = false;

        try {
            // Tenta criar um número que ultrapassa 1 milhão de bits (limite de segurança)
            // 2 ^ 1.000.001
            CalcAUY.from(2).pow(1000001).commit();
        } catch (err: any) {
            if (err.type === "calc-auy/math-overflow") { caught = true; }
        }

        const end = performance.now();
        results["11_bigint_limit_torture"] = `${(end - start).toFixed(4)}ms (caught_overflow: ${caught})`;
        expect(caught).toBe(true);
    });

    it("Cenário 12: Malicious Hydration (JSON Bomb)", () => {
        const start = performance.now();

        // Cria um JSON que simula uma árvore extremamente profunda ou malformada
        const bomb = {
            kind: "operation",
            type: "add",
            operands: Array.from({ length: 10000 }).map(() => ({ kind: "literal", value: { n: "1", d: "1" } })),
        };

        let caught = false;
        try {
            // Testa se o hydrate e o evaluate barram o processamento de árvores excessivas
            CalcAUY.hydrate(bomb).commit();
        } catch (err: any) {
            caught = true;
        }

        const end = performance.now();
        results["12_malicious_json_hydration"] = `${(end - start).toFixed(4)}ms (deflected: ${caught})`;
    });

    it("Consolidação de Resultados Finais", () => {
        console.log("\n=== RELATÓRIO DE ESTRESSE DE GUERRA (WAR GAMING) ===");
        console.table(results);
        expect(Object.keys(results).length).toBe(12); // Total de cenários (excluindo 8 que sumiu na última iteração)
    });
});
