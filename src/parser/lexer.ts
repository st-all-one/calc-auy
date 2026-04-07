/**
 * CalcAUY - Lexical Analyzer
 * @module
 */

export type TokenType =
    | "NUMBER"
    | "PLUS"
    | "MINUS"
    | "STAR"
    | "SLASH"
    | "DOUBLE_SLASH"
    | "PERCENT"
    | "CARET"
    | "LPAREN"
    | "RPAREN"
    | "EOF";

export interface Token {
    type: TokenType;
    value: string;
    pos: number;
}

export class Lexer {
    private readonly input: string;
    private pos = 0;

    public constructor(input: string) {
        this.input = input;
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];
        while (this.pos < this.input.length) {
            const char: string = this.input[this.pos];

            if (/\s/.test(char)) {
                this.pos++;
                continue;
            }

            if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(this.input[this.pos + 1]))) {
                tokens.push(this.readNumber());
                continue;
            }

            if (char === "+") {
                tokens.push({ type: "PLUS", value: "+", pos: this.pos++ });
                continue;
            }

            if (char === "-") {
                tokens.push({ type: "MINUS", value: "-", pos: this.pos++ });
                continue;
            }

            if (char === "*") {
                tokens.push({ type: "STAR", value: "*", pos: this.pos++ });
                continue;
            }

            if (char === "/") {
                if (this.input[this.pos + 1] === "/") {
                    tokens.push({ type: "DOUBLE_SLASH", value: "//", pos: this.pos });
                    this.pos += 2;
                } else {
                    tokens.push({ type: "SLASH", value: "/", pos: this.pos++ });
                }
                continue;
            }

            if (char === "%") {
                tokens.push({ type: "PERCENT", value: "%", pos: this.pos++ });
                continue;
            }

            if (char === "^") {
                tokens.push({ type: "CARET", value: "^", pos: this.pos++ });
                continue;
            }

            if (char === "(") {
                tokens.push({ type: "LPAREN", value: "(", pos: this.pos++ });
                continue;
            }

            if (char === ")") {
                tokens.push({ type: "RPAREN", value: ")", pos: this.pos++ });
                continue;
            }

            throw new Error(`Caractere inesperado: '${char}' na posição ${this.pos}`);
        }

        tokens.push({ type: "EOF", value: "", pos: this.pos });
        return tokens;
    }

    private readNumber(): Token {
        const start: number = this.pos;
        let hasDot = false;
        let hasE = false;

        while (this.pos < this.input.length) {
            const char: string = this.input[this.pos].toLowerCase();
            if (/[0-9]/.test(char) || char === "_") {
                this.pos++;
            } else if (char === "." && !hasDot && !hasE) {
                hasDot = true;
                this.pos++;
            } else if (char === "e" && !hasE) {
                hasE = true;
                this.pos++;
                if (this.input[this.pos] === "+" || this.input[this.pos] === "-") {
                    this.pos++;
                }
            } else {
                break;
            }
        }

        return {
            type: "NUMBER",
            value: this.input.substring(start, this.pos),
            pos: start,
        };
    }
}
