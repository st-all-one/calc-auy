import type { CalculationNode } from "../ast/types.ts";
import type { LocaleDefinition } from "../i18n/i18n.ts";
import { toSuperscript } from "../utils/unicode.ts";

/**
 * Recursively renders an AST node into a specific format.
 */
export function renderAST(
    node: CalculationNode,
    format: "latex" | "unicode" | "verbal",
    loc?: LocaleDefinition,
): string {
    if (node.kind === "literal") { return node.originalInput; }

    if (node.kind === "group") {
        const inner: string = renderAST(node.child, format, loc);
        if (format === "latex") { return `\\left( ${inner} \\right)`; }
        if (format === "verbal" && loc) { return `${loc.operators.group_start} ${inner} ${loc.operators.group_end}`; }
        return `(${inner})`;
    }

    const ops: string[] = node.operands.map((o) => renderAST(o, format, loc));

    if (format === "latex") {
        if (node.type === "div") { return `\\frac{${ops[0]}}{${ops[1]}}`; }
        const symbols: Record<string, string> = {
            add: "+",
            sub: "-",
            mul: "\\times",
            pow: "^",
            mod: "\\bmod",
            divInt: "//",
        };
        return ops.join(` ${symbols[node.type]} `);
    }

    if (format === "unicode") {
        if (node.type === "pow") {
            const expNode: CalculationNode = node.operands[1];
            if (expNode.kind === "literal" && expNode.originalInput.includes("/")) {
                const [num, den] = expNode.originalInput.split("/");

                if (num === "1") {
                    if (den === "2") { return `√(${ops[0]})`; }
                    if (den === "3") { return `∛(${ops[0]})`; }
                    if (den === "4") { return `∜(${ops[0]})`; }
                    return `${toSuperscript(den)}√(${ops[0]})`;
                }

                if (den === "2") { return `√(${ops[0]}${toSuperscript(num)})`; }
                if (den === "3") { return `∛(${ops[0]}${toSuperscript(num)})`; }
                if (den === "4") { return `∜(${ops[0]}${toSuperscript(num)})`; }
                return `${toSuperscript(den)}√(${ops[0]}${toSuperscript(num)})`;
            }
            return `${ops[0]}${toSuperscript(ops[1])}`;
        }
        const symbols: Record<string, string> = { add: "+", sub: "-", mul: "×", div: "÷", mod: "%", divInt: "//" };
        return ops.join(` ${symbols[node.type]} `);
    }

    if (format === "verbal" && loc) {
        return ops.join(` ${loc.operators[node.type]} `);
    }

    const symbols: Record<string, string> = {
        add: "+",
        sub: "-",
        mul: "*",
        div: "/",
        pow: "^",
        mod: "%",
        divInt: "//",
    };
    return ops.join(` ${symbols[node.type]} `);
}
