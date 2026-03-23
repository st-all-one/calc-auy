/**
 * Converte caracteres normais para seus equivalentes subscritos (ou pseudo-subscritos) em Unicode.
 * @param s A string original.
 * @returns A string convertida para subscrito.
 */
export function toSubscript(s: string): string {
    const map: Record<string, string> = {
        "0": "₀",
        "1": "₁",
        "2": "₂",
        "3": "₃",
        "4": "₄",
        "5": "₅",
        "6": "₆",
        "7": "₇",
        "8": "₈",
        "9": "₉",
        "A": "ₐ",
        "B": "ʙ", // Small cap B
        "C": "ᴄ", // Small cap C
        "D": "ᴅ", // Small cap D
        "E": "ₑ",
        "F": "ꜰ", // Small cap F
        "G": "ɢ", // Small cap G
        "H": "ₕ",
        "I": "ᵢ",
        "J": "ⱼ",
        "K": "ₖ",
        "L": "ₗ",
        "M": "ₘ",
        "N": "ₙ",
        "O": "ₒ",
        "P": "ₚ",
        "Q": "ǫ", // Small cap Q
        "R": "ᵣ",
        "S": "ₛ",
        "T": "ₜ",
        "U": "ᵤ",
        "V": "ᵥ",
        "W": "ᴡ", // Small cap W
        "X": "ₓ",
        "Y": "ʏ", // Small cap Y
        "Z": "ᴢ", // Small cap Z
        "+": "₊",
        "-": "₋",
        "(": "₍",
        ")": "₎",
        ".": "·",
        ",": "·",
    };
    return s.split("").map((c) => map[c.toUpperCase()] || c).join("");
}
