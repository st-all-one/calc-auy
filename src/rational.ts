import { CalcAUYError } from "./errors.ts";
import { PRECISION_BIGINT } from "./constants.ts";

// Internal safety limits to avoid memory/stack exhaustion in explosive operations (like towers of powers)
const MAX_BI_BITS = 1_000_000n; // ~300,000 decimal digits. Sufficient for any forensic audit.

/**
 * Calculates the Greatest Common Divisor (GCD/MDC) of two bigints.
 */
function gcd(a: bigint, b: bigint): bigint {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b > 0n) {
        a %= b;
        [a, b] = [b, a];
    }
    return a;
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

        // Normalize sign: denominator should always be positive
        if (d < 0n) {
            n = -n;
            d = -d;
        }

        // Automatic simplification via MDC (GCD)
        const common = gcd(n, d);
        this.#n = n / common;
        this.#d = d / common;
    }

    get n(): bigint {
        return this.#n;
    }
    get d(): bigint {
        return this.#d;
    }

    /**
     * Checks if an operation result might exceed the safety limit of bits.
     */
    static #checkSafety(n: bigint, d: bigint): void {
        // bitLength is efficient in V8 for BigInt
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
    static from(n: bigint, d: bigint): RationalNumber;
    static from(value: string | number | bigint | RationalNumber): RationalNumber;
    static from(arg1: string | number | bigint | RationalNumber, arg2?: bigint): RationalNumber {
        if (arg2 !== undefined && typeof arg1 === "bigint") {
            return new RationalNumber(arg1, arg2);
        }
        let value = arg1;
        if (value instanceof RationalNumber) { return value; }
        if (typeof value === "bigint") { return new RationalNumber(value, 1n); }

        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                throw new CalcAUYError("unsupported-type", `Valor numérico inválido: ${value}`);
            }
            // Convert float to string to avoid IEEE 754 precision loss during initial ingestion
            value = value.toString();
        }

        if (typeof value === "string") {
            const clean = value.replace(/_/g, "").trim();

            // Fraction format: "1/3"
            if (clean.includes("/")) {
                const [nStr, dStr] = clean.split("/");
                return new RationalNumber(BigInt(nStr), BigInt(dStr));
            }

            // Decimal format: "10.50" or ".5"
            if (clean.includes(".") || clean.toLowerCase().includes("e")) {
                const val = parseFloat(clean);
                if (isNaN(val)) { throw new CalcAUYError("invalid-syntax", `String numérica inválida: ${value}`); }

                // Handle scientific notation or fixed decimal by scaling
                const parts = clean.split(/[eE]/);
                let baseStr = parts[0];
                const exponent = parts.length > 1 ? parseInt(parts[1]) : 0;

                const dotIndex = baseStr.indexOf(".");
                let n: bigint;
                let d: bigint;

                if (dotIndex === -1) {
                    n = BigInt(baseStr);
                    d = 1n;
                } else {
                    const integerPart = baseStr.replace(".", "");
                    const fractionalLength = baseStr.length - dotIndex - 1;
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

            // Integer format
            return new RationalNumber(BigInt(clean), 1n);
        }

        throw new CalcAUYError("unsupported-type", `Tipo de entrada não suportado: ${typeof value}`);
    }

    // --- Operations (Immutable) ---

    add(other: RationalNumber): RationalNumber {
        const n = this.#n * other.#d + other.#n * this.#d;
        const d = this.#d * other.#d;
        RationalNumber.#checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    sub(other: RationalNumber): RationalNumber {
        const n = this.#n * other.#d - other.#n * this.#d;
        const d = this.#d * other.#d;
        RationalNumber.#checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    mul(other: RationalNumber): RationalNumber {
        const n = this.#n * other.#n;
        const d = this.#d * other.#d;
        RationalNumber.#checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    div(other: RationalNumber): RationalNumber {
        const n = this.#n * other.#d;
        const d = this.#d * other.#n;
        RationalNumber.#checkSafety(n, d);
        return new RationalNumber(n, d);
    }

    /**
     * Power operation. If exponent is fractional or negative, it might collapse to PRECISION.
     */
    pow(exponent: RationalNumber): RationalNumber {
        // Optimization for zero base
        if (this.#n === 0n) {
            if (exponent.#n === 0n) return RationalNumber.from(1n);
            if (exponent.#n > 0n) return RationalNumber.from(0n);
            throw new CalcAUYError("division-by-zero", "Zero elevado a um expoente negativo.");
        }

        // Check for potential overflow BEFORE executing power if exponent is integer
        if (exponent.#d === 1n && exponent.#n > 0n) {
            // Fast estimate: y * log2(x)
            const baseNBits = BigInt(this.#n.toString(2).length);
            const baseDBits = BigInt(this.#d.toString(2).length);
            const estimatedNBits = exponent.#n * baseNBits;
            const estimatedDBits = exponent.#n * baseDBits;

            if (estimatedNBits > MAX_BI_BITS || estimatedDBits > MAX_BI_BITS) {
                throw new CalcAUYError(
                    "math-overflow",
                    `O expoente resultaria em um número superior ao limite de segurança (${MAX_BI_BITS} bits).`,
                );
            }
        }

        // Optimization for integer power
        if (exponent.#d === 1n) {
            if (exponent.#n === 0n) return RationalNumber.from(1n);
            if (exponent.#n > 0n) {
                return new RationalNumber(this.#n ** exponent.#n, this.#d ** exponent.#n);
            }
            // Negative integer exponent: (a/b)^-n = (b/a)^n
            const inv = new RationalNumber(this.#d, this.#n);
            const absExp = -exponent.#n;
            return new RationalNumber(inv.#n ** absExp, inv.#d ** absExp);
        }

        // Handle negative base with fractional exponent
        if (this.#n < 0n) {
            // For negative base, exponent must be integer or have odd denominator to be real.
            // But decimal approximations (d=10^50) always have even denominator.
            if (exponent.#d % 2n === 0n) {
                throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
            }
            // If d is odd and large, it's also safer to consider complex if it's an approximation
            if (exponent.#d > 1000n) {
                throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
            }
        }

        // Fractional exponent: x^(m/d) = root_d(x^m)
        // Separate into integer and fractional parts: x^(I + f) = x^I * x^f
        const I = exponent.#n / exponent.#d;
        const remainderN = exponent.#n % exponent.#d;
        
        let result = RationalNumber.from(1n);
        if (I !== 0n) {
            result = this.pow(RationalNumber.from(I));
        }
        
        if (remainderN === 0n) return result;

        // Calculate fractional part: this^(remainderN / d)
        // Ensure positive exponent for the root calculation
        const m = remainderN < 0n ? -remainderN : remainderN;
        const d = exponent.#d;
        const base = remainderN < 0n ? new RationalNumber(this.#d, this.#n) : this;

        let fractionalResult: RationalNumber;
        
        if (d <= 1000n) {
            // Use standard nthRoot for small denominators (precise for simple fractions)
            const p = PRECISION_BIGINT;
            const scale = 10n ** (p * d);
            const rootN = RationalNumber.#bigIntNthRoot(base.#n ** m * scale, d);
            const rootD = RationalNumber.#bigIntNthRoot(base.#d ** m * scale, d);
            fractionalResult = new RationalNumber(rootN, rootD);
        } else {
            // Use binary expansion (repeated square roots) for large denominators to avoid RangeError
            fractionalResult = RationalNumber.#bigIntPowFractional(base, m, d, PRECISION_BIGINT);
        }
        
        return result.mul(fractionalResult);
    }

    mod(other: RationalNumber): RationalNumber {
        // Euclidean modulo: result is always 0 <= r < |b|
        const a = this.#n * other.#d;
        const b = this.#d * other.#n;
        
        let r = a % b;
        if (r < 0n) {
            // Se o resto for negativo, ajustamos baseado no sinal de b
            // Para Euclides, r deve ser positivo, então r += abs(b)
            r += (b < 0n ? -b : b);
        }
        
        return new RationalNumber(r, this.#d * other.#d);
    }

    divInt(other: RationalNumber): RationalNumber {
        // Euclidean integer division: a = bq + r, where 0 <= r < |b|
        // Isso implica q = (a - r) / b
        const a = this.#n * other.#d;
        const b = this.#d * other.#n;
        
        // Primeiro calculamos o resto euclidiano r
        let r = a % b;
        if (r < 0n) {
            r += (b < 0n ? -b : b);
        }
        
        // Agora q é garantido como o quociente euclidiano
        const q = (a - r) / b;
        
        return new RationalNumber(q, 1n);
    }

    abs(): RationalNumber {
        return new RationalNumber(this.#n < 0n ? -this.#n : this.#n, this.#d);
    }

    negate(): RationalNumber {
        return new RationalNumber(-this.#n, this.#d);
    }

    equals(other: RationalNumber): boolean {
        return this.#n === other.#n && this.#d === other.#d;
    }

    compare(other: RationalNumber): number {
        const diff = this.sub(other);
        if (diff.#n === 0n) { return 0; }
        return diff.#n > 0n ? 1 : -1;
    }

    /**
     * Converts to a decimal string with specific precision.
     */
    toDecimalString(precision: number): string {
        if (precision < 0) { throw new CalcAUYError("invalid-precision", "Precisão não pode ser negativa."); }

        const p = BigInt(precision);
        const scale = 10n ** p;

        // Rounding: We use Truncate by default for the raw conversion,
        // specific rounding strategies are applied in the output layer.
        const scaled = (this.#n * scale) / this.#d;
        let s = scaled.toString();
        const negative = s.startsWith("-");
        if (negative) { s = s.substring(1); }

        if (precision === 0) { return (negative ? "-" : "") + s; }

        // Padding ensure at least precision + 1 chars (e.g. "0.001" for p=3)
        s = s.padStart(precision + 1, "0");
        const insertAt = s.length - precision;
        return (negative ? "-" : "") + s.substring(0, insertAt) + "." + s.substring(insertAt);
    }

    toJSON() {
        return { n: this.#n.toString(), d: this.#d.toString() };
    }

    /**
     * Calculates the n-th root of a bigint using Newton's method.
     */
    static #bigIntNthRoot(value: bigint, n: bigint): bigint {
        if (value < 0n) {
            if (n % 2n === 0n) {
                throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
            }
            return -RationalNumber.#bigIntNthRoot(-value, n);
        }
        if (value === 0n) return 0n;
        if (value === 1n) return 1n;
        if (n === 1n) return value;

        // Optimized guess using bit length
        let x = 1n << (BigInt(value.toString(2).length) / n + 1n);
        let prevX = 0n;
        const nm1 = n - 1n;

        // Newton's method loop
        while (x !== prevX && x !== prevX + 1n && x !== prevX - 1n) {
            prevX = x;
            x = (nm1 * x + value / (x ** nm1)) / n;
        }

        // Adjustment for integer division (floor behavior)
        while (x ** n > value) x -= 1n;
        while ((x + 1n) ** n <= value) x += 1n;

        return x;
    }

    /**
     * Calculates x^(expN/expD) using binary expansion and repeated square roots.
     * Used for exponents with large denominators to avoid 10^(P*D) RangeError.
     */
    static #bigIntPowFractional(base: RationalNumber, expN: bigint, expD: bigint, p: bigint): RationalNumber {
        const internalPrecision = p + 15n;
        const scale = 10n ** internalPrecision;
        const bits = 256; // 256 bits of fractional exponent precision
        const fractionalBits = (expN << BigInt(bits)) / expD;

        const solve = (V: bigint) => {
            let res = scale;
            let currRoot = V * scale; // In fixed point
            for (let i = 1; i <= bits; i++) {
                // Successive square roots
                currRoot = RationalNumber.#bigIntNthRoot(currRoot * scale, 2n);
                const bit = 1n << BigInt(bits - i);
                if ((fractionalBits & bit) !== 0n) {
                    res = (res * currRoot) / scale;
                }
            }
            return res;
        };

        const rootN = solve(base.#n);
        const rootD = solve(base.#d);
        return new RationalNumber(rootN, rootD);
    }
}
