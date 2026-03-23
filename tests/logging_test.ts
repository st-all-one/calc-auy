import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { configure, type LogRecord, type Sink } from "@logtape";
import { CurrencyNBR } from "../src/main.ts";
import { getFileSink } from "@logtape/file";

describe("CurrencyNBR Logging System", () => {
    const records: LogRecord[] = [];
    const testSink: Sink = (record: LogRecord) => {
        records.push(record);
    };

    // Configuração inicial do Logtape para os testes
    configure({
        sinks: {
            test: testSink,
            console: getFileSink("my-app.log"),
        },
        filters: {},
        loggers: [
            { category: ["currency-nbr-a11y"], sinks: ["test", "console"], lowestLevel: "debug" },
        ],
    });

    describe("Input and Engine", () => {
        it("should log initialization (input) and operations (engine) correctly", () => {
            records.length = 0;
            const val = CurrencyNBR.from("100").add(50);
            val.commit();

            const categories = records.map((r) => r.category.join("."));

            expect(categories.some((c) => c.includes("input"))).toBe(true);
            expect(categories.some((c) => c.includes("engine.add"))).toBe(true);
            expect(categories.some((c) => c.includes("engine.commit"))).toBe(true);

            const engineLog = records.find((r) => r.category.join(".").includes("engine.add"));
            expect(engineLog).toBeDefined();
            expect(engineLog?.properties.calcTime).toBeDefined();
            expect(typeof engineLog?.properties.calcTime).toBe("number");
        });
    });

    describe("Output Methods", () => {
        it("should log output formatting details (toString, toMonetary, toLaTeX)", () => {
            records.length = 0;
            const val = CurrencyNBR.from("100").commit();

            val.toString();
            val.toMonetary();
            val.toLaTeX();

            const toStringLog = records.find((r) => r.category.join(".").includes("output.string"));
            const toMonetaryLog = records.find((r) => r.category.join(".").includes("output.toMonetary"));
            const toLaTeXLog = records.find((r) => r.category.join(".").includes("output.toLaTeX"));

            expect(toStringLog).toBeDefined();
            expect(toStringLog?.properties.result).toBe("100.000000");

            expect(toMonetaryLog).toBeDefined();
            expect(toMonetaryLog?.properties.locale).toBe("pt-BR");

            expect(toLaTeXLog).toBeDefined();
            expect(toLaTeXLog?.properties.result).toContain("$$");
        });
    });

    describe("Error Handling", () => {
        it("should log errors with RFC 7807 structure and math_audit details", () => {
            records.length = 0;
            try {
                CurrencyNBR.from("100").div(0);
            } catch {
                // erro esperado
            }

            const errorLog = records.find(
                (r) => r.level === "error" && r.category.join(".").includes("errors"),
            );

            expect(errorLog).toBeDefined();
            expect(errorLog?.properties.title).toBe("Operação Matemática Inválida");
            expect(errorLog?.properties.math_audit).toBeDefined();
            expect(errorLog?.properties.type).toContain("division-by-zero");
        });
    });
});
