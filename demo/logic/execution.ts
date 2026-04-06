/**
 * CalcAUY Demo - Secure Expression Execution
 * @module
 */

import { CalcAUY, CalcAUYOutput } from "@calc-auy";

/**
 * Executes a calculation expression received as a string, ensuring auditability
 * and applying strict security locks for the demonstration environment.
 *
 * @param expression The string containing the TypeScript code to be executed.
 * @param req The original request object for header validation.
 * @returns Instance of CalcAUYOutput with the calculation result.
 */
export function executeExpression(
    expression: string,
    req: Request,
): CalcAUYOutput {
    // 1. Origin and Header Validation
    const requestedWith = req.headers.get("x-requested-with");
    if (requestedWith !== "CalcAUY-Demo") {
        throw new Error("Access denied: Direct calls not allowed.");
    }

    // 2. Security: Payload Size Limit
    if (expression.length > 2000) {
        throw new Error("Expression too long (Max 2000 characters).");
    }

    // 3. Core Syntax Security Validation
    if (!expression.trim().startsWith('CalcAUY.')) {
        throw new Error("Expression must start with 'CalcAUY.'");
    }
    if (!expression.includes(".commit(")) {
        throw new Error("Expression must contain '.commit(...)'");
    }

    // 4. Security Sandbox: Malicious Code Detection
    const forbidden = [
        "while",
        "for",
        "process",
        "Deno",
        "eval",
        "global",
        "window",
        "document",
        "fetch",
        "import",
    ];
    if (forbidden.some((word) => expression.includes(word))) {
        throw new Error("Unauthorized syntax detected.");
    }

    // 5. Resource Governance: Operations Limit
    const methodRegex = /\.(add|sub|mult|div|pow|mod|divInt|group)\b/g;
    const matches = expression.match(methodRegex);
    const count = matches ? matches.length : 0;

    if (count > 16) {
        throw new Error(
            `Operations limit exceeded. Max: 16. Found: ${count}.`,
        );
    }

    // 6. Controlled Execution
    try {
        const fn = new Function("CalcAUY", `return ${expression};`);
        const result = fn(CalcAUY);

        if (!(result instanceof CalcAUYOutput) && !(result instanceof CalcAUY)) {
            throw new Error(
                "Expression must return a CalcAUY or CalcAUYOutput instance",
            );
        }

        return result instanceof CalcAUY ? result.commit() : result;
    } catch (err) {
        throw new Error(`Execution error: ${(err as Error).message}`);
    }
}
