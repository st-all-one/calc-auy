
import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { sanitizeAST, setGlobalLoggingPolicy } from "../src/utils/sanitizer.ts";
import type { OperationNode } from "../src/ast/types.ts";

const REDACTED = "[PII]";

describe("Reproduction of PII Sanitization Issue", () => {
    it("should propagate 'pii: false' to literals but not necessarily to other operations, AND hide operations when they are sensitive", () => {
        setGlobalLoggingPolicy({ sensitive: true });

        // pow(100, 3/7)
        const powNode: OperationNode = {
            kind: "operation",
            type: "pow",
            operands: [
                { kind: "literal", value: { n: "100", d: "1" }, originalInput: "100" },
                { kind: "literal", value: { n: "3", d: "7" }, originalInput: "3/7" },
            ]
        };

        // add(powNode, 3)
        const addNode: OperationNode = {
            kind: "operation",
            type: "add",
            operands: [
                powNode,
                { kind: "literal", value: { n: "3", d: "1" }, originalInput: "3" },
            ],
            metadata: { pii: false } // User explicitly marked this operation as safe
        };

        const sanitized = sanitizeAST(addNode) as any;

        console.log("Sanitized Add Node:", JSON.stringify(sanitized, null, 2));

        // CURRENT BEHAVIOR (as reported):
        // 1. addNode.metadata is visible (CORRECT, pii: false)
        // 2. addNode.type is "add" (CORRECT)
        // 3. literal "3" is REDACTED (INCORRECT, user wants it visible)
        // 4. powNode.type is "pow" (INCORRECT, user wants it hidden because it's sensitive)
        // 5. powNode literals are REDACTED (CORRECT)

        assertEquals(sanitized.metadata.pii, false, "Metadata pii: false should be visible");
        
        // Literal "3" check
        assertEquals(sanitized.operands[1].value.n, "3", "Literal '3' should be visible because parent is pii: false");

        // Pow node check
        // If the user wants pow "ocultado", it should probably be REDACTED completely or have type REDACTED.
        assertEquals(sanitized.operands[0].type, REDACTED, "Pow operation should be redacted if it's sensitive");
    });
});
