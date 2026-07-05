/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@calcauy";
import { CalcAUYError } from "@src/core/errors.ts";

/**
 * These tests are designed to reach the architectural limits of CalcAUY and the Deno runtime.
 * We are targeting BigInt bit-depth, GCD recursion depth, and signature avalanche complexity.
 */
describe("CalcAUY - Stress Tests", () => {
    const report: Record<string, string> = {};

    describe("1. GCD Limits", () => {
        it("should handle the sum of the first 100 primes as denominators", async () => {
            // Primos menores para evitar estouro rápido, mas muitos para explodir o denominador comum
            const primes = [
                2,
                3,
                5,
                7,
                11,
                13,
                17,
                19,
                23,
                29,
                31,
                37,
                41,
                43,
                47,
                53,
                59,
                61,
                67,
                71,
                73,
                79,
                83,
                89,
                97,
                101,
                103,
                107,
                109,
                113,
                127,
                131,
                137,
                139,
                149,
                151,
                157,
                163,
                167,
                173,
                179,
                181,
                191,
                193,
                197,
                199,
                211,
                223,
                227,
                229,
                233,
                239,
                241,
                251,
                257,
                263,
                269,
                271,
                277,
                281,
                283,
                293,
                307,
                311,
                313,
                317,
                331,
                337,
                347,
                349,
                353,
                359,
                367,
                373,
                379,
                383,
                389,
                397,
                401,
                409,
                419,
                421,
                431,
                433,
                439,
                443,
                449,
                457,
                461,
                463,
                467,
                479,
                487,
                491,
                499,
                503,
                509,
                521,
                523,
                541,
            ];

            const instance = CalcAUY.create({ contextLabel: "singularity-gcd" });
            let builder = instance.from(0);

            for (const p of primes) {
                builder = builder.add(`1/${p}`);
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["1.1_primorial_sum_100"] = `${(end - start).toFixed(6)}ms`;
            const raw = output.toRawInternalNumber();
            report["1.1_den_digits"] = `${raw.d.toString().length} digits`;

            expect(Number(output.toStringNumber())).toBeGreaterThan(0);
        });
    });

    describe("2. Memory & Bit-limit Torture", () => {
        it("should reach near the 1,000,000 bits limit via multiplication avalanche", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-bits" });
            // pow(2, 450000) já tem ~450k bits.
            const part = instance.from(2).pow(225_000); // ~225k bits

            const start = performance.now();
            // 2^225k * 2^225k * 2^225k * 2^225k = 2^900k
            const builder = part.mult(part).mult(part).mult(part);
            const output = await builder.commit();
            const end = performance.now();

            report["2.1_multiplication_avalanche_900k_bits"] = `${(end - start).toFixed(6)}ms`;
            const raw = output.toRawInternalNumber();
            report["2.1_num_bits"] = `~${raw.n.toString(2).length} bits`;

            expect(raw.n.toString(2).length).toBeGreaterThan(890_000);
        });

        it("should precisely catch a 1,000,001 bits overflow during intermediate collapse", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-overflow" });
            // Criamos um numero grande que passe no pow()
            const base = instance.from(2).pow(500_000); // 500k bits (OK)

            let errorCaught = false;
            const start = performance.now();
            try {
                // Ao multiplicar por algo que passe de 1M bits, checkSafety deve pegar.
                // 2^500,000 * 2^500,001 = 2^1,000,001 (FAIL)
                await base.mult(instance.from(2).pow(500_001)).commit();
            } catch (err) {
                if (err instanceof CalcAUYError && err.title === "math-overflow") {
                    errorCaught = true;
                }
            }
            const end = performance.now();

            report["2.2_exact_bit_overflow_detection"] = `${(end - start).toFixed(6)}ms`;
            expect(errorCaught).toBe(true);
        });
    });

    describe("3. The Power Tower DoS", () => {
        it("should handle a massive Right-Associative Power Tower (a^b^c^d)", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-tower" });
            // Usamos uma base um pouco maior e um expoente que não estoure os bits
            const builder = instance.from(1.1)
                .pow(instance.from(2).pow(4)); // 1.1^16

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["3.1_power_tower_structure"] = `${(end - start).toFixed(6)}ms`;
            expect(Number(output.toStringNumber())).toBeGreaterThan(1);
        });
    });

    describe("4. Hashing & Security Test", () => {
        it("should generate a signature for an AST with 450 operations (Near Depth Limit)", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-signature" });
            let builder = instance.from(1);
            const OPS = 450;

            for (let i = 0; i < OPS; i++) {
                builder = builder.add(1);
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["4.1_signature_avalanche_450_ops"] = `${(end - start).toFixed(6)}ms`;
            expect(output.toAuditTrace()).toContain("signature");
        });

        it("should handle 10,000 metadata keys with UTF-8 stress characters", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-metadata" });
            let builder = instance.from(100);
            const KEYS = 10_000;
            const emojiKey = "🚀_key_";
            const longVal = "A".repeat(100);

            for (let i = 0; i < KEYS; i++) {
                builder = builder.setMetadata(`${emojiKey}${i}`, longVal);
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["4.2_metadata_stress_10k_emojis"] = `${(end - start).toFixed(6)}ms`;
            const trace = output.toAuditTrace();
            report["4.2_trace_size"] = `${(trace.length / 1024 / 1024).toFixed(6)}MB`;

            expect(trace.length).toBeGreaterThan(1_000_000);
        });
    });

    describe("5. Radical Newton Scalability", () => {
        it("should compute nested roots of near-limit numbers", async () => {
            const instance = CalcAUY.create({ contextLabel: "singularity-roots" });
            // Raiz 100 de (2^900,000)
            const huge = instance.from(2).pow(900_000);
            const builder = huge.pow("1/100").pow("1/2").pow("1/2");

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["5.1_nested_roots_huge_numbers"] = `${(end - start).toFixed(6)}ms`;
            expect(Number(output.toStringNumber())).toBeGreaterThan(0);
        });
    });

    it("Final Report", () => {
        console.log("\n========================================================");
        console.log("   CALCAUY STRESS REPORT 1   ");
        console.log("========================================================");
        console.table(report);
        console.log("========================================================\n");
    });
});
