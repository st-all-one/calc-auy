/**
 * CalcAUY — harness de benchmark TS (referência: _REF/tests/).
 *
 * Deriva as cargas de TODOS os arquivos de `_REF/tests/` (core, builder,
 * security, output, performance, stress, audit, bench_rigor) e mede cada uma
 * com a API real do rascunho TypeScript.
 *
 * Uso: `deno run --allow-all --no-check --config bench/deno.jsonc bench/ts/compare.ts`
 * Saída: `bench/results/ts.json` (+ stdout).
 */

import { CalcAUY } from "@calcauy";
import { RationalNumber } from "@src/core/rational.ts";
import { applyRounding } from "@src/core/rounding.ts";
import { Lexer } from "@src/parser/lexer.ts";
import { Parser } from "@src/parser/parser.ts";
import { canonicalString } from "@src/utils/security.ts";
import { msgpackHydrator, msgpackProcessor } from "@processor/msgpack/processor.msgpack.ts";
import { protobufHydrator, protobufProcessor } from "@processor/protobuffer/processor.protobuffer.ts";

type Sample = {
    iters: number;
    total_ms: number;
    min_ms: number;
    median_ms: number;
};

const results: Record<string, Sample> = {};

/** Mede `iters` execuções (após 1 de aquecimento) com um único timer por lote. */
async function bench(name: string, iters: number, fn: () => unknown | Promise<unknown>): Promise<void> {
    await fn(); // warmup
    const t0 = performance.now();
    for (let i = 0; i < iters; i++) await fn();
    const total = performance.now() - t0;
    results[name] = { iters, total_ms: total, min_ms: total, median_ms: total };
    const perOp = (total / iters) * 1000;
    console.log(`${name.padEnd(34)} ${total.toFixed(2).padStart(10)} ms  (${perOp.toFixed(2)} µs/op, n=${iters})`);
}

// ─────────────────────────────── Instâncias ───────────────────────────────

const Engine = CalcAUY.create({ contextLabel: "bench", salt: "bench-salt-2026", roundStrategy: "NBR5891" });
const HalfUp = CalcAUY.create({ contextLabel: "bench-hu", salt: "s", roundStrategy: "HALF_UP" });
const None = CalcAUY.create({ contextLabel: "bench-none", salt: "s", roundStrategy: "NONE" });
const Sensitive = CalcAUY.create({ contextLabel: "bench-pii", salt: "s", sensitive: true });

// ─────────────────────── Core (core/rational, rounding, cache) ───────────────────────

await bench("core/rational_from", 200_000, () => RationalNumber.from("1.23456789"));
await bench("core/rational_add", 200_000, () => RationalNumber.from("1/3").add(RationalNumber.from("1/7")));
await bench("core/rational_mul", 100_000, () => RationalNumber.from("1.05").mul(RationalNumber.from("0.15")));
await bench("core/rational_div", 100_000, () => RationalNumber.from("1/3").div(RationalNumber.from("7/11")));
await bench("core/rational_pow_small", 20_000, () => RationalNumber.from(2).pow(RationalNumber.from(20)));
await bench("core/round_nbr5891", 100_000, () => applyRounding(RationalNumber.from("85.483"), "NBR5891", 2));
await bench("core/round_half_up", 100_000, () => applyRounding(RationalNumber.from("1.25"), "HALF_UP", 1));
await bench("core/canonical_json", 100_000, () => canonicalString({ a: 1, b: [1, 2, { c: "x" }], d: true }));

// ───────────────────────── Builder: lexer/parser (builder/lexer, parser) ─────────────────────────

const chain = (terms: number): string => Array.from({ length: terms }, (_, i) => String(i)).join("+");
const chain100 = chain(100);
const chain1000 = chain(1000);

await bench("builder/lex_chain_100", 20_000, () => new Lexer(chain100).tokenize());
await bench("builder/parse_chain_100", 20_000, () => new Parser(new Lexer(chain100).tokenize()).parse());
await bench("builder/parse_chain_1000", 2_000, () => new Parser(new Lexer(chain1000).tokenize()).parse());
await bench("builder/parse_expression_pemdas", 20_000, () => Engine.parseExpression("10 + 5 * 2 ^ 3 - 4 / 2"));

// ───────────────────────── Builder: lógica/commit (builder/logic, performance/stress) ─────────────────────────

await bench("builder/build_chain_10", 20_000, () => {
    let b = Engine.from(1);
    for (let i = 0; i < 10; i++) b = b.add(1);
    return b;
});
await bench("builder/commit_chain_10", 20_000, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 10; i++) b = b.add(1);
    return await b.commit();
});
await bench("builder/commit_chain_100", 2_000, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 100; i++) b = b.add(1);
    return await b.commit();
});
await bench("builder/basic_ops_chain", 20_000, async () =>
    await Engine.from(10).add(5).sub(2).mult(2).div(2).pow(2).mod(10).divInt(2).commit());
