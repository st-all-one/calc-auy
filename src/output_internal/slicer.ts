import { RationalNumber } from "../core/rational.ts";
import { CalcAUYError } from "../core/errors.ts";

/**
 * Common logic for slicing a total amount into parts.
 */
export function performSlice(totalCents: bigint, parts: number, decimalPrecision: number): string[] {
    if (parts <= 0) {
        throw new CalcAUYError("invalid-precision", "Número de partes deve ser maior que zero.");
    }

    const baseCents: bigint = totalCents / BigInt(parts);
    const remainder: bigint = totalCents % BigInt(parts);

    const slices: string[] = [];
    for (let i = 0; i < parts; i++) {
        let cents: bigint = baseCents;
        if (BigInt(i) < remainder) { cents += 1n; }

        const r: RationalNumber = RationalNumber.from(cents, 10n ** BigInt(decimalPrecision));
        slices.push(r.toDecimalString(decimalPrecision));
    }
    return slices;
}

/**
 * Slices a total amount based on a set of ratios.
 */
export function performSliceByRatio(
    totalCents: bigint,
    ratios: (number | string)[],
    decimalPrecision: number,
): string[] {
    if (ratios.length === 0) { return []; }

    const normalized: number[] = ratios.map((r) => {
        if (typeof r === "string" && r.endsWith("%")) {
            return Number.parseFloat(r) / 100;
        }
        return typeof r === "string" ? Number.parseFloat(r) : r;
    });

    const ratioSum: number = normalized.reduce((a, b) => a + b, 0);

    const alocacoes: bigint[] = normalized.map((r) =>
        (totalCents * BigInt(Math.floor(r * 1000000))) / BigInt(Math.floor(ratioSum * 1000000))
    );
    const centsAlocados: bigint = alocacoes.reduce((a, b) => a + b, 0n);

    const diff: bigint = totalCents - centsAlocados;
    for (let i = 0; i < Number(diff); i++) {
        alocacoes[i % alocacoes.length] += 1n;
    }

    return alocacoes.map((cents) => {
        const r: RationalNumber = RationalNumber.from(cents, 10n ** BigInt(decimalPrecision));
        return r.toDecimalString(decimalPrecision);
    });
}
