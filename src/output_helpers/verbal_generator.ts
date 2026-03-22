/**
 * Gera a descrição verbal para acessibilidade.
 *
 * @param verbalExpression A expressão verbal acumulada.
 * @param result O resultado formatado.
 * @returns A frase completa verbalizada.
 */
export function generateVerbal(verbalExpression: string, result: string): string {
    const readableResult = result.replace(".", " vírgula ");
    return `${verbalExpression} é igual a ${readableResult}`;
}
