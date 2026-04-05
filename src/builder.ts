import { CalculationNode, GroupNode, LiteralNode, OperationNode, OperationType } from "./ast.ts";
import { RationalNumber } from "./rational.ts";
import { RoundingStrategy } from "./constants.ts";
import { evaluate } from "./engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";
import { getSubLogger } from "./logger.ts";

const logger = getSubLogger("builder");

export type InputValue = string | number | bigint | CalcAUY;

export class CalcAUY {
    readonly #ast: CalculationNode;

    private constructor(ast: CalculationNode) {
        this.#ast = ast;
    }

    static from(value: InputValue): CalcAUY {
        if (value instanceof CalcAUY) { return value; }

        const r = RationalNumber.from(value as any);
        const node: LiteralNode = {
            kind: "literal",
            value: r.toJSON(),
            originalInput: value.toString(),
        };
        return new CalcAUY(node);
    }

    static parseExpression(expression: string): CalcAUY {
        const lexer = new Lexer(expression);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        return new CalcAUY(parser.parse());
    }

    static hydrate(ast: CalculationNode | string): CalcAUY {
        const node = typeof ast === "string" ? JSON.parse(ast) : ast;
        // Validation would go here (Spec 10)
        return new CalcAUY(node);
    }

    hibernate(): CalculationNode {
        return this.#ast;
    }

    getAST(): CalculationNode {
        return this.#ast;
    }

    setMetadata(key: string, value: unknown): CalcAUY {
        const newAST = { ...this.#ast, metadata: { ...(this.#ast.metadata || {}), [key]: value } };
        return new CalcAUY(newAST);
    }

    group(): CalcAUY {
        const node: GroupNode = {
            kind: "group",
            child: this.#ast,
        };
        return new CalcAUY(node);
    }

    // --- Fluent Operations ---

    add(value: InputValue): CalcAUY {
        return this.op("add", value);
    }
    sub(value: InputValue): CalcAUY {
        return this.op("sub", value);
    }
    mult(value: InputValue): CalcAUY {
        return this.op("mul", value);
    }
    div(value: InputValue): CalcAUY {
        return this.op("div", value);
    }
    pow(value: InputValue): CalcAUY {
        return this.op("pow", value);
    }
    mod(value: InputValue): CalcAUY {
        return this.op("mod", value);
    }
    divInt(value: InputValue): CalcAUY {
        return this.op("divInt", value);
    }

    // Precedência conforme Spec 07
    private static readonly PRECEDENCE: Record<OperationType, number> = {
        pow: 2,
        mul: 3,
        div: 3,
        divInt: 3,
        mod: 3,
        add: 4,
        sub: 4,
    };

    private op(type: OperationType, value: InputValue): CalcAUY {
        logger.debug(`Operation ${type} requested`, { currentAST: this.#ast });

        let rightNode: CalculationNode;
        if (value instanceof CalcAUY) {
            rightNode = { kind: "group", child: value.#ast };
        } else {
            const r = RationalNumber.from(value as any);
            rightNode = { kind: "literal", value: r.toJSON(), originalInput: value.toString() };
        }

        const newPrec = CalcAUY.PRECEDENCE[type];
        const currentAST = this.#ast;

        // Se a raiz atual for uma operação e tiver menor precedência (número maior),
        // precisamos descer para manter a hierarquia correta (Spec 07).
        if (currentAST.kind === "operation") {
            const currentPrec = CalcAUY.PRECEDENCE[currentAST.type];

            // Caso especial: Precedência superior ou Associatividade à Direita (para potências)
            if (newPrec < currentPrec || (type === "pow" && currentAST.type === "pow")) {
                const operands = [...currentAST.operands];
                const lastOperand = operands.pop()!;

                // O novo nó "rouba" o último operando do nó anterior
                const nestedNode: OperationNode = {
                    kind: "operation",
                    type,
                    operands: [lastOperand, rightNode],
                };

                const rotatedNode: OperationNode = {
                    ...currentAST,
                    operands: [...operands, nestedNode],
                };

                return new CalcAUY(rotatedNode);
            }
        }

        // Caso padrão: Envolve a árvore atual como operando da esquerda
        const node: OperationNode = {
            kind: "operation",
            type,
            operands: [this.#ast, rightNode],
        };
        return new CalcAUY(node);
    }

    commit(options: { roundStrategy?: RoundingStrategy } = {}): CalcAUYOutput {
        const strategy = options.roundStrategy ?? "NBR5891";
        const result = evaluate(this.#ast);
        return new CalcAUYOutput(result, this.#ast, strategy);
    }
}
