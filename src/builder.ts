import { CalculationNode, LiteralNode, GroupNode, OperationType } from "./ast.ts";
import { RationalNumber } from "./rational.ts";
import { RoundingStrategy } from "./constants.ts";
import { evaluate } from "./engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";

export type InputValue = string | number | bigint | CalcAUY;

export class CalcAUY {
    readonly #ast: CalculationNode;

    private constructor(ast: CalculationNode) {
        this.#ast = ast;
    }

    static from(value: InputValue): CalcAUY {
        if (value instanceof CalcAUY) return value;

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
        const node: CalculationNode = typeof ast === "string" ? JSON.parse(ast) : ast;
        return new CalcAUY(node);
    }

    /**
     * Captura e serializa a árvore atual em uma string JSON pronta para persistência.
     */
    hibernate(): string {
        return JSON.stringify(this.#ast);
    }

    /**
     * Retorna o objeto da Árvore de Sintaxe Abstrata (AST) no estado atual.
     */
    getAST(): CalculationNode {
        return this.#ast;
    }

    setMetadata(key: string, value: unknown): CalcAUY {
        const newAST = { ...this.#ast, metadata: { ...(this.#ast.metadata || {}), [key]: value } };
        return new CalcAUY(newAST as CalculationNode);
    }

    group(): CalcAUY {
        const node: GroupNode = {
            kind: "group",
            child: this.#ast,
        };
        return new CalcAUY(node);
    }

    // --- Fluent Operations ---

    add(value: InputValue): CalcAUY { return this.op("add", value); }
    sub(value: InputValue): CalcAUY { return this.op("sub", value); }
    mult(value: InputValue): CalcAUY { return this.op("mul", value); }
    div(value: InputValue): CalcAUY { return this.op("div", value); }
    pow(value: InputValue): CalcAUY { return this.op("pow", value); }
    mod(value: InputValue): CalcAUY { return this.op("mod", value); }
    divInt(value: InputValue): CalcAUY { return this.op("divInt", value); }

    // Precedência conforme Spec 07 (Menor valor = Maior prioridade)
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
        let rightNode: CalculationNode;
        if (value instanceof CalcAUY) {
            rightNode = { kind: "group", child: value.#ast };
        } else {
            const r = RationalNumber.from(value as any);
            rightNode = { kind: "literal", value: r.toJSON(), originalInput: value.toString() };
        }

        return new CalcAUY(this.attachOp(this.#ast, type, rightNode));
    }

    /**
     * Anexa recursivamente uma nova operação à árvore respeitando PEMDAS e Associatividade.
     */
    private attachOp(target: CalculationNode, type: OperationType, right: CalculationNode): CalculationNode {
        if (target.kind !== "operation") {
            return { kind: "operation", type, operands: [target, right] };
        }

        const currentPrec = CalcAUY.PRECEDENCE[target.type];
        const newPrec = CalcAUY.PRECEDENCE[type];

        // Regra de Ouro: Se a nova operação tem maior precedência (valor menor),
        // ou se é potência (associatividade à direita), ela deve "mergulhar" para o operando da direita.
        if (newPrec < currentPrec || (type === "pow" && target.type === "pow")) {
            const operands = [...target.operands];
            const last = operands.pop()!;
            const updatedLast = this.attachOp(last, type, right);
            
            return {
                ...target,
                operands: [...operands, updatedLast],
            };
        }

        // Caso contrário, a árvore atual inteira torna-se o operando da esquerda do novo nó.
        return {
            kind: "operation",
            type,
            operands: [target, right],
        };
    }

    commit(options: { roundStrategy?: RoundingStrategy } = {}): CalcAUYOutput {
        const strategy = options.roundStrategy ?? "NBR5891";
        const result = evaluate(this.#ast);
        return new CalcAUYOutput(result, this.#ast, strategy);
    }
}
