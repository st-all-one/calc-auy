import type { CalculationNode } from "../ast/types.ts";
import type { CalcAUYLocaleA11y } from "../i18n/i18n.ts";
import { toSuperscript } from "../utils/unicode.ts";

/**
 * Helper to extract fractional power information from a node.
 */
function getRootInfo(node: CalculationNode): { num: string; den: string } | null {
    if (node.kind === "group") {
        return getRootInfo(node.child);
    }
    if (node.kind === "literal" && node.originalInput.includes("/")) {
        const parts = node.originalInput.split("/");
        if (parts.length === 2) {
            return { num: parts[0], den: parts[1] };
        }
    }
    return null;
}

/**
 * Recursively renders an AST node into a specific format.
 */
export function renderAST(
    node: CalculationNode,
    format: "latex" | "unicode" | "verbal",
    loc?: CalcAUYLocaleA11y,
    forceCaret = false,
): string {
    if (node.kind === "literal") {
        if (format === "latex" && node.originalInput.includes("/")) {
            const [n, d] = node.originalInput.split("/");
            return String.raw`\frac{${n}}{${d}}`;
        }
        return node.originalInput;
    }

    if (node.kind === "group") {
        const inner: string = renderAST(node.child, format, loc, forceCaret);
        if (format === "latex") { return String.raw`\left( ${inner} \right)`; }
        if (format === "verbal" && loc) { return `${loc.operators.group_start} ${inner} ${loc.operators.group_end}`; }
        return `(${inner})`;
    }

    const ops: string[] = node.operands.map((o, i) => {
        const isExp = node.type === "pow" && i === 1;
        const nextForce = format === "unicode" && isExp;
        return renderAST(o, format, loc, forceCaret || nextForce);
    });

    if (node.type === "pow") {
        const root = getRootInfo(node.operands[1]);
        if (root) {
            const { num, den } = root;
            if (format === "latex") {
                const inner = num === "1" ? ops[0] : String.raw`{${ops[0]}}^{${num}}`;
                return den === "2" ? String.raw`\sqrt{${inner}}` : String.raw`\sqrt[${den}]{${inner}}`;
            }
            if (format === "unicode") {
                let baseWithPow: string;
                if (num === "1") {
                    baseWithPow = ops[0];
                } else if (forceCaret) {
                    // Use caret to avoid ambiguity in nested superscripts
                    baseWithPow = `(${ops[0]}^${num})`;
                } else {
                    baseWithPow = `(${ops[0]}${toSuperscript(num)})`;
                }

                if (den === "2") { return `√${baseWithPow}`; }
                if (den === "3") { return `∛${baseWithPow}`; }
                if (den === "4") { return `∜${baseWithPow}`; }
                return `${toSuperscript(den)}√${baseWithPow}`;
            }
            if (format === "verbal" && loc) {
                const baseVerbal = num === "1" ? ops[0] : `${ops[0]} ${loc.operators.pow} ${num}`;
                if (den === "2") { return `${loc.phrases.root_square}${baseVerbal}`; }
                if (den === "3") { return `${loc.phrases.root_cubic}${baseVerbal}`; }
                const rootN = loc.phrases.root_n.replace("{den}", den);
                return `${rootN}${baseVerbal}`;
            }
        }
    }

    if (format === "latex") {
        if (node.type === "div") { return String.raw`\frac{${ops[0]}}{${ops[1]}}`; }
        if (node.type === "pow") { return String.raw`${ops[0]}^{${ops[1]}}`; }
        const symbols: Record<string, string> = {
            add: "+",
            sub: "-",
            mul: String.raw`\times`,
            mod: String.raw`\bmod`,
            divInt: "//",
        };
        return ops.join(` ${symbols[node.type]} `);
    }

    if (format === "unicode") {
        if (node.type === "pow") {
            if (forceCaret) {
                return `(${ops[0]}^${ops[1]})`;
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
