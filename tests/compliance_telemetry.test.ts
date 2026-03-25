import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { configure, type LogRecord, type Sink } from "@logtape";
import { CalcAUD } from "../mod.ts";
import { CalcAUDError } from "../src/errors.ts";

describe("Compliance e Telemetria (Integration)", () => {
    const records: LogRecord[] = [];
    const testSink: Sink = (record: LogRecord) => {
        records.push(record);
    };

    // Configuração inicial do Logtape para os testes
    configure({
        sinks: { test: testSink },
        filters: {},
        loggers: [
            {
                category: ["calcaud-nbr-a11y"],
                sinks: ["test"],
                lowestLevel: "debug",
            },
        ],
    });

    describe("RFC 7807 Compliance", () => {
        it("deve validar se todos os erros lançados possuem campos obrigatórios RFC 7807", () => {
            try {
                CalcAUD.from("INVALID");
            } catch (e) {
                if (e instanceof CalcAUDError) {
                    expect(e.type).toContain("errors/invalid-numeric-format");
                    expect(e.title).toBeDefined();
                    expect(e.status).toBeGreaterThanOrEqual(400);
                    expect(e.detail).toBeDefined();
                    expect(e.instance).toMatch(/^audit:err:[a-f0-9-]+$/);

                    const json = e.toJSON();
                    expect(json.type).toBe(e.type);
                    expect(json.instance).toBe(e.instance);
                } else {
                    throw new Error("Deveria ser CalcAUDError");
                }
            }
        });

        it("Math Audit Proof: deve validar injeção de LaTeX parcial no erro de divisão por zero", () => {
            try {
                CalcAUD.from(100).div(0);
            } catch (e) {
                if (e instanceof CalcAUDError) {
                    expect(e.math_audit?.latex).toBe("\\frac{100}{0}");
                    expect(e.math_audit?.unicode).toBe("100 ÷ 0");
                    expect(e.math_audit?.operation).toBe("division");
                }
            }
        });
    });

    describe("Logtape Telemetry", () => {
        it("deve disparar logs de nível DEBUG com metadados estruturados para operações", () => {
            records.length = 0;
            CalcAUD.from(100).add(50).commit();

            const inputLog = records.find((r) => r.category.join(".") === "calcaud-nbr-a11y.input.from");
            const engineLog = records.find((r) => r.category.join(".") === "calcaud-nbr-a11y.engine.add");

            expect(inputLog).toBeDefined();
            expect(inputLog?.level).toBe("debug");
            expect(inputLog?.properties.value).toBe("100");

            expect(engineLog).toBeDefined();
            expect(engineLog?.level).toBe("debug");
        });
    });

    describe("Proteção de PII", () => {
        it("deve garantir que nenhuma string não numérica passada vaze para logs de erro", () => {
            records.length = 0;
            const pii = "CONFIDENTIAL_PII_12345";
            try {
                CalcAUD.from(pii);
            } catch {
                // erro ignorado
            }

            const errorLogs = records.filter((r) => r.level === "error");
            for (const log of errorLogs) {
                const logString = JSON.stringify(log.properties);
                expect(logString).not.toContain(pii);
            }
        });

        it("deve garantir que PII não vaze para o LaTeX/Unicode em caso de erro", () => {
            const pii = "PII_IN_NON_NUMERIC";
            try {
                CalcAUD.from(pii);
            } catch (e) {
                if (e instanceof CalcAUDError) {
                    const auditString = JSON.stringify(e.math_audit);
                    expect(auditString).not.toContain(pii);
                    expect(e.detail).not.toContain(pii);
                }
            }
        });
    });
});
