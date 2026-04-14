
import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals } from "jsr:@std/assert";
import { sanitizeAST } from "../src/utils/sanitizer.ts";
import type { OperationNode } from "../src/ast/types.ts";

const REDACTED = "[PII]";

describe("Reproduction of PII Sanitization Issue", () => {
    it("should show operation types even if sensitive, but hide literals", () => {
        const innerPowNode: OperationNode = {
            kind: "operation",
            type: "pow",
            operands: [
                { kind: "literal", value: { n: "2", d: "1" }, originalInput: "2" },
                { kind: "literal", value: { n: "10", d: "1" }, originalInput: "10" }
            ]
        };

        const rootAddNode: OperationNode = {
            kind: "operation",
            type: "add",
            operands: [
                innerPowNode,
                { kind: "literal", value: { n: "3", d: "1" }, originalInput: "3" }
            ],
            metadata: {
                pii: false
            }
        };

        const sanitized: any = sanitizeAST(rootAddNode);
        
        console.log("Sanitized Add Node:", JSON.stringify(sanitized, null, 2));

        assertEquals(sanitized.metadata.pii, false, "Metadata pii: false should be visible");

        // Literal "3" check (pii: false propagated to this literal because it's a direct child)
        assertEquals(sanitized.operands[1].value.n, "3", "Literal '3' should be visible because parent is pii: false");

        // Pow node check (it has no pii override, so it inherits global sensitive: true)
        const sPowNode = sanitized.operands[0];
        
        // Operation type MUST be visible now
        assertEquals(sPowNode.type, "pow", "Operation type should be visible");
        
        // Operands MUST be an array (not REDACTED)
        assertEquals(Array.isArray(sPowNode.operands), true, "Operands should be an array");

        // Inner literals MUST be REDACTED
        assertEquals(sPowNode.operands[0].originalInput, REDACTED, "Inner literal input should be protected");
        assertEquals(sPowNode.operands[1].value.n, REDACTED, "Inner literal value should be protected");
    });
});
