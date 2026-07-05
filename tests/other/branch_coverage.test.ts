import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";
import { RationalNumber } from "@src/core/rational.ts";
import { applyRounding } from "@src/core/rounding.ts";
import { htmlProcessor } from "@processor/html/processor.html.ts";
import { configure, getConsoleSink } from "@logtape";
import { logger, startSpan, TelemetrySpan } from "@src/utils/logger.ts";
import { getLocale } from "@src/output_internal/i18n.ts";
import { CalcAUY } from "@src/main.ts";
import { CalcAUYError } from "@src/core/errors.ts";
import { imageBufferProcessor } from "@processor/image-buffer/processor.imagebuffer.ts";
import { toSubscript, toSuperscript } from "@src/output_internal/unicode.ts";
import { renderAST } from "@src/output_internal/renderer.ts";

describe("Branch Coverage: Rodada Especial", () => {
    it("Rounding: HALF_UP branches", () => {
        // absRemainder * 2n < val.d
        const r1 = RationalNumber.from("1.4");
        assertEquals(applyRounding(r1, "HALF_UP", 0).toJSON().n, "1");

        // Negative adjustment (val.n < 0n)
        const r2 = RationalNumber.from("-1.6");
        assertEquals(applyRounding(r2, "HALF_UP", 0).toJSON().n, "-2");
    });

    it("Rounding: HALF_EVEN tie-breaking branches", () => {
        // absRemainder * 2n === val.d, isEven
        const r1 = RationalNumber.from("2.5"); // integralPart 2, isEven true
        assertEquals(applyRounding(r1, "HALF_EVEN", 0).toJSON().n, "2");

        // absRemainder * 2n === val.d, !isEven
        const r2 = RationalNumber.from("1.5"); // integralPart 1, isEven false
        assertEquals(applyRounding(r2, "HALF_EVEN", 0).toJSON().n, "2");

        // Negative tie-break
        const r3 = RationalNumber.from("-2.5"); // integralPart -2, lastDigit 2, isEven true
        assertEquals(applyRounding(r3, "HALF_EVEN", 0).toJSON().n, "-2");

        const r4 = RationalNumber.from("-1.5"); // integralPart -1, lastDigit 1, isEven false
        assertEquals(applyRounding(r4, "HALF_EVEN", 0).toJSON().n, "-2");

        // absRemainder * 2n > val.d
        const r5 = RationalNumber.from("1.6");
        assertEquals(applyRounding(r5, "HALF_EVEN", 0).toJSON().n, "2");
    });

    it("Rounding: TRUNCATE, CEIL, NONE branches", () => {
        const r1 = RationalNumber.from("1.9");
        assertEquals(applyRounding(r1, "TRUNCATE", 0).toJSON().n, "1");
        assertEquals(applyRounding(r1, "CEIL", 0).toJSON().n, "2");
        // NONE returns the same value
        assertEquals(applyRounding(r1, "NONE", 0).toJSON().n, "19");
        assertEquals(applyRounding(r1, "NONE", 0).toJSON().d, "10");
    });

    it("Rounding: getPowerOf10 large p branch", () => {
        const r1 = RationalNumber.from("1/3");
        // p > 128 (CACHE_ARRAY_SIZE)
        const p = 130;
        const rounded = applyRounding(r1, "HALF_UP", p);
        // Should use 10^130
        assertEquals(rounded.toJSON().d, (10n ** 130n).toString());
    });

    it("HTML Processor: optional branches", () => {
        const mockAudit = {
            latex: "1+1",
            verbal: "um mais um",
            ast: {} as any,
            finalResult: "2",
            roundStrategy: "NONE" as any,
            contextLabel: "test",
            signature: "sig",
        };
        const mockMethods = {
            toLiveTrace: () => mockAudit,
        };

        // @ts-ignore
        const ctxWithOpts = {
            audit: mockAudit,
            methods: mockMethods,
            options: {
                containerClass: "my-custom-class",
                katexOptions: { displayMode: false },
            },
        };

        // @ts-ignore
        const html = htmlProcessor(ctxWithOpts as any);
        assertEquals(html.includes("my-custom-class"), true);
    });

    it("Unicode: fallback branches", () => {
        assertEquals(toSuperscript("z"), "z"); // Not in map
        assertEquals(toSubscript("z"), "z"); // Not in map
    });

    it("Logger: disabled level branch", async () => {
        // @ts-ignore
        await configure({
            sinks: { console: getConsoleSink() },
            filters: {},
            loggers: [{ category: ["calc-auy"], lowestLevel: "warning", sinks: ["console"] }],
            reset: true,
        });

        logger.info("Should not be logged but hits branch coverage");
        // @ts-ignore
        assertEquals(startSpan("test", logger), undefined);

        // Manual TelemetrySpan to hit dispose with disabled info
        const spanDisabled = new TelemetrySpan("test", logger, {});
        // @ts-ignore
        spanDisabled[Symbol.dispose]();

        // @ts-ignore
        await configure({
            sinks: { console: getConsoleSink() },
            filters: {},
            loggers: [{ category: ["calc-auy"], lowestLevel: "debug", sinks: ["console"] }],
            reset: true,
        });

        // startSpan with default options
        const span = startSpan("test", logger);
        if (span) {
            // @ts-ignore
            span[Symbol.dispose]();
        }
    });

    it("i18n: getLocale branches", () => {
        // Default param
        const loc1 = getLocale();
        assertEquals(loc1.locale, "pt-BR");

        // Fallback
        // @ts-ignore
        const loc2 = getLocale("invalid");
        assertEquals(loc2.locale, "pt-BR");
    });

    it("Output: toJSON branches", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });
        const res = await engine.from(10).commit();

        // forcing branches: toSlice, toJSON
        // @ts-ignore
        const json = res.toJSON(["toSlice", "toJSON", "toCustomOutput", "toStringNumber"]);
        const parsed = JSON.parse(json);
        assertEquals(parsed.toSlice, undefined);
        assertEquals(parsed.toJSON, undefined);
        assertEquals(parsed.toCustomOutput, undefined);
        assertEquals(parsed.toStringNumber, "10.00");
    });

    it("Errors: branches with cause and context", () => {
        const err = new CalcAUYError("corrupted-node", "msg", { ast: { x: 1 } }, { cause: new Error("base") });
        assertEquals((err.context.ast as any).x, 1);
        assertEquals(err.toJSON().detail, "msg");
    });

    it("Builder: branches coverage", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });

        // from(instance) same instance id branch
        const b1 = engine.from(10);
        const b1_again = b1.from(b1);
        assertEquals(b1 === b1_again, true);

        // from(value) on non-empty builder
        const b2 = b1.from(20); // Hits op("add", value) in from()
        assertEquals((await b2.commit()).toStringNumber(), "30.00");

        // parseExpression on non-empty
        const b4 = b1.parseExpression(" + 20");
        assertEquals((await b4.commit()).toStringNumber(), "30.00");

        // Caching in from()
        const b5 = engine.from(50);
        const b6 = engine.from(50);
        assertEquals((await b5.commit()).toStringNumber(), "50.00");
        assertEquals((await b6.commit()).toStringNumber(), "50.00");

        // Enable debug log to hit Metadata Attached branch
        // @ts-ignore
        await configure({
            sinks: { console: getConsoleSink() },
            filters: {},
            loggers: [{ category: ["calc-auy"], lowestLevel: "debug", sinks: ["console"] }],
            reset: true,
        });
        const b7 = engine.from(100).setMetadata("test", true);
        assertEquals((await b7.commit()).toStringNumber(), "100.00");
    });

    it("Builder: hydrate edge branches", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });
        const res = await engine.from(10).commit();
        const trace = res.toLiveTrace();

        // hydrate an audit trace (contains finalResult and roundStrategy)
        const rehydrated = await engine.hydrate(trace);
        assertEquals((await rehydrated.commit()).toStringNumber(), "10.00");

        // hydrate with explicit salt/encoder
        const rehydrated2 = await engine.hydrate(trace, { salt: "s", encoder: "HEX" });
        assertEquals((await rehydrated2.commit()).toStringNumber(), "10.00");
    });

    it("Builder: hydrate without signature", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });
        // @ts-ignore
        await assertRejects(() => engine.hydrate({ ast: {} }), CalcAUYError, "Signature missing");
    });

    it("Renderer: fallback branches", () => {
        const loc = getLocale("pt-BR");
        const node = {
            kind: "operation",
            type: "add",
            operands: [
                { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" },
                { kind: "literal", value: { n: "2", d: "1" }, originalInput: "2" },
            ],
        } as any;

        // Hits lines 155-165
        // @ts-ignore
        const res = renderAST(node, "invalid", loc);
        assertEquals(res, "1 + 2");

        // nested groups in getRootInfo
        const nestedGroup = { kind: "group", child: { kind: "group", child: node } } as any;
        assertEquals(renderAST(nestedGroup, "unicode", loc), "((1 + 2))");
    });

    it("Mermaid: edge branches", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });

        // Invalid date types/values
        // @ts-ignore
        const res1 = await engine.from(10).setMetadata("timestamp", 123).commit();
        const m1 = res1.toMermaidGraph();
        assertEquals(m1.includes("Signature"), true);

        // @ts-ignore
        const res2 = await engine.from(10).setMetadata("timestamp", "invalid-date").commit();
        const m2 = res2.toMermaidGraph();
        assertEquals(m2.includes("Signature"), true);
    });

    it("Image Processor: sqrt branch", async () => {
        const engine = CalcAUY.create({ contextLabel: "test", salt: "s" });
        const res = await engine.from(4).pow("1/2").commit();
        const buf = await res.toCustomOutput(imageBufferProcessor);
        assertEquals(buf instanceof Uint8Array, true);
    });
});
