import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { CalcAUYError } from "@src/core/errors.ts";
import { CalcAUY } from "@src/main.ts";
import { attachOp, validateASTNode } from "@src/ast/builder_utils.ts";
import { evaluate } from "@src/ast/engine.ts";
import { renderAST } from "@src/output_internal/renderer.ts";
import { getLocale } from "@src/output_internal/i18n.ts";
import { RationalNumber } from "@src/core/rational.ts";

describe("Coverage: Rodada Final - 100% Target", () => {
    it("builder_utils: validateASTNode corruption paths", () => {
        // @ts-ignore
        assertThrows(() => validateASTNode("string"), CalcAUYError, "objeto válido");
        // @ts-ignore
        assertThrows(() => validateASTNode({ kind: "invalid" }), CalcAUYError, "Tipo de nó desconhecido");

        // Literal corrupto
        assertThrows(() => validateASTNode({ kind: "literal" }), CalcAUYError, "sem valor racional");
        assertThrows(() => validateASTNode({ kind: "literal", value: { n: 1, d: "1" } }), CalcAUYError, "malformado");

        // Group corrupto
        assertThrows(() => validateASTNode({ kind: "group" }), CalcAUYError, "sem nó filho");

        // Control corrupto
        assertThrows(() => validateASTNode({ kind: "control", type: "invalid" }), CalcAUYError, "inválido");
        assertThrows(
            () => validateASTNode({ kind: "control", type: "reanimation_event" }),
            CalcAUYError,
            "sem metadados",
        );
        assertThrows(
            () => validateASTNode({ kind: "control", type: "reanimation_event", metadata: {} }),
            CalcAUYError,
            "previousSignature faltando",
        );
        assertThrows(
            () => validateASTNode({ kind: "control", type: "reanimation_event", metadata: { previousSignature: "s" } }),
            CalcAUYError,
            "sem nó filho",
        );

        // Operation corrupto
        assertThrows(() => validateASTNode({ kind: "operation", type: "invalid" }), CalcAUYError, "inválido");
        assertThrows(() => validateASTNode({ kind: "operation", type: "add" }), CalcAUYError, "menos um operando");
        assertThrows(
            () => validateASTNode({ kind: "operation", type: "add", operands: [] }),
            CalcAUYError,
            "menos um operando",
        );

        // Node limit
        const s = { nodeCount: 999999, seen: new Set<unknown>() };
        assertThrows(
            () => validateASTNode({ kind: "literal", value: { n: "1", d: "1" } }, 0, s),
            CalcAUYError,
            "Número máximo de nós excedido",
        );

        // attachOp safety branch
        const lit = { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" } as any;
        const target = { kind: "operation", type: "pow", operands: [] } as any; // corrupted op without operands
        const res = attachOp(target, "pow", lit);
        assertEquals(res.kind, "operation");
    });

    it("Parser: branches faltantes", async () => {
        const engine = CalcAUY.create({ contextLabel: "p", salt: "s" });

        // Unexpected token at end
        assertThrows(() => engine.parseExpression("10 + 20 30"), CalcAUYError, "Token inesperado");

        // Unary PLUS
        const resUnary = await engine.parseExpression("+10").commit();
        assertEquals(resUnary.toStringNumber(), "10.00");

        // Percent suffix with edge cases
        const resPerc = await engine.parseExpression("10%").commit();
        assertEquals(resPerc.toStringNumber(), "0.10");
    });

    it("Builder: mixing contexts e adopts", async () => {
        const A = CalcAUY.create({ contextLabel: "A", salt: "s" });
        const B = CalcAUY.create({ contextLabel: "B", salt: "s" });
        const ca = A.from(10);
        const cb = B.from(20);

        // @ts-ignore
        assertThrows(() => ca.add(cb), CalcAUYError, "Attempted to mix instances");

        // Adopt AST from inner
        const inner = A.from(5).add(5);
        const outer = A.from(inner);
        assertEquals((await outer.commit()).toStringNumber(), "10.00");

        // Grouping already grouped
        const g = ca.group().group();
        assertEquals((await g.commit()).toStringNumber(), "10.00");

        // Max operands
        let large = A.from(1);
        for (let i = 0; i < 105; i++) {
            large = large.add(1);
        }
        assertEquals((await large.commit()).toStringNumber(), "106.00");
    });

    it("Mermaid: complex metadata", async () => {
        const engine = CalcAUY.create({ contextLabel: "m", salt: "s", locale: "pt-BR", sensitive: false });
        const res = await engine.from(10)
            .setMetadata("arr", [1, 2])
            .setMetadata("obj", { x: 1 })
            .setMetadata("long", "A".repeat(30))
            .setMetadata("timestamp", "invalid-date")
            .commit();

        const mermaid = res.toMermaidGraph();
        assertEquals(mermaid.includes("arr: [Lista"), true);
        assertEquals(mermaid.includes("obj: [Objeto]"), true);
        assertEquals(mermaid.includes("..."), true);
    });

    it("Renderer: superscripts e roots", async () => {
        const engine = CalcAUY.create({ contextLabel: "r", salt: "s" });
        const loc = getLocale("pt-BR");
        const lit = { kind: "literal", value: { n: "8", d: "1" }, originalInput: "8" } as any;

        // Unicode forceCaret
        const powNode = { kind: "operation", type: "pow", operands: [lit, lit] } as any;
        const uni = renderAST(powNode, "unicode", loc, true);
        assertEquals(uni.includes("^"), true);

        // Roots index 2, 3, 4
        const r2 = {
            kind: "operation",
            type: "pow",
            operands: [lit, { kind: "literal", originalInput: "1/2" }],
        } as any;
        assertEquals(renderAST(r2, "unicode", loc).includes("√"), true);

        const r3 = {
            kind: "operation",
            type: "pow",
            operands: [lit, { kind: "literal", originalInput: "1/3" }],
        } as any;
        assertEquals(renderAST(r3, "unicode", loc).includes("∛"), true);

        const r4 = {
            kind: "operation",
            type: "pow",
            operands: [lit, { kind: "literal", originalInput: "1/4" }],
        } as any;
        assertEquals(renderAST(r4, "unicode", loc).includes("∜"), true);

        const r5 = {
            kind: "operation",
            type: "pow",
            operands: [lit, { kind: "literal", originalInput: "1/5" }],
        } as any;
        assertEquals(renderAST(r5, "unicode", loc).includes("√"), true);

        // getRootInfo with group
        const res3G = await engine.from(8).pow(engine.from("1/3").group()).commit();
        assertEquals(res3G.toUnicode().includes("∛"), true);

        // LaTeX roots
        const l2 = renderAST(r2, "latex", loc);
        assertEquals(l2.includes("sqrt"), true);
        const l3 = renderAST(r3, "latex", loc);
        assertEquals(l3.includes("sqrt[3]"), true);

        // Generic pow in LaTeX
        const resPowGeneric = await engine.from(2).pow(3).commit();
        assertEquals(resPowGeneric.toLaTeX().includes("^{3}"), true);

        // Mod, DivInt, CrossContextAdd in Unicode
        const resMod = await engine.from(10).mod(3).commit();
        assertEquals(resMod.toUnicode().includes("%"), true);
        const resDivInt = await engine.from(10).divInt(3).commit();
        assertEquals(resDivInt.toUnicode().includes("//"), true);

        const HQ = CalcAUY.create({ contextLabel: "HQ", salt: "s" });
        const branch = await engine.from(100).hibernate();
        const hq = await HQ.fromExternalInstance(branch);
        const resCC = await hq.add(50).commit();
        assertEquals(resCC.toUnicode().includes("+"), true);

        // Test startsWith("-.") in renderer
        const negDotNode = { kind: "literal", value: { n: "0", d: "1" }, originalInput: "-." } as any;
        assertEquals(renderAST(negDotNode, "unicode", loc), "-0.");
    });

    it("Engine: unsupported operation branch", () => {
        const node = { kind: "operation", type: "invalid", operands: [{ kind: "literal", value: { n: "1", d: "1" } }] };
        // @ts-ignore
        assertThrows(() => evaluate(node), CalcAUYError, "Operação não suportada");
    });

    it("RationalNumber: edge cases", async () => {
        const engine = CalcAUY.create({ contextLabel: "r", salt: "s" });

        // GCD v=0
        const rGCD = RationalNumber.from(0).add(RationalNumber.from(5));
        assertEquals(rGCD.toJSON().n, "5");

        // pow 0
        const res0 = await engine.from(10).pow(0).commit();
        assertEquals(res0.toStringNumber(), "1.00");

        // nthRoot 0, 1
        const resRoot0 = await engine.from(0).pow("1/3").commit();
        assertEquals(resRoot0.toStringNumber(), "0.00");
        const resRoot1 = await engine.from(1).pow("1/3").commit();
        assertEquals(resRoot1.toStringNumber(), "1.00");

        // nthRoot n=1
        const resRootN1 = await engine.from(5).pow("1/1").commit();
        assertEquals(resRootN1.toStringNumber(), "5.00");

        // Negative base odd root
        const resNegOdd = await engine.from(-8).pow("1/3").commit();
        assertEquals(resNegOdd.toStringNumber(), "-2.00");
    });
});
