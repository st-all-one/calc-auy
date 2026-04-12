import { CalcAUYError } from "./errors.ts";
import { PRECISION_BIGINT } from "./constants.ts";

/**
 * Internal safety limits to avoid memory/stack exhaustion.
 */
const MAX_BI_BITS = 1_000_000n;
const MAX_BI_LIMIT = 1n << MAX_BI_BITS;

/**
 * Limite de segurança para o cache de literais para evitar vazamento de memória.
 * Útil para reaproveitar instâncias de RationalNumber para valores comuns (ex: 1.18, 0.05).
 */
const MAX_CACHE_SIZE = 2048;
const literalCache = new Map<string | bigint, RationalNumber>();

/** Regex para validar formatos numéricos permitidos (Rigor specs/08). */
const BIGINT_RE = /^[+-]?\d+(?:_\d+)*n?$/;
const FRACTION_RE = /^[+-]?\d+(?:_\d+)*\/[+-]?\d+(?:_\d+)*$/;
const DECIMAL_RE = /^[+-]?(?:\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?|\.\d+(?:_\d+)*)(?:[eE][+-]?\d+(?:_\d+)*)?$/;

/**
 * Algoritmo de Euclides Iterativo otimizado para BigInt.
 *
 * **Engenharia:** Utiliza o operador de módulo nativo da engine V8, que é
 * implementado em C++ e altamente otimizado para operações de BigInt.
 * Mantém a complexidade O(log(min(a, b))) com baixo overhead de memória.
 */
function gcd(a: bigint, b: bigint): bigint {
    let u = a < 0n ? -a : a;
    let v = b < 0n ? -b : b;

    while (v !== 0n) {
        const temp = v;
        v = u % v;
        u = temp;
    }

    return u;
}

/**
 * Tipos de entrada aceitos para a criação de um RationalNumber.
 */
export type RationalInput = string | number | bigint | RationalNumber;

/**
 * RationalNumber representa uma fração matemática exata (n/d) utilizando BigInt.
 *
 * **Engenharia de Precisão:**
 * Diferente do tipo `number` (IEEE 754), que sofre de erros de arredondamento em
 * operações de ponto flutuante, esta classe mantém a relação exata entre numerador
 * e denominador. Todas as operações resultam em uma nova instância imutável.
 *
 * **Simplificação Automática:**
 * O MDC (Máximo Divisor Comum) é aplicado em todas as operações para manter a
 * fração em sua forma irredutível, otimizando o uso de memória.
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

        // Normalização do sinal: o denominador é sempre mantido positivo.
        if (den < 0n) {
            num = -num;
            den = -den;
        }

        // Aplicação do Algoritmo de Euclides para simplificação.
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

    /**
     * Monitora o consumo de bits para evitar ataques de DoS ou estouro de memória.
     * @param n Numerador a ser testado.
     * @param d Denominador a ser testado.
     * @throws {CalcAUYError} Se o número exceder 1 milhão de bits.
     */
    private static checkSafety(n: bigint, d: bigint): void {
        const absN = n < 0n ? -n : n;
        const absD = d < 0n ? -d : d;

        // Comparação nativa de BigInt (Milhares de vezes mais rápido que toString(2))
        if (absN > MAX_BI_LIMIT || absD > MAX_BI_LIMIT) {
            throw new CalcAUYError(
                "math-overflow",
                `O resultado da operação excede o limite de segurança de ${MAX_BI_BITS} bits.`,
            );
        }
    }

    /**
     * Método Factory para criar instâncias de RationalNumber.
     * Suporta strings, numbers, BigInts e outras instâncias de RationalNumber.
     */
    public static from(n: bigint, d: bigint): RationalNumber;
    public static from(value: RationalInput): RationalNumber;
    public static from(arg1: RationalInput | bigint, arg2?: bigint): RationalNumber {
        if (arg2 !== undefined && typeof arg1 === "bigint") {
            return new RationalNumber(arg1, arg2);
        }

        const value: RationalInput = arg1;
        if (value instanceof RationalNumber) { return value; }

        if (typeof value === "bigint") {
            // Fast-path de bypass: se o número for minimamente grande, pule o cache.
            // Stringificar e fazer hash de BigInts maiores custa mais do que instanciar o objeto.
            if (value > 9999n || value < -9999n) {
                return new RationalNumber(value, 1n);
            }

            const strVal = value.toString();
            const cached = literalCache.get(strVal);
            if (cached) { return cached; }

            const res = new RationalNumber(value, 1n);
            if (literalCache.size < MAX_CACHE_SIZE) {
                literalCache.set(strVal, res);
            }
            return res;
        }

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
        const trimmed = input.trim();

        // Camada de Otimização: Cache de Literais Estáticos (Memoization)
        const cached = literalCache.get(trimmed);
        if (cached) { return cached; }

        // 1. Validação contra os formatos permitidos (Rigor specs/08)
        const isBigInt = BIGINT_RE.test(trimmed);
        const isFraction = FRACTION_RE.test(trimmed);
        const isDecimal = DECIMAL_RE.test(trimmed);

        if (!isBigInt && !isFraction && !isDecimal) {
            throw new CalcAUYError("invalid-syntax", `String numérica inválida: "${input}"`);
        }

        // 3. Normalização (Remover underscores para BigInt/Number.parseFloat)
        const clean = trimmed.replaceAll("_", "");
        let result: RationalNumber;

        // 4. Ingestão por Tipo
        if (isFraction) {
            const [nStr, dStr] = clean.split("/");
            result = new RationalNumber(BigInt(nStr), BigInt(dStr));
        } else if (isBigInt) {
            const val = clean.endsWith("n") ? clean.slice(0, -1) : clean;
            result = new RationalNumber(BigInt(val), 1n);
        } else {
            // Caso Decimal/Scientific
            const lower = clean.toLowerCase();
            const parts: string[] = lower.split("e");
            const baseStr: string = parts[0];
            const scientificExp: number = parts.length > 1 ? Number.parseInt(parts[1]) : 0;

            const dotIndex: number = baseStr.indexOf(".");
            let n: bigint;
            let d: bigint;

            if (dotIndex === -1) {
                n = BigInt(baseStr);
                d = 1n;
            } else {
                const integerPart: string = baseStr.replace(".", "");
                const fractionalLength: number = baseStr.length - dotIndex - 1;
                n = BigInt(integerPart || "0");
                d = 10n ** BigInt(fractionalLength);
            }

            if (scientificExp >= 0) {
                n *= 10n ** BigInt(scientificExp);
            } else {
                d *= 10n ** BigInt(-scientificExp);
            }

            result = new RationalNumber(n, d);
        }

        // Armazenamento no cache com limite de segurança para evitar vazamento de memória.
        if (literalCache.size < MAX_CACHE_SIZE) {
            literalCache.set(trimmed, result);
        }

        return result;
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
            // Estimativa rápida de bits via Hexadecimal
            const baseNBits = BigInt(this.#n.toString(16).length * 4);
            const baseDBits = BigInt(this.#d.toString(16).length * 4);
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