await bench("builder/group_precedence", 20_000, async () =>
    await Engine.from(10).add(5).group().mult(2).commit());
await bench("perf/deep_tree_500", 200, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 500; i++) b = b.add(1);
    return await b.commit();
});
await bench("perf/depth_10000", 10, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 10_000; i++) b = b.add("0.0001");
    return await b.commit();
});
await bench("perf/batch_5000_mult", 3, async () => {
    for (let i = 0; i < 5_000; i++) await Engine.from(100).mult("1.05").commit();
});
await bench("perf/batch_1000_tax", 3, async () => {
    for (let i = 0; i < 1_000; i++) await Engine.from(100).mult("0.15").commit();
});
await bench("perf/pow_div_2_100", 2_000, async () => await Engine.from(2).pow(100).div(Engine.from(2).pow(99)).commit());
await bench("perf/balanced_width_100", 500, async () => {
    const nodes = Array.from({ length: 100 }, (_, i) => Engine.from(i));
    let b = Engine.from(0);
    for (const n of nodes) b = b.add(n);
    return await b.commit();
});

// ───────────────────── Security/signing (security/*, core/metadata, audit/forensic) ─────────────────────

await bench("security/sign_chain_100", 2_000, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 100; i++) b = b.add(1);
    return await b.commit();
});
await bench("security/sign_chain_450", 300, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 450; i++) b = b.add(1);
    return await b.commit();
});
await bench("security/audit_trace_100", 2_000, async () => {
    let b = Engine.from(1);
    for (let i = 0; i < 100; i++) b = b.add(1);
    return (await b.commit()).toAuditTrace();
});
await bench("security/metadata_100", 2_000, async () => {
    let b = Engine.from(100);
    for (let i = 0; i < 100; i++) b = b.setMetadata(`key_${i}`, `value_${i}`);
    return await b.commit();
});
await bench("security/metadata_5000", 20, async () => {
    let b = Engine.from(100);
    for (let i = 0; i < 5_000; i++) b = b.setMetadata(`key_${i}`, `value_${i}`);
    return await b.commit();
});
await bench("security/metadata_10000_emoji", 5, async () => {
    let b = Engine.from(100);
    for (let i = 0; i < 10_000; i++) b = b.setMetadata(`🚀_key_${i}`, "A".repeat(100));
    return await b.commit();
});
await bench("security/hydrate_audit_trace", 2_000, async () => {
    const trace = (await Engine.from(100).add(50).commit()).toAuditTrace();
    return await Engine.hydrate(trace);
});
await bench("security/check_integrity", 2_000, async () => {
    const trace = (await Engine.from(500).commit()).toAuditTrace();
    return await CalcAUY.checkIntegrity(trace, { salt: "bench-salt-2026" });
});
await bench("audit/forensic_hibernate_hydrate", 2_000, async () => {
    const signed = await Engine.from("1234.567").mult("1.05").setMetadata("invoice", "INV-999").hibernate();
    return await Engine.hydrate(signed);
});

// ───────────────────────── Output (output/*, stress/stress_2 §2, stress/stress_3 §4) ─────────────────────────

const out100 = await Engine.from(100).add(50).commit();
const outMoney = await Engine.from("1234567.89").commit();
const outSlice = await Engine.from("1000000.00").commit();

await bench("output/toStringNumber", 100_000, () => out100.toStringNumber());
await bench("output/toScaledBigInt", 100_000, () => out100.toScaledBigInt({ decimalPrecision: 2 }));
await bench("output/toRawInternalNumber", 100_000, () => out100.toRawInternalNumber());
await bench("output/toUnicode", 50_000, () => out100.toUnicode());
await bench("output/toLaTeX", 50_000, () => out100.toLaTeX());
await bench("output/toMonetary", 50_000, () => outMoney.toMonetary());
await bench("output/toMonetary_burst_5_locales", 1, () => {
    const locales = ["pt-BR", "en-US", "de-DE", "ja-JP", "fr-FR"] as const;
    for (let i = 0; i < 100_000; i++) outMoney.toMonetary({ locale: locales[i % locales.length] });
});
await bench("output/toSlice_3", 50_000, () => out100.toSlice(3));
await bench("output/toSlice_100k", 3, () => outSlice.toSlice(100_000, { decimalPrecision: 10 }));
await bench("output/toSliceByRatio_4", 20_000, () => out100.toSliceByRatio(["5%", "70%", "3.64%", "21.36%"]));
await bench("output/toVerbalA11y_pt", 20_000, () => out100.toVerbalA11y({ locale: "pt-BR" }));
await bench("output/toMermaid_100", 2_000, () => out100.toMermaidGraph());
await bench("output/toJSON_formats", 20_000, () => out100.toJSON(["toMonetary", "toUnicode", "toScaledBigInt"]));
await bench("output/toCustomOutput_100k", 1, () => {
    for (let i = 0; i < 100_000; i++) out100.toCustomOutput((ctx) => `Result: ${ctx.result.n}/${ctx.result.d}`);
});

