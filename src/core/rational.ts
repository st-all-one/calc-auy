import { CalcAUYError } from "./errors.ts";
import { PRECISION_BIGINT } from "./constants.ts";

/**
 * Internal safety limits to avoid memory/stack exhaustion.
 */
const MAX_BI_BITS = 1_000_000n;

/**
 * Calculates the Greatest Common Divisor (GCD/MDC) of two bigints.
 */
function gcd(a: bigint, b: bigint): bigint {
    let x: bigint = a < 0n ? -a : a;
    let y: bigint = b < 0n ? -b : b;
    while (y > 0n) {
        x %= y;
        [x, y] = [y, x];
    }
    return x;
}

/**
 * RationalNumber represents a mathematical fraction (n/d) using BigInt.
 * It ensures absolute precision and automatic simplification via GCD.
 */
export class RationalNumber {
    readonly #n: bigint;
    readonly #d: bigint;

    private constructor(n: bigint, d: bigint) {
        if (d === 0n) {
            throw new CalcAUYError("division-by-zero", "O denominador não pode ser zero.");
        }

        let num: bigint = n;
        let den: bigint = d;

        if (den < 0n) {
            num = -num;
            den = -den;
        }

        const common: bigint = gcd(num, den);
        this.#n = num / common;
        this.#d = den / common;
    }

    public get n(): bigint {
        return this.#n;
    }

    public get d(): bigint {
        return this.#d;
    }

    private static checkSafety(n: bigint, d: bigint): void {
        const nBits = BigInt(n.toString(2).length);
        const dBits = BigInt(d.toString(2).length);
        if (nBits > MAX_BI_BITS || dBits > MAX_BI_BITS) {
            throw new CalcAUYError(
                "math-overflow",
                `O resultado da operação excede o limite de segurança de ${MAX_BI_BITS} bits.`,
            );
        }
    }

