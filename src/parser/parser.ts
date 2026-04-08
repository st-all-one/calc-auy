import type { Token, TokenType } from "./lexer.ts";
import type {
    CalculationNode,
    GroupNode,
    LiteralNode,
    OperationNode,
    OperationType,
    RationalValue,
} from "../ast/types.ts";
import { RationalNumber } from "../core/rational.ts";
import { CalcAUYError } from "../core/errors.ts";

/**
 * Parser de Descida Recursiva para a CalcAUY.
 * 
 * Implementa as regras de precedência (PEMDAS) através de camadas de métodos, 
 * garantindo que a árvore seja construída com a hierarquia matemática correta.
 * 
 * Gramática EBNF suportada:
 * ```ebnf
 * expression -> term ( (PLUS | MINUS) term )*
 * term       -> power ( (STAR | SLASH | DOUBLE_SLASH | PERCENT) power )*
 * power      -> primary [ CARET power ]
 * primary    -> NUMBER | LPAREN expression RPAREN
 * ```
 */
export class Parser {
    private readonly tokens: Token[];
    private pos = 0;

    public constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    /**
     * Inicia a análise gramatical e gera a AST (Abstract Syntax Tree).
     * @returns {CalculationNode} Raiz da árvore de cálculo.
     * @throws {CalcAUYError} Se houver erro de sintaxe.
     */
    public parse(): CalculationNode {
        const node: CalculationNode = this.expression();
        if (this.peek().type !== "EOF") {
            throw new CalcAUYError("invalid-syntax", `Token inesperado '${this.peek().value}' no final da expressão.`);
        }
        return node;
    }

    /**
     * Resolve Adição e Subtração (Menor prioridade).
     */
    private expression(): CalculationNode {
        let left: CalculationNode = this.term();

        while (this.match("PLUS", "MINUS")) {
            const token: Token = this.previous();
            const right: CalculationNode = this.term();
            left = {
                kind: "operation",
                type: token.type === "PLUS" ? "add" : "sub",
                operands: [left, right],
            } as OperationNode;
        }

        return left;
    }

    /**
     * Resolve Multiplicação, Divisão, Divisão Inteira e Módulo.
     */
    private term(): CalculationNode {
        let left: CalculationNode = this.power();

        while (this.match("STAR", "SLASH", "DOUBLE_SLASH", "PERCENT")) {
            const token: Token = this.previous();
            const right: CalculationNode = this.power();
            let type: OperationType;

            if (token.type === "STAR") { type = "mul"; }
            else if (token.type === "SLASH") { type = "div"; }
            else if (token.type === "DOUBLE_SLASH") { type = "divInt"; }
            else if (token.type === "PERCENT") { type = "mod"; }
            else { throw new CalcAUYError("corrupted-node", "Token de operação inválido no parser."); }

            left = {
                kind: "operation",
                type,
                operands: [left, right],
            } as OperationNode;
        }

        return left;
    }

    /**
     * Resolve Potenciação (Alta prioridade).
     * **Engenharia:** Implementada com associatividade à direita (2^3^4 = 2^(3^4)).
     */
    private power(): CalculationNode {
        const left: CalculationNode = this.primary();

        if (this.match("CARET")) {
            const right: CalculationNode = this.power(); // Chamada recursiva para associatividade à direita
            return {
                kind: "operation",
                type: "pow",
                operands: [left, right],
            } as OperationNode;
        }

        return left;
    }

    /**
     * Resolve Átomos: Números literais ou expressões entre parênteses.
     */
    private primary(): CalculationNode {
        if (this.match("NUMBER")) {
            const token: Token = this.previous();
            const val: RationalNumber = RationalNumber.from(token.value);
            return {
                kind: "literal",
                value: val.toJSON() as RationalValue,
                originalInput: token.value,
            } as LiteralNode;
        }

        if (this.match("LPAREN")) {
            const node: CalculationNode = this.expression();
            this.consume("RPAREN", "Esperado ')' após a expressão.");
            return {
                kind: "group",
                child: node,
            } as GroupNode;
        }

        throw new CalcAUYError("invalid-syntax", `Esperado número ou '(' na posição ${this.peek().pos}.`);
    }

    // --- Helpers ---

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) { return this.advance(); }
        throw new CalcAUYError("invalid-syntax", message);
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) { return false; }
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) { this.pos++; }
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === "EOF";
    }

    private peek(): Token {
        return this.tokens[this.pos];
    }

    private previous(): Token {
        return this.tokens[this.pos - 1];
    }
}
