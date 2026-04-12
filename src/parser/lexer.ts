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

            // Whitespace optimization
            if (char === " " || char === "\n" || char === "\r" || char === "\t") {
                this.pos++;
                continue;
            }

            // deno-lint-ignore no-non-null-assertion
            const code = char.codePointAt(0)!;
            const isDigit = code >= 48 && code <= 57;

            if (isDigit || (char === "." && this.isNextDigit())) {
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

    private isNextDigit(): boolean {
        const next = this.input[this.pos + 1];
        if (!next) { return false; }
        // deno-lint-ignore no-non-null-assertion
        const code = next.codePointAt(0)!;
        return code >= 48 && code <= 57;
    }

    private readNumber(): Token {
        const start: number = this.pos;
        let hasDot = false;
        let hasE = false;

        while (this.pos < this.input.length) {
            const char: string = this.input[this.pos];
            // deno-lint-ignore no-non-null-assertion
            const code = char.codePointAt(0)!;
            const isDigit = code >= 48 && code <= 57;

            if (isDigit || char === "_") {
                this.pos++;
            } else if (char === "." && !hasDot && !hasE) {
                hasDot = true;
                this.pos++;
            } else {
                const lowerChar = char.toLowerCase();
                if (lowerChar === "e" && !hasE) {
                    hasE = true;
                    this.pos++;
                    const next = this.input[this.pos];
                    if (next === "+" || next === "-") {
                        this.pos++;
                    }
                } else {
                    break;
                }
            }
        }

        return {
            type: "NUMBER",
            value: this.input.substring(start, this.pos),
            pos: start,
        };
    }
}
