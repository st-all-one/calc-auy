import type { CalculationNode, GroupNode, LiteralNode, OperationType, RationalValue } from "./ast/types.ts";
import { RationalNumber } from "./core/rational.ts";
import type { RoundingStrategy } from "./core/constants.ts";
import { evaluate } from "./ast/engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";
import { attachOp } from "./ast/builder_utils.ts";
import { getSubLogger } from "./utils/logger.ts";

const logger = getSubLogger("engine");

export type InputValue = string | number | bigint | CalcAUY;

/**
 * CalcAUY - Fluent Builder for calculation ASTs.
 */
export class CalcAUY {
    readonly #ast: CalculationNode;

    private constructor(ast: CalculationNode) {
        this.#ast = ast;
    }

    public static from(value: InputValue): CalcAUY {
        if (value instanceof CalcAUY) { return value; }

        const r: RationalNumber = RationalNumber.from(value as string | number | bigint);
        const node: LiteralNode = {
            kind: "literal",
            value: r.toJSON() as RationalValue,
            originalInput: value.toString(),
        };
        return new CalcAUY(node);
    }

    public static parseExpression(expression: string): CalcAUY {
        const lexer: Lexer = new Lexer(expression);
        const tokens = lexer.tokenize();
        const parser: Parser = new Parser(tokens);
        return new CalcAUY(parser.parse());
    }

    public static hydrate(ast: CalculationNode | string): CalcAUY {
        const node: CalculationNode = typeof ast === "string" ? JSON.parse(ast) : ast;
        return new CalcAUY(node);
    }

    /**
     * Captura e serializa a árvore atual em uma string JSON pronta para persistência.
     */
    public hibernate(): string {
        return JSON.stringify(this.#ast);
    }

    /**
     * Retorna o objeto da Árvore de Sintaxe Abstrata (AST) no estado atual.
     */
    public getAST(): CalculationNode {
        return this.#ast;
    }

    public setMetadata(key: string, value: unknown): CalcAUY {
        const newAST: CalculationNode = {
            ...this.#ast,
            metadata: { ...(this.#ast.metadata || {}), [key]: value },
        } as CalculationNode;
        return new CalcAUY(newAST);
    }

    public group(): CalcAUY {
        const node: GroupNode = {
            kind: "group",
            child: this.#ast,
        };
        return new CalcAUY(node);
    }

    // --- Fluent Operations ---

    public add(value: InputValue): CalcAUY {
        return this.op("add", value);
    }
    public sub(value: InputValue): CalcAUY {
        return this.op("sub", value);
    }
    public mult(value: InputValue): CalcAUY {
        return this.op("mul", value);
    }
    public div(value: InputValue): CalcAUY {
        return this.op("div", value);
    }
    public pow(value: InputValue): CalcAUY {
        return this.op("pow", value);
    }
    public mod(value: InputValue): CalcAUY {
        return this.op("mod", value);
    }
    public divInt(value: InputValue): CalcAUY {
        return this.op("divInt", value);
    }

    private op(type: OperationType, value: InputValue): CalcAUY {
        let rightNode: CalculationNode;
        let inputType: string;

        if (value instanceof CalcAUY) {
            rightNode = { kind: "group", child: value.#ast };
            inputType = "CalcAUY";
        } else {
            const r: RationalNumber = RationalNumber.from(value as string | number | bigint);
            rightNode = { kind: "literal", value: r.toJSON() as RationalValue, originalInput: value.toString() };
            inputType = typeof value;
        }

        const newAST: CalculationNode = attachOp(this.#ast, type, rightNode);

        logger.debug("Node appended to AST", {
            operation: type,
            input_type: inputType,
            ast_state: newAST,
        });

        return new CalcAUY(newAST);
    }

    public commit(options: { roundStrategy?: RoundingStrategy } = {}): CalcAUYOutput {
        const strategy: RoundingStrategy = options.roundStrategy ?? "NBR5891";
        const result: RationalNumber = evaluate(this.#ast);
        return new CalcAUYOutput(result, this.#ast, strategy);
    }
}
