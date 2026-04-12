import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { Lexer } from "../src/parser/lexer.ts";

describe("Lexer - Casos de Borda e Erros", () => {
    it("deve identificar o token DOUBLE_SLASH (//) corretamente", () => {
        const lexer = new Lexer("10 // 3");
        const tokens = lexer.tokenize();

        assertEquals(tokens[1].type, "DOUBLE_SLASH");
        assertEquals(tokens[1].value, "//");
    });

    it("deve lançar erro ao encontrar um caractere inesperado", () => {
        const lexer = new Lexer("10 @ 5");
        assertThrows(
            () => lexer.tokenize(),
            Error,
            "Caractere inesperado: '@' na posição 3",
        );
    });

    it("deve ler um número que termina com ponto se o readNumber for iniciado", () => {
        // Se começar com dígito, o readNumber engole o ponto mesmo sem isNextDigit
        const lexer = new Lexer("10.");
        const tokens = lexer.tokenize();
        assertEquals(tokens[0].value, "10.");
    });

    it("deve lançar erro para ponto isolado ou no início sem dígito seguinte (isNextDigit branch)", () => {
        // Aqui o isNextDigit retorna false, então o tokenize não chama readNumber
        // e cai no erro de caractere inesperado '.'
        const lexer = new Lexer(". ");
        assertThrows(
            () => lexer.tokenize(),
            Error,
            "Caractere inesperado: '.' na posição 0",
        );
    });

    it("deve ler números decimais complexos com notação científica", () => {
        const scenarios = [
            { input: "1.2e3", expected: "1.2e3" },
            { input: "1.2e+3", expected: "1.2e+3" },
            { input: "1.2e-3", expected: "1.2e-3" },
        ];

        for (const { input, expected } of scenarios) {
            const lexer = new Lexer(input);
            const tokens = lexer.tokenize();
            assertEquals(tokens[0].type, "NUMBER");
            assertEquals(tokens[0].value, expected);
        }
    });

    it("deve interromper a leitura do número no caractere inválido após o expoente 'e'", () => {
        const lexer = new Lexer("1.2ex");
        // O readNumber consome '1.2e'. O próximo token não reconhecido será 'x'.
        assertThrows(
            () => lexer.tokenize(),
            Error,
            "Caractere inesperado: 'x' na posição 4",
        );
    });
});
