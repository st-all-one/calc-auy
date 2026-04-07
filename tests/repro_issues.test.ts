import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { RationalNumber } from "../src/core/rational.ts";
import { applyRounding } from "../src/rounding/rounding.ts";

describe("Reproduction of reported issues", () => {
    it("CEIL rounding should not produce absurd results", () => {
        const val = RationalNumber.from("0.11");
        // ceil(0.11, 1) should be 0.2
        const result = applyRounding(val, "CEIL", 1);
        assertEquals(result.toDecimalString(1), "0.2");
    });

    it("pow should maintain high precision (50 digits)", () => {
        const base = RationalNumber.from("2");
        const exp = RationalNumber.from("0.5"); // sqrt(2)
        const result = base.pow(exp);

        const decimal = result.toDecimalString(50);
        // Sqrt(2) is approx 1.41421356237309504880168872420969807856967187537694...
        const expectedPrefix = "1.41421356237309504880168872420969807856967187537694";
        assertEquals(decimal.substring(0, expectedPrefix.length), expectedPrefix);
    });

    it("toDecimalString should correctly handle padding for small numbers", () => {
        const val = RationalNumber.from("0.001");
        assertEquals(val.toDecimalString(4), "0.0010");

        const zero = RationalNumber.from("0");
        assertEquals(zero.toDecimalString(4), "0.0000");
    });

    it("should handle complex nested power without BigInt size error", () => {
        // CalcAUY.from(2).add(5).mult(3).pow(CalcAUY.from(2).pow(2).pow("3/7"))
        // Base = 21, Exponent = 4^(3/7) approx 1.811
        const base = RationalNumber.from(21);
        const innerExp = RationalNumber.from(4).pow(RationalNumber.from("3/7"));

        // This should not throw RangeError
        const result = base.pow(innerExp);
        const dec = result.toDecimalString(10);
        // 21 ^ (4^(3/7)) approx 21 ^ 1.8114... approx 250.something
        // Just checking it finishes and is positive
        assertEquals(result.compare(RationalNumber.from(0)) > 0, true);
        assertEquals(dec.length > 0, true);
    });

    it("should throw math-overflow for explosive towers of power", () => {
        const base = RationalNumber.from(10);
        const hugeExp = RationalNumber.from(1000000); // 10^1000000 is too big

        try {
            base.pow(hugeExp);
            assertEquals(true, false, "Should have thrown math-overflow");
        } catch (err) {
            assertEquals((err as any).type.includes("math-overflow"), true);
        }
    });

    it("should throw math-overflow for very deep AST (recursion guard)", async () => {
        // Create an AST with 501 nested groups
        let node: any = { kind: "literal", value: { n: "1", d: "1" }, originalInput: "1" };
        for (let i = 0; i < 505; i++) {
            node = { kind: "group", child: node };
        }

        const { evaluate } = await import("../src/ast/engine.ts");
        try {
            evaluate(node);
            assertEquals(true, false, "Should have thrown math-overflow for depth");
        } catch (err) {
            assertEquals((err as any).type.includes("math-overflow"), true);
        }
    });
});
