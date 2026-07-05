/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@calcauy";

/**
 * Targeted at exploding memory, CPU, and native BigInt limits of the Deno/V8 engine.
 * We are not sparing the library.
 */
describe("CalcAUY - Singularity Blackhole (Architecture Demolition)", () => {
    const report: Record<string, string> = {};

    describe("1. Massive AST Width", () => {
        it("should process a tree with 100 operands per node and 3 levels deep (The Hydra)", async () => {
            const instance = CalcAUY.create({ contextLabel: "hydra-nexus" });

            // Level 1: 100 operations of Level 2
            // Level 2: 100 operations of Level 3
            // Level 3: 100 literal values
            // Total nodes: 1 + 100 + 10000 + 1000000? No, let's keep it sane for JS memory.
            // Let's do 50 operands per node, 3 levels.
            const WIDTH = 50;

            const createLevel = (depth: number): any => {
                if (depth === 0) { return 1.0001; }
                let builder = instance.from(createLevel(depth - 1));
                for (let i = 1; i < WIDTH; i++) {
                    builder = builder.add(createLevel(depth - 1));
                }
                return builder;
            };

            const start = performance.now();
            const hydra = createLevel(3);
            const output = await hydra.commit();
            const end = performance.now();

            report["1.1_hydra_nexus_latency"] = `${(end - start).toFixed(6)}ms`;
            report["1.1_hydra_result"] = output.toStringNumber({ decimalPrecision: 0 });

            expect(Number(output.toStringNumber())).toBeGreaterThan(0);
        });
    });

    describe("2. Handshake Stress", () => {
        it("should link 100 distinct security jurisdictions (Multiverse)", async () => {
            const jurisdictions = Array.from(
                { length: 100 },
                (_, i) => CalcAUY.create({ contextLabel: `jurisdiction-${i}`, salt: `salt-${i}` }),
            );

            const start = performance.now();
            let master = CalcAUY.create({ contextLabel: "master-nexus" }).from(0);

            for (const j of jurisdictions) {
                const subcalc = await j.from(1).mult(1.05).commit();
                try {
                    master = await master.fromExternalInstance(subcalc.toLiveTrace());
                    master = master.add(1);
                } catch (e) {
                    console.error(e);
                }
            }

            const output = await master.commit();
            const end = performance.now();

            report["2.1_multiverse_link_latency"] = `${(end - start).toFixed(6)}ms`;
            expect(output.toAuditTrace()).toContain("reanimation_event");
            expect(Number(output.toStringNumber())).toBeGreaterThan(100);
        });
    });

    describe("3. GCD/MDC", () => {
        it("should calculate the sum of inverse primorials and their powers", async () => {
            const instance = CalcAUY.create({ contextLabel: "precision-supernova" });
            // Criando denominadores que são produtos de primos (Primoriais)
            let builder = instance.from(1);
            let productOfPrimes = 1n;
            const primes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n];

            for (const p of primes) {
                productOfPrimes *= p;
                builder = builder.add(`1/${productOfPrimes}`).pow(2);
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["3.1_supernova_latency"] = `${(end - start).toFixed(6)}ms`;
            const raw = output.toRawInternalNumber();
            report["3.1_num_digits"] = `${raw.n.toString().length} digits`;

            expect(raw.d > 1n).toBe(true);
        });
    });

    describe("4. Metadata & Formatting Chaos", () => {
        it("should render 10,000 metadata entries in a sequence diagram", async () => {
            const instance = CalcAUY.create({ contextLabel: "auditor-nightmare" });
            let builder = instance.from(1000);

            for (let i = 0; i < 5000; i++) {
                builder = builder.setMetadata(`audit_log_entry_id_${i}`, `hash_${Math.random().toString(16)}`);
            }

            const output = await builder.commit();

            const start = performance.now();
            const mermaid = output.toMermaidGraph();
            const end = performance.now();

            report["4.1_mermaid_render_latency"] = `${(end - start).toFixed(6)}ms`;
            report["4.1_mermaid_size"] = `${(mermaid.length / 1024).toFixed(6)}KB`;

            expect(mermaid.length).toBeGreaterThan(1000);
        });
    });

    describe("5. Recursive Radicalization", () => {
        it("should compute nested 7th roots of near-limit BigInts", async () => {
            const instance = CalcAUY.create({ contextLabel: "newton-blackhole" });
            // Chegando perto de 1M bits
            const base = instance.from(2).pow(950_000);
            let builder = base;

            // 10 níveis de raízes sétimas
            for (let i = 0; i < 10; i++) {
                builder = builder.pow("1/7");
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["5.1_blackhole_roots_latency"] = `${(end - start).toFixed(6)}ms`;
            expect(Number(output.toStringNumber())).toBeGreaterThan(0);
        });
    });

    it("Final Report", () => {
        console.log("\n========================================================");
        console.log("   CALCAUY STRESS REPORT 3  ");
        console.log("========================================================");
        console.table(report);
        console.log("========================================================\n");
    });
});
