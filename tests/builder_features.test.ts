import { beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { CalcAUY } from "@src/builder.ts";
import { getSubLogger } from "@src/utils/logger.ts";
import { securityPolicy } from "@src/utils/sanitizer.ts"; // Import securityPolicy

// Type for valid log levels
type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "fatal";

// Mock logger.isEnabledFor for testing logging calls.
const engineLogger = getSubLogger("engine");
const originalIsEnabledFor = engineLogger.isEnabledFor;
let originalSecurityPolicySensitive = securityPolicy.sensitive; // Store original state

describe("CalcAUY Builder Features", () => {
    // Restore mocks and logging policy after each test
    beforeEach(() => {
        engineLogger.isEnabledFor = originalIsEnabledFor;
        securityPolicy.sensitive = originalSecurityPolicySensitive; // Reset security policy
        originalSecurityPolicySensitive = securityPolicy.sensitive; // Update original state for next test
    });

    describe("setSecurityPolicy", () => {
        it("deve definir a política de segurança global e retornar a classe CalcAUY para encadeamento", () => {
            // Ensure initial state is sensitive (default)
            securityPolicy.sensitive = true;

            const returnedClass = CalcAUY.setSecurityPolicy({ sensitive: false });

            // Assert that the method returns the class itself for chaining
            assertEquals(returnedClass, CalcAUY);

            // Assert that securityPolicy was effectively changed
            assertEquals(securityPolicy.sensitive, false, "Security policy should have been updated to non-sensitive");
        });
    });

    describe("CalcAUY.from(value)", () => {
        it("deve retornar a mesma instância se o valor de entrada já for uma instância de CalcAUY", async () => {
            const originalCalc = CalcAUY.from(10);
            const newCalc = CalcAUY.from(originalCalc);
            assertEquals(newCalc, originalCalc); // Referential equality
        });

        it("deve criar uma nova instância se o valor de entrada não for uma instância de CalcAUY", async () => {
            const newCalc = CalcAUY.from(10);
            assert(newCalc instanceof CalcAUY);
        });

        it("deve chamar logger.debug quando uma nova instância é criada e o debug está habilitado", async () => {
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
        it("deve anexar metadados ao nó da AST e retornar uma nova instância de CalcAUY", async () => {
            const initialCalc = CalcAUY.from(10);
            const key = "testKey";
            const value = "testValue";
            const newCalc = initialCalc.setMetadata(key, value);

            assert(newCalc !== initialCalc, "setMetadata should return a new instance (referential inequality)"); // Check referential inequality
            const newAstMetadata = (JSON.parse(await newCalc.hibernate()) as any).data.metadata;
            assert(newAstMetadata, "Metadata should exist on the new AST");
            assertEquals(newAstMetadata[key], value, "Metadata should be attached to the new instance");

            const initialAstMetadata = (JSON.parse(await initialCalc.hibernate()) as any).data.metadata;
            assertEquals(
                initialAstMetadata,
                undefined,
                "Original instance should remain immutable (no metadata added)",
            );
        });

        it("deve chamar logger.debug quando metadados são anexados e o debug está habilitado", async () => {
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
        it("deve realizar a operação de subtração corretamente", async () => {
            const result = await CalcAUY.from(10).sub(5).commit();
            assertEquals(result.toStringNumber(), "5.00");
        });

        it("deve realizar a subtração com uma instância CalcAUY como entrada", async () => {
            const subValue = CalcAUY.from(3);
            const result = await CalcAUY.from(10).sub(subValue).commit();
            assertEquals(result.toStringNumber(), "7.00");
        });

        it("deve chamar logger.debug quando um nó de operação é anexado e o debug está habilitado", async () => {
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
