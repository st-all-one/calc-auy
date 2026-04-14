import { beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { CalcAUYError, ErrorCategory, ErrorContext } from "@src/core/errors.ts";
import { getSubLogger } from "@src/utils/logger.ts";
import { loggingPolicy } from "@src/utils/sanitizer.ts"; // Import loggingPolicy

// Type for valid log levels
type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "fatal";

// Mock logger.isEnabledFor for testing logging calls.
const errorLogger = getSubLogger("error");
const originalIsEnabledFor = errorLogger.isEnabledFor;
const originalLoggingPolicySensitive = loggingPolicy.sensitive; // Store original state

describe("CalcAUYError - Gerenciamento de Erros e Telemetria", () => {
    // Restore mocks and logging policy after each test
    beforeEach(() => {
        errorLogger.isEnabledFor = originalIsEnabledFor;
        loggingPolicy.sensitive = originalLoggingPolicySensitive; // Reset logging policy
    });

    it("deve criar um CalcAUYError com propriedades RFC 7807 corretas e serializá-lo via toJSON", () => {
        const category: ErrorCategory = "division-by-zero";
        const detail = "Divisão por zero não permitida.";
        const context: ErrorContext = { operation: "div", rawInput: "1/0", sensitiveData: "secret" };

        const err = new CalcAUYError(category, detail, context);

        assertEquals(err.name, "CalcAUYError");
        assertStringIncludes(err.type, `calc-auy/${category}`);
        assertEquals(err.detail, detail);
        assertEquals(err.context, context); // Context should be raw in the error object itself
        assert(
            typeof err.instance === "string" && err.instance.startsWith("urn:uuid:"),
            "Instance should be a UUID URN",
        );

        // Check title and status mapping
        assertEquals(err.title, "Divisão por Zero Detectada");
        assertEquals(err.status, 422);

        // Test toJSON serialization
        const json = err.toJSON();
        assertEquals(json.type, err.type);
        assertEquals(json.title, err.title);
        assertEquals(json.status, err.status);
        assertEquals(json.detail, err.detail);
        assertEquals(json.instance, err.instance);
        assertEquals(json.context, err.context); // toJSON should return raw context here
    });

    it("deve chamar logger.error quando um CalcAUYError é construído e o logger está habilitado", () => {
        let errorCalled = false;
        let loggedMessage: string | null = null;
        let loggedPayload: any = null;

        // Ensure logging policy is sensitive by default
        loggingPolicy.sensitive = true;

        // Mock isEnabledFor to enable logging
        errorLogger.isEnabledFor = (level: LogLevel) => {
            if (level === "error") {
                return true;
            }
            return originalIsEnabledFor(level);
        };

        // Mock logger.error to capture arguments
        const originalErrorMethod = errorLogger.error;
        errorLogger.error = ((message: string, payload: any) => { // Use as any to bypass type checking
            errorCalled = true;
            loggedMessage = message;
            loggedPayload = payload;
        }) as any;

        const category: ErrorCategory = "unsupported-type";
        const detail = "Tipo não suportado para operação.";
        const context: ErrorContext = { operation: "sum", rawInput: 123, sensitiveData: "some_secret" };

        new CalcAUYError(category, detail, context);

        assert(errorCalled, "logger.error should have been called");
        assertEquals(loggedMessage, "CalcAUY Exception Triggered");
        assert(loggedPayload !== null, "Logged payload should not be null");
        assertEquals(loggedPayload.error_type, `calc-auy/${category}`);
        // This is a direct comparison, so ensure instance ID is the same
        assert(loggedPayload.instance !== undefined, "Instance ID should be present");
        assertEquals(loggedPayload.detail, detail);

        // Assert that context is sanitized
        assertEquals(loggedPayload.context.rawInput, "[PII]"); // rawInput is explicitly sensitive
        assertEquals(loggedPayload.context.operation, context.operation); // Operation is not PII
        assertEquals(loggedPayload.context.sensitiveData, context.sensitiveData); // Not in the redaction list

        // Restore original logger.error method
        errorLogger.error = originalErrorMethod;
    });

    it("não deve chamar logger.error quando o logger está desabilitado para o nível 'error'", () => {
        let errorCalled = false;

        // Mock isEnabledFor to disable logging
        errorLogger.isEnabledFor = (level: LogLevel) => {
            if (level === "error") {
                return false;
            }
            return originalIsEnabledFor(level);
        };

        // Mock logger.error to check if it's called
        const originalErrorMethod = errorLogger.error;
        errorLogger.error = (() => { // Use as any to bypass type checking
            errorCalled = true;
        }) as any;

        new CalcAUYError("invalid-syntax", "Sintaxe inválida.");

        assertEquals(errorCalled, false, "logger.error should NOT have been called");

        // Restore original logger.error method
        errorLogger.error = originalErrorMethod;
    });
});
