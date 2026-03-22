/**
 * Formata um valor BigInt (em escala interna) para uma string decimal.
 *
 * @param value O valor BigInt a ser formatado.
 * @param decimals O número de casas decimais desejado.
 * @returns A representação em string.
 */
export function formatBigIntToString(value: bigint, decimals: number): string {
    const isNeg = value < 0n;
    const abs = isNeg ? -value : value;
    const scale = 10n ** BigInt(decimals);
    const int = abs / scale;
    if (decimals === 0) {
        return `${isNeg ? "-" : ""}${int}`;
    }
    const frac = (abs % scale).toString().padStart(decimals, "0");
    return `${isNeg ? "-" : ""}${int}.${frac}`;
}

/**
 * Formata um valor para exibição monetária (ex: R$ 1.234,56).
 *
 * @param formattedString O valor já formatado em string decimal (ex: "1234.56").
 * @param locale O locale para formatação (ex: "pt-BR").
 * @param currency A moeda para formatação (ex: "BRL").
 * @returns A string formatada monetariamente.
 */
export function formatMonetary(formattedString: string, locale = "pt-BR", currency = "BRL"): string {
    const numberValue = parseFloat(formattedString);
    if (isNaN(numberValue)) { return formattedString; }

    // Detecta o número de casas decimais na string original para forçar no Intl
    const decimalPart = formattedString.split(".")[1];
    const precision = decimalPart ? decimalPart.length : 0;

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(numberValue);
}