// Cache frio: cada iteração usa um `Output` distinto (o TS memoiza por instância).
const COLD = 2_000;
const coldOutputs: any[] = [];
for (let i = 0; i < COLD + 1; i++) coldOutputs.push(await Engine.from(100 + i).add(50).commit());
let coldIdx = 0;
await bench("output/toLaTeX_cold", COLD, () => coldOutputs[coldIdx++].toLaTeX());
coldIdx = 0;
await bench("output/toUnicode_cold", COLD, () => coldOutputs[coldIdx++].toUnicode());
coldIdx = 0;
await bench("output/toMermaid_cold", COLD, () => coldOutputs[coldIdx++].toMermaidGraph());
await bench("output/render_nested_100", 500, async () => {
    let b = Engine.from("1");
    for (let i = 0; i < 100; i++) b = Engine.from("1").div(b.add("1"));
    const o = await b.commit();
    return o.toLaTeX() + o.toUnicode();
});

const meta5000 = await (async () => {
    let b = Engine.from(1000);
    for (let i = 0; i < 5_000; i++) b = b.setMetadata(`audit_log_entry_id_${i}`, `hash_${i.toString(16)}`);
    return await b.commit();
})();
await bench("output/mermaid_5000_metadata", 3, () => meta5000.toMermaidGraph());
await bench("output/mermaid_pii_redaction", 2_000, async () => {
    const o = await Sensitive.from(100).setMetadata("user_email", "user@example.com").setMetadata("public_info", "OK").commit();
    return o.toMermaidGraph();
});

// ───────────────────────── Stress (stress/stress_1,2,3) ─────────────────────────

const primes100 = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251,
    257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397,
    401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541,
];
await bench("stress/primorial_sum_100", 20, async () => {
    let b = Engine.from(0);
    for (const p of primes100) b = b.add(`1/${p}`);
    return await b.commit();
});
await bench("stress/mult_avalanche_900k", 2, async () => {
    const part = Engine.from(2).pow(225_000);
    return await part.mult(part).mult(part).mult(part).commit();
});
await bench("stress/overflow_detect_1m", 2, async () => {
    try {
        await Engine.from(2).pow(500_000).mult(Engine.from(2).pow(500_001)).commit();
    } catch {
        /* esperado: math-overflow */
    }
});
await bench("stress/power_tower", 20, async () => await Engine.from(1.1).pow(Engine.from(2).pow(4)).commit());
await bench("stress/roots_nested_huge", 2, async () => {
    const huge = Engine.from(2).pow(900_000);
    return await huge.pow("1/100").pow("1/2").pow("1/2").commit();
});
await bench("stress/hydra_50x3", 2, async () => {
    const WIDTH = 50;
    const createLevel = (depth: number): any => {
        if (depth === 0) return 1.0001;
        let b = Engine.from(createLevel(depth - 1));
        for (let i = 1; i < WIDTH; i++) b = b.add(createLevel(depth - 1));
        return b;
    };
    return await createLevel(3).commit();
});
await bench("stress/supernova_primorial", 10, async () => {
    let b = Engine.from(1);
    let productOfPrimes = 1n;
    for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n]) {
        productOfPrimes *= p;
        b = b.add(`1/${productOfPrimes}`).pow(2);
    }
    return await b.commit();
});

// ───────────────────────── Codecs (bench_rigor, builder/persistence) ─────────────────────────

const deep = await (async () => {
    let chainB = Engine.from(1);
    for (let i = 0; i < 25; i++) chainB = chainB.add(1).setMetadata(`step_${i}`, i);
    return await chainB.commit();
})();
await bench("codec/msgpack_roundtrip", 2_000, () => msgpackHydrator(deep.toCustomOutput(msgpackProcessor)));
await bench("codec/protobuf_roundtrip", 2_000, () => protobufHydrator(deep.toCustomOutput(protobufProcessor)));
await bench("codec/json_audit_trace", 2_000, () => deep.toAuditTrace());

// ─────────────────────────────── Saída ───────────────────────────────

const payload = {
    engine: "deno",
    version: Deno.version.deno,
    v8: Deno.version.v8,
    timestamp: new Date().toISOString(),
    results,
};
await Deno.mkdir("bench/results", { recursive: true });
await Deno.writeTextFile("bench/results/ts.json", JSON.stringify(payload, null, 2));
console.log(`\n[ts] ${Object.keys(results).length} benchmarks gravados em bench/results/ts.json`);
