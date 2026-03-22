/**
 * Converte caracteres normais para seus equivalentes sobrescritos em Unicode.
 * @param s A string original.
 * @returns A string convertida para sobrescrito.
 */
export function toSuperscript(s: string): string {
    const map: Record<string, string> = {
        "0": "⁰",
        "1": "¹",
        "2": "²",
        "3": "³",
        "4": "⁴",
        "5": "⁵",
        "6": "⁶",
        "7": "⁷",
        "8": "⁸",
        "9": "⁹",
        "+": "⁺",
        "-": "⁻",
        "(": "⁽",
        ")": "⁾",
        ".": "·",
        ",": "·",
    };
    return s.split("").map((c) => map[c] || c).join("");
}
