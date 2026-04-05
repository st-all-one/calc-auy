import { CalcAUYError } from "./errors.ts";
import { PRECISION_BIGINT } from "./constants.ts";

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
     * Factory method to create a RationalNumber from various inputs.
     */
    static from(value: string | number | bigint | RationalNumber): RationalNumber {
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
        return new RationalNumber(n, d);
    }

    sub(other: RationalNumber): RationalNumber {
        const n = this.#n * other.#d - other.#n * this.#d;
        const d = this.#d * other.#d;
        return new RationalNumber(n, d);
    }

    mul(other: RationalNumber): RationalNumber {
        return new RationalNumber(this.#n * other.#n, this.#d * other.#d);
    }

    div(other: RationalNumber): RationalNumber {
        return new RationalNumber(this.#n * other.#d, this.#d * other.#n);
    }

    /**
     * Power operation. If exponent is fractional or negative, it might collapse to PRECISION.
     */
    pow(exponent: RationalNumber): RationalNumber {
        // Integer power optimization
        if (exponent.#d === 1n && exponent.#n >= 0n) {
            return new RationalNumber(this.#n ** exponent.#n, this.#d ** exponent.#n);
        }

        // Fractional or negative power: collapse to decimal precision (50 houses)
        const val = this.toDecimal(PRECISION_BIGINT + 5n); // Extra precision for calculation
        const exp = Number(exponent.n) / Number(exponent.d);
        const result = Math.pow(val, exp);

        if (isNaN(result)) {
            throw new CalcAUYError("complex-result", "A operação resultou em um número complexo não suportado.");
        }

        return RationalNumber.from(result.toFixed(Number(PRECISION_BIGINT)));
    }

    mod(other: RationalNumber): RationalNumber {
        // Euclidean modulo: result is always positive
        const q = this.divInt(other);
        return this.sub(q.mul(other));
    }

    divInt(other: RationalNumber): RationalNumber {
        // Euclidean integer division
        const ratio = this.div(other);
        let n = ratio.#n / ratio.#d;
        // Floor logic for negative results to ensure positive modulo
        if (ratio.#n < 0n && ratio.#n % ratio.#d !== 0n) {
            n -= 1n;
        }
        return new RationalNumber(n, 1n);
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
     * Internal helper to get a floating point approximation for complex ops.
     */
    private toDecimal(extraPrecision: bigint): number {
        const scale = 10n ** extraPrecision;
        const scaled = (this.#n * scale) / this.#d;
        return Number(scaled) / Number(scale);
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

        while (s.length <= precision) { s = "0" + s; }
        const insertAt = s.length - precision;
        return (negative ? "-" : "") + s.substring(0, insertAt) + "." + s.substring(insertAt);
    }

    toJSON() {
        return { n: this.#n.toString(), d: this.#d.toString() };
    }
}
