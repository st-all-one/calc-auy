import { beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { CalcAUY } from "@src/builder.ts";
import { getSubLogger } from "@src/utils/logger.ts";
import { loggingPolicy } from "@src/utils/sanitizer.ts"; // Import loggingPolicy

// Type for valid log levels
type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "fatal";

// Mock logger.isEnabledFor for testing logging calls.
const engineLogger = getSubLogger("engine");
const originalIsEnabledFor = engineLogger.isEnabledFor;
let originalLoggingPolicySensitive = loggingPolicy.sensitive; // Store original state

describe("CalcAUY Builder Features", () => {
    // Restore mocks and logging policy after each test
    beforeEach(() => {
        engineLogger.isEnabledFor = originalIsEnabledFor;
        loggingPolicy.sensitive = originalLoggingPolicySensitive; // Reset logging policy
        originalLoggingPolicySensitive = loggingPolicy.sensitive; // Update original state for next test
    });

    describe("setLoggingPolicy", () => {
        it("deve definir a política de logging global e retornar a própria instância de CalcAUY para encadeamento", () => {
            const initialInstance = CalcAUY.from(100);
            const policy = { sensitive: false }; // Test with sensitive: false

            // Ensure initial state is sensitive (default)
            assertEquals(loggingPolicy.sensitive, true, "Initial logging policy should be sensitive");

            const returnedInstance = initialInstance.setLoggingPolicy(policy);

            // Assert that the method returns the instance itself for chaining
            assertEquals(returnedInstance, initialInstance);

            // Assert that setGlobalLoggingPolicy was effectively called and changed the policy
            assertEquals(loggingPolicy.sensitive, false, "Logging policy should have been updated to non-sensitive");
        });
    });

    describe("CalcAUY.from(value)", () => {
        it("deve retornar a mesma instância se o valor de entrada já for uma instância de CalcAUY", () => {
            const originalCalc = CalcAUY.from(10);
            const newCalc = CalcAUY.from(originalCalc);
            assertEquals(newCalc, originalCalc); // Referential equality
        });

        it("deve criar uma nova instância se o valor de entrada não for uma instância de CalcAUY", () => {
            const newCalc = CalcAUY.from(10);
            assert(newCalc instanceof CalcAUY);
        });

        it("deve chamar logger.debug quando uma nova instância é criada e o debug está habilitado", () => {
            let debugCalled = false;
            engineLogger.isEnabledFor = (level: LogLevel) => {
                if (level === "debug") {
                    debugCalled = true;
                    return true;
                }
                return originalIsEnabledFor(level);
            };

            CalcAUY.from(50);
            assertEquals(debugCalled, true, "logger.debug should have been called");
        });
    });

    describe("setMetadata", () => {
        it("deve anexar metadados ao nó da AST e retornar uma nova instância de CalcAUY", () => {
            const initialCalc = CalcAUY.from(10);
            const key = "testKey";
            const value = "testValue";
            const newCalc = initialCalc.setMetadata(key, value);

            assert(newCalc !== initialCalc, "setMetadata should return a new instance (referential inequality)"); // Check referential inequality
            const newAstMetadata = (JSON.parse(newCalc.hibernate()) as any).metadata;
            assert(newAstMetadata, "Metadata should exist on the new AST");
            assertEquals(newAstMetadata[key], value, "Metadata should be attached to the new instance");

            const initialAstMetadata = (JSON.parse(initialCalc.hibernate()) as any).metadata;
            assertEquals(
                initialAstMetadata,
                undefined,
                "Original instance should remain immutable (no metadata added)",
            );
        });

        it("deve chamar logger.debug quando metadados são anexados e o debug está habilitado", () => {
            let debugCalled = false;
            engineLogger.isEnabledFor = (level: LogLevel) => {
                if (level === "debug") {
                    debugCalled = true;
                    return true;
                }
                return originalIsEnabledFor(level);
            };

            CalcAUY.from(10).setMetadata("key", "value");
            assertEquals(debugCalled, true, "logger.debug should have been called for metadata attachment");
        });
    });

    describe("sub(value)", () => {
        it("deve realizar a operação de subtração corretamente", () => {
            const result = CalcAUY.from(10).sub(5).commit();
            assertEquals(result.toStringNumber(), "5.00");
        });

        it("deve realizar a subtração com uma instância CalcAUY como entrada", () => {
            const subValue = CalcAUY.from(3);
            const result = CalcAUY.from(10).sub(subValue).commit();
            assertEquals(result.toStringNumber(), "7.00");
        });

        it("deve chamar logger.debug quando um nó de operação é anexado e o debug está habilitado", () => {
            let debugCalled = false;
            engineLogger.isEnabledFor = (level: LogLevel) => {
                if (level === "debug") {
                    debugCalled = true;
                    return true;
                }
                return originalIsEnabledFor(level);
            };

            CalcAUY.from(10).sub(5);
            assertEquals(debugCalled, true, "logger.debug should have been called for node appended");
        });
    });
});
