/**
 * Envolve uma expressão LaTeX em \left( ... \right) se necessário (se contiver + ou - e não estiver já agrupada).
 * @param expr A expressão LaTeX.
 * @returns A expressão, possivelmente envolta em parênteses.
 */
export function wrapLaTeX(expr: string): string {
    const trimmed = expr.trim();
    if (
        !trimmed.startsWith("\\left(") && !trimmed.startsWith("{")
        && (trimmed.includes("+") || trimmed.includes(" - "))
    ) {
        return `\\left( ${expr} \\right)`;
    }
    return expr;
}

/**
 * Envolve uma expressão Unicode em (...) se necessário.
 * @param expr A expressão Unicode.
 * @returns A expressão, possivelmente envolta em parênteses.
 */
export function wrapUnicode(expr: string): string {
    const trimmed = expr.trim();
    if (
        !trimmed.startsWith("(") && (trimmed.includes("+") || trimmed.includes(" - "))
    ) {
        return `(${expr})`;
    }
    return expr;
}
