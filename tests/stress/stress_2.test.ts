/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0 */
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { CalcAUY } from "@calcauy";
import { CalcAUYError } from "@src/core/errors.ts";

describe("CalcAUY - Stress Tests 3", () => {
    const report: Record<string, string> = {};

    describe("1. Arithmetic & AST Stress (CPU & Memory)", () => {
        it("Depth: AST with 10,000+ levels (Recursive Pressure)", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-depth" });
            let builder = instance.from(1);
            const DEPTH = 10_000;

            for (let i = 0; i < DEPTH; i++) {
                builder = builder.add("0.0001");
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["1.1_ast_depth_10k"] = `${(end - start).toFixed(6)}ms`;
            expect(output.toStringNumber({ decimalPrecision: 4 })).toBe("2.0000");
        });

        it("CPU: Fractional Roots & High Precision", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-cpu" });
            const start = performance.now();

            const output = await instance
                .from("987654321.123456789")
                .pow("123/456")
                .mult("1.0000000001")
                .div(instance.from("0.0000000001").pow("1/3"))
                .commit();

            const end = performance.now();
            report["1.2_cpu_fractional_roots"] = `${(end - start).toFixed(6)}ms`;
            expect(Number(output.toStringNumber())).toBeGreaterThan(0);
        });

        it("GCD Explosion: Large Prime Denominators", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-gcd" });
            // Primos grandes para forçar o cálculo do MDC
            const primes = [104729, 104743, 104759, 104773, 104779, 104789, 104801, 104803];
            let builder = instance.from(0);

            for (const p of primes) {
                builder = builder.add(`1/${p}`);
            }

            const start = performance.now();
            const output = await builder.group().pow(2).commit();
            const end = performance.now();

            report["1.3_gcd_explosion"] = `${(end - start).toFixed(6)}ms`;
            expect(output.toUnicode()).toContain("round");
        });

        it("BigInt Boundary: Prevent Math Overflow", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-overflow" });
            let errorCaught = false;

            const start = performance.now();
            try {
                // Tenta criar um número absurdamente grande (Tower of Power)
                await instance.from(10).pow(1_000_001).commit();
            } catch (err) {
                if (err instanceof CalcAUYError && err.title === "math-overflow") {
                    errorCaught = true;
                }
            }
            const end = performance.now();

            report["1.4_math_overflow_protection"] = `${(end - start).toFixed(6)}ms (deflected: ${errorCaught})`;
            expect(errorCaught).toBe(true);
        });
    });

    describe("2. Output Burst Stress (Rendering)", () => {
        it("Monetary Cache: 100,000 iterations (Locale Switching)", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-monetary" });
            const output = await instance.from("1234567.89").commit();
            const locales = ["pt-BR", "en-US", "de-DE", "ja-JP", "fr-FR"] as const;

            const start = performance.now();
            for (let i = 0; i < 100_000; i++) {
                output.toMonetary({ locale: locales[i % locales.length] });
            }
            const end = performance.now();

            report["2.1_monetary_burst_100k"] = `${(end - start).toFixed(6)}ms`;
        });

        it("Render Complexity: Deeply Nested LaTeX/Unicode", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-render" });
            let builder = instance.from("1");
            for (let i = 0; i < 100; i++) {
                builder = instance.from("1").div(builder.add("1"));
            }
            const output = await builder.commit();

            const start = performance.now();
            const latex = output.toLaTeX();
            const unicode = output.toUnicode();
            const end = performance.now();

            report["2.2_render_complexity_nested"] = `${(end - start).toFixed(6)}ms (latex_len: ${latex.length})`;
            expect(latex).toContain("\\frac");
            expect(unicode).toContain("÷");
        });

        it("High Precision Slicing: 100,000 slices", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-slicing" });
            const output = await instance.from("1000000.00").commit();

            const start = performance.now();
            const slices = output.toSlice(100_000, { decimalPrecision: 10 });
            const end = performance.now();

            report["2.3_slicing_100k"] = `${(end - start).toFixed(6)}ms`;
            expect(slices.length).toBe(100_000);
        });

        it("Custom Processor Pressure: 100,000 runs", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-custom" });
            const output = await instance.from(42).commit();

            const start = performance.now();
            for (let i = 0; i < 100_000; i++) {
                output.toCustomOutput((ctx) => `Result: ${ctx.result.n}/${ctx.result.d}`);
            }
            const end = performance.now();

            report["2.4_custom_processor_100k"] = `${(end - start).toFixed(6)}ms`;
        });
    });

    describe("3. Concurrency Stress", () => {
        it("Burst Concurrency: 1,000 simultaneous tasks", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-concurrency" });
            const tasks = Array.from({ length: 1_000 }, (_, i) => {
                return instance.from(i).mult("1.15").add(10).commit();
            });

            const start = performance.now();
            await Promise.all(tasks);
            const end = performance.now();

            report["3.1_concurrency_1k"] = `${(end - start).toFixed(6)}ms`;
        });
    });

    describe("4. Security & Integrity Stress", () => {
        it("JSON Bomb: Malicious Hydration Attempt", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-security" });
            const bomb = {
                kind: "operation",
                type: "add",
                operands: Array.from({ length: 10_000 }).map(() => ({
                    kind: "literal",
                    value: { n: "1", d: "1" },
                })),
                signature: "fake-sig",
            };

            const start = performance.now();
            let deflected = false;
            try {
                // @ts-ignore: Provocando falha de hidratação
                await instance.hydrate(bomb);
            } catch {
                deflected = true;
            }
            const end = performance.now();

            report["4.1_json_bomb_hydration"] = `${(end - start).toFixed(6)}ms (deflected: ${deflected})`;
            expect(deflected).toBe(true);
        });

        it("Metadata Bloat: 5,000 keys", async () => {
            const instance = CalcAUY.create({ contextLabel: "stress-metadata" });
            let builder = instance.from(100);

            for (let i = 0; i < 5_000; i++) {
                builder = builder.setMetadata(`key_${i}`, `value_${i}`);
            }

            const start = performance.now();
            const output = await builder.commit();
            const end = performance.now();

            report["4.2_metadata_bloat_5k"] = `${(end - start).toFixed(6)}ms`;
            expect(output.toStringNumber()).toBe("100.00");
        });
    });

    it("Final Report", () => {
        console.log("\n========================================================");
        console.log("   CALCAUY STRESS REPORT 2  ");
        console.log("========================================================");
        console.table(report);
        console.log("========================================================\n");
    });
});