    /**
     * Factory method to create a RationalNumber from various inputs.
     */
    public static from(n: bigint, d: bigint): RationalNumber;
    public static from(value: string | number | bigint | RationalNumber): RationalNumber;
    public static from(arg1: string | number | bigint | RationalNumber, arg2?: bigint): RationalNumber {
        if (arg2 !== undefined && typeof arg1 === "bigint") {
            return new RationalNumber(arg1, arg2);
        }

        const value: string | number | bigint | RationalNumber = arg1;
        if (value instanceof RationalNumber) { return value; }
        if (typeof value === "bigint") { return new RationalNumber(value, 1n); }

        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                throw new CalcAUYError("unsupported-type", `Valor numérico inválido: ${value}`);
            }
            return RationalNumber.fromString(value.toString());
        }

        if (typeof value === "string") {
            return RationalNumber.fromString(value);
        }

        throw new CalcAUYError("unsupported-type", `Tipo de entrada não suportado: ${typeof value}`);
    }

    private static fromString(input: string): RationalNumber {
        const clean: string = input.replace(/_/g, "").trim();

        if (clean.includes("/")) {
            const [nStr, dStr] = clean.split("/");
            return new RationalNumber(BigInt(nStr), BigInt(dStr));
        }

        if (clean.includes(".") || clean.toLowerCase().includes("e")) {
            const val: number = parseFloat(clean);
            if (isNaN(val)) { throw new CalcAUYError("invalid-syntax", `String numérica inválida: ${input}`); }

            const parts: string[] = clean.split(/[eE]/);
            const baseStr: string = parts[0];
            const exponent: number = parts.length > 1 ? parseInt(parts[1]) : 0;

            const dotIndex: number = baseStr.indexOf(".");
            let n: bigint;
            let d: bigint;

            if (dotIndex === -1) {
                n = BigInt(baseStr);
                d = 1n;
            } else {
                const integerPart: string = baseStr.replace(".", "");
                const fractionalLength: number = baseStr.length - dotIndex - 1;
                n = BigInt(integerPart);
                d = 10n ** BigInt(fractionalLength);
            }

            if (exponent >= 0) {
                n *= 10n ** BigInt(exponent);
            } else {
                d *= 10n ** BigInt(-exponent);
            }

            return new RationalNumber(n, d);
        }

        return new RationalNumber(BigInt(clean), 1n);
    }

    public add(other: RationalNumber): RationalNumber {
        const n: bigint = this.#n * other.#d + other.#n * this.#d;
        const d: bigint = this.#d * other.#d;
        RationalNumber.checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    public sub(other: RationalNumber): RationalNumber {
        const n: bigint = this.#n * other.#d - other.#n * this.#d;
        const d: bigint = this.#d * other.#d;
        RationalNumber.checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    public mul(other: RationalNumber): RationalNumber {
        const n: bigint = this.#n * other.#n;
        const d: bigint = this.#d * other.#d;
        RationalNumber.checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    public div(other: RationalNumber): RationalNumber {
        const n: bigint = this.#n * other.#d;
        const d: bigint = this.#d * other.#n;
        RationalNumber.checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    public pow(exponent: RationalNumber): RationalNumber {
        if (this.#n === 0n) {
            if (exponent.#n === 0n) { return RationalNumber.from(1n); }
            if (exponent.#n > 0n) { return RationalNumber.from(0n); }
            throw new CalcAUYError("division-by-zero", "Zero elevado a um expoente negativo.");
        }

        if (exponent.#d === 1n && exponent.#n > 0n) {
            const baseNBits = BigInt(this.#n.toString(2).length);
            const baseDBits = BigInt(this.#d.toString(2).length);
            const estimatedNBits: bigint = exponent.#n * baseNBits;
            const estimatedDBits: bigint = exponent.#n * baseDBits;

            if (estimatedNBits > MAX_BI_BITS || estimatedDBits > MAX_BI_BITS) {
                throw new CalcAUYError(
                    "math-overflow",
                    `O expoente resultaria em um número superior ao limite de segurança (${MAX_BI_BITS} bits).`,
                );
            }
        }

        if (exponent.#d === 1n) {
            if (exponent.#n === 0n) { return RationalNumber.from(1n); }
            if (exponent.#n > 0n) {
                return new RationalNumber(this.#n ** exponent.#n, this.#d ** exponent.#n);
            }
            const inv: RationalNumber = new RationalNumber(this.#d, this.#n);
            const absExp: bigint = -exponent.#n;
            return new RationalNumber(inv.#n ** absExp, inv.#d ** absExp);
        }

        if (this.#n < 0n) {
            if (exponent.#d % 2n === 0n || exponent.#d > 1000n) {
                throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
            }
        }

        const I: bigint = exponent.#n / exponent.#d;
        const remainderN: bigint = exponent.#n % exponent.#d;

        let result: RationalNumber = RationalNumber.from(1n);
        if (I !== 0n) {
            result = this.pow(RationalNumber.from(I));
        }

        if (remainderN === 0n) { return result; }

        const m: bigint = remainderN < 0n ? -remainderN : remainderN;
        const d: bigint = exponent.#d;
        const base: RationalNumber = remainderN < 0n ? new RationalNumber(this.#d, this.#n) : this;

        let fractionalResult: RationalNumber;

        if (d <= 1000n) {
            const p: bigint = PRECISION_BIGINT;
            const scale: bigint = 10n ** (p * d);
            const rootN: bigint = RationalNumber.bigIntNthRoot(base.#n ** m * scale, d);
            const rootD: bigint = RationalNumber.bigIntNthRoot(base.#d ** m * scale, d);
            fractionalResult = new RationalNumber(rootN, rootD);
        } else {
            fractionalResult = RationalNumber.bigIntPowFractional(base, m, d, PRECISION_BIGINT);
        }

        return result.mul(fractionalResult);
    }

    public mod(other: RationalNumber): RationalNumber {
        const a: bigint = this.#n * other.#d;
        const b: bigint = this.#d * other.#n;
        let r: bigint = a % b;
        if (r < 0n) {
            r += b < 0n ? -b : b;
        }
        return new RationalNumber(r, this.#d * other.#d);
    }

    public divInt(other: RationalNumber): RationalNumber {
        const a: bigint = this.#n * other.#d;
        const b: bigint = this.#d * other.#n;
        let r: bigint = a % b;
        if (r < 0n) { r += b < 0n ? -b : b; }
        const q: bigint = (a - r) / b;
        return new RationalNumber(q, 1n);
    }

    public abs(): RationalNumber {
        return new RationalNumber(this.#n < 0n ? -this.#n : this.#n, this.#d);
    }

    public negate(): RationalNumber {
        return new RationalNumber(-this.#n, this.#d);
    }

    public equals(other: RationalNumber): boolean {
        return this.#n === other.#n && this.#d === other.#d;
    }

    public compare(other: RationalNumber): number {
        const diff: RationalNumber = this.sub(other);
        if (diff.#n === 0n) { return 0; }
        return diff.#n > 0n ? 1 : -1;
    }

    public toDecimalString(precision: number): string {
        if (precision < 0) { throw new CalcAUYError("invalid-precision", "Precisão não pode ser negativa."); }

        const p = BigInt(precision);
        const scale: bigint = 10n ** p;
        const scaled: bigint = (this.#n * scale) / this.#d;
        let s: string = scaled.toString();
        const negative: boolean = s.startsWith("-");
        if (negative) { s = s.substring(1); }

        if (precision === 0) { return (negative ? "-" : "") + s; }

        s = s.padStart(precision + 1, "0");
        const insertAt: number = s.length - precision;
        return (negative ? "-" : "") + s.substring(0, insertAt) + "." + s.substring(insertAt);
    }

    public toJSON(): { n: string; d: string } {
        return { n: this.#n.toString(), d: this.#d.toString() };
    }

    private static bigIntNthRoot(value: bigint, n: bigint): bigint {
        if (value < 0n) {
            if (n % 2n === 0n) {
                throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
            }
            return -RationalNumber.bigIntNthRoot(-value, n);
        }
        if (value === 0n) { return 0n; }
        if (value === 1n) { return 1n; }
        if (n === 1n) { return value; }

        let x: bigint = 1n << (BigInt(value.toString(2).length) / n + 1n);
        let prevX = 0n;
        const nm1: bigint = n - 1n;

        while (x !== prevX && x !== prevX + 1n && x !== prevX - 1n) {
            prevX = x;
            x = (nm1 * x + value / (x ** nm1)) / n;
        }

        while (x ** n > value) { x -= 1n; }
        while ((x + 1n) ** n <= value) { x += 1n; }

        return x;
    }

    private static bigIntPowFractional(base: RationalNumber, expN: bigint, expD: bigint, p: bigint): RationalNumber {
        const internalPrecision: bigint = p + 15n;
        const scale: bigint = 10n ** internalPrecision;
        const bits = 256;
        const fractionalBits: bigint = (expN << BigInt(bits)) / expD;

        const solve = (V: bigint): bigint => {
            let res: bigint = scale;
            let currRoot: bigint = V * scale;
            for (let i = 1; i <= bits; i++) {
                currRoot = RationalNumber.bigIntNthRoot(currRoot * scale, 2n);
                const bit: bigint = 1n << BigInt(bits - i);
                if ((fractionalBits & bit) !== 0n) {
                    res = (res * currRoot) / scale;
                }
            }
            return res;
        };

        const rootN: bigint = solve(base.#n);
        const rootD: bigint = solve(base.#d);
        return new RationalNumber(rootN, rootD);
    }
}
