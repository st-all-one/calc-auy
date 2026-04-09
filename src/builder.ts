import type {
    CalculationNode,
    GroupNode,
    LiteralNode,
    MetadataValue,
    OperationType,
    RationalValue,
} from "./ast/types.ts";
import { RationalNumber } from "./core/rational.ts";
import { validateMetadata } from "./core/metadata.ts";
import type { RoundingStrategy } from "./core/constants.ts";
import { evaluate } from "./ast/engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";
import { attachOp, validateASTNode } from "./ast/builder_utils.ts";
import { getSubLogger } from "./utils/logger.ts";
import { sanitizeAST, setGlobalLoggingPolicy } from "./utils/sanitizer.ts";
import { type BatchOptions, processBatch } from "./utils/batch.ts";

const logger = getSubLogger("engine");

export type InputValue = string | number | bigint | CalcAUY;

/**
 * CalcAUY - Builder Fluído para Construção de Árvores de Cálculo (AST).
 *
 * Esta classe é o ponto de partida para qualquer operação matemática na biblioteca.
 * Ela utiliza o padrão Builder para acumular operações em uma estrutura de árvore
 * imutável, permitindo que a avaliação matemática real seja postergada até o momento
 * do `commit()`.
 *
 * @class
 */
export class CalcAUY {
    readonly #ast: CalculationNode;

    private constructor(ast: CalculationNode) {
        this.#ast = ast;
    }

    /**
     * Define a política global de logging para a proteção de PII.
     *
     * **Engenharia:** Atua na 1ª camada de controle. Quando ativado (sensitive: true, padrão),
     * os dados são considerados sensíveis e serão OCULTADOS nos logs, a menos que um nó
     * tenha sido explicitamente marcado com pii: false via metadata.
     *
     * @param policy Configuração da política (ex: { sensitive: false } para mostrar dados).
     * @returns A classe CalcAUY para encadeamento.
     */
    public static setLoggingPolicy(policy: { sensitive: boolean }): typeof CalcAUY {
        setGlobalLoggingPolicy(policy);
        return CalcAUY;
    }

    /**
     * Define a política global de logging (versão de instância fluente).
     * @param policy Configuração da política.
     * @returns A instância atual para continuidade do builder.
     */
    public setLoggingPolicy(policy: { sensitive: boolean }): CalcAUY {
        setGlobalLoggingPolicy(policy);
        return this;
    }

    /**
     * Cria uma nova instância de CalcAUY a partir de um valor inicial.
     *
     * **Engenharia:** O valor de entrada é imediatamente convertido em um `RationalNumber`
     * (fração n/d) para garantir que a precisão seja preservada desde o primeiro nó da árvore.
     *
     * @param value - Aceita string (recomendado), number, bigint ou outra instância de CalcAUY.
     * @returns Uma nova instância de CalcAUY (Nó Literal).
     *
     * @example Exemplo Simples
     * ```ts
     * const calc = CalcAUY.from(100);
     * ```
     *
     * @example Operações Aninhadas
     * ```ts
     * const subCalc = CalcAUY.from(50).add(20);
     * const main = CalcAUY.from(subCalc).mult(2);
     * ```
     *
     * @example Cenário Real: Início de Fatura
     * ```ts
     * // Ingestão segura de valor vindo de um banco de dados ou input de usuário
     * const valorBase = CalcAUY.from("1250.50");
     * ```
     *
     * @example Cenário Real Complexo: Composição de Impostos
     * ```ts
     * const icms = CalcAUY.from("0.18");
     * const baseCalculo = CalcAUY.from("1000.00").add("50.00"); // Base + Frete
     * ```
     */
    public static from(value: InputValue): CalcAUY {
        if (value instanceof CalcAUY) { return value; }

        const r: RationalNumber = RationalNumber.from(value as string | number | bigint);
        const node: LiteralNode = {
            kind: "literal",
            value: r.toJSON() as RationalValue,
            originalInput: value.toString(),
        };

        if (logger.isEnabledFor("debug")) {
            logger.debug("CalcAUY Instance Created", {
                input_type: typeof value,
                structure: sanitizeAST(node),
            });
        }

        return new CalcAUY(node);
    }

    /**
     * Analisa uma string contendo uma expressão matemática complexa e a transforma em uma AST.
     *
     * **Engenharia:** Utiliza um Parser de Descida Recursiva que respeita a precedência
     * matemática padrão (PEMDAS). A expressão é tokenizada e validada antes de ser convertida em nós.
     *
     * @param expression - String como "(10 + 5) * 2 / 3".
     * @returns Instância de CalcAUY representando a árvore da expressão.
     *
     * @example Exemplo Simples
     * ```ts
     * const calc = CalcAUY.parseExpression("1 + 1");
     * ```
     *
     * @example Operações Aninhadas
     * ```ts
     * const calc = CalcAUY.parseExpression("(10 + 5) * (2 ^ 3)");
     * ```
     *
     * @example Cenário Real: Fórmula de Desconto Progressivo
     * ```ts
     * const formula = "1000 * (1 - 0.15) + 50"; // Valor * (1 - Desc) + Taxa
     * const calc = CalcAUY.parseExpression(formula);
     * ```
     *
     * @example Cenário Real Complexo: Juros Compostos
     * ```ts
     * // M = P * (1 + i) ^ n
     * const jurosComp = "5000 * (1 + 0.02) ^ 12";
     * const output = CalcAUY.parseExpression(jurosComp).commit();
     * ```
     */
    public static parseExpression(expression: string): CalcAUY {
        const lexer: Lexer = new Lexer(expression);
        const tokens = lexer.tokenize();
        const parser: Parser = new Parser(tokens);
        return new CalcAUY(parser.parse());
    }

    /**
     * Reconstrói um cálculo a partir de um estado salvo (JSON).
     *
     * **Engenharia:** Suporta tanto a árvore pura (AST) quanto o objeto completo
     * gerado pelo `toAuditTrace()`. Se um snapshot de auditoria for detectado,
     * o método extrai automaticamente a árvore original, ignorando os resultados
     * consolidados e permitindo a continuidade do cálculo.
     *
     * @param ast - Objeto CalculationNode, Snapshot de Auditoria ou string JSON.
     * @returns Instância hidratada pronta para novas operações.
     *
     * @example Exemplo Simples (AST Pura)
     * ```ts
     * const calc = CalcAUY.hydrate(node);
     * ```
     *
     * @example Hidratação via Rastro de Auditoria (Audit Trace)
     * ```ts
     * const audit = res.toAuditTrace(); // { ast: {...}, finalResult: ..., strategy: ... }
     * const calc = CalcAUY.hydrate(audit).add(50); // Retoma o cálculo
     * ```
     */
    public static hydrate(ast: CalculationNode | string | object): CalcAUY {
        const data = typeof ast === "string" ? JSON.parse(ast) : ast;

        // Se for um snapshot de auditoria (contém a chave 'ast'), extraímos apenas a árvore.
        const node: CalculationNode = (data && typeof data === "object" && "ast" in data) ? data.ast : data;

        validateASTNode(node);

        return new CalcAUY(node);
    }

    /**
     * Processa um array de itens de forma assíncrona e em lotes (Yielding).
     *
     * **Engenharia:** Evita o bloqueio do Event Loop em cálculos massivos, cedendo a CPU
     * periodicamente para que o servidor possa atender outras requisições ou I/O.
     *
     * @param items Array de dados.
     * @param task Função de transformação/cálculo.
     * @param options Configuração do lote (batchSize e onProgress).
     */
    public static async processBatch<T, R>(
        items: T[],
        task: (item: T, index: number) => R,
        options?: BatchOptions,
    ): Promise<R[]> {
        return await processBatch(items, task, options);
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

    /**
     * Anexa metadados de negócio ao nó atual da árvore.
     *
     * **Engenharia:** Fundamental para auditoria forense. Permite justificar cada
     * operação (ex: "ID da regra de imposto", "nome do operador", "timestamp").
     *
     * @param key - Chave do metadado.
     * @param value - Valor (deve ser serializável).
     * @returns Nova instância enriquecida.
     *
     * @example Exemplo Simples
     * ```ts
     * const calc = CalcAUY.from(100).setMetadata("owner", "user_1");
     * ```
     *
     * @example Operações Aninhadas
     * ```ts
     * const calc = CalcAUY.from(10).add(5).setMetadata("step", 1).mult(2).setMetadata("step", 2);
     * ```
     *
     * @example Cenário Real: Marcação de Tributo
     * ```ts
     * const calc = CalcAUY.from("500.00").mult("0.05")
     *   .setMetadata("tax_name", "ISS")
     *   .setMetadata("law_reference", "Artigo 123");
     * ```
     *
     * @example Cenário Real Complexo: Auditoria de Payroll
     * ```ts
     * const salario = CalcAUY.from(5000)
     *   .sub(400).setMetadata("reason", "inss")
     *   .sub(150).setMetadata("reason", "plano_saude")
     *   .setMetadata("process_id", "2026-04-07-payroll");
     * ```
     */
    public setMetadata(key: string, value: MetadataValue): CalcAUY {
        validateMetadata(value);
        const newAST: CalculationNode = {
            ...this.#ast,
            metadata: { ...(this.#ast.metadata || {}), [key]: value },
        } as CalculationNode;

        if (logger.isEnabledFor("debug")) {
            logger.debug("Metadata Attached", {
                key,
                structure: sanitizeAST(newAST),
            });
        }

        return new CalcAUY(newAST);
    }

    /**
     * Envolve a expressão atual em um grupo (parênteses).
     *
     * **Engenharia:** Força a precedência matemática. Útil quando você quer isolar
     * um bloco de cálculo antes de aplicar uma nova operação multiplicativa.
     *
     * @returns Nova instância com Nó de Agrupamento.
     *
     * @example Exemplo Simples
     * ```ts
     * // Resulta em (10 + 5)
     * const calc = CalcAUY.from(10).add(5).group();
     * ```
     *
     * @example Operações Aninhadas
     * ```ts
     * // Sem group: 10 + 5 * 2 = 20
     * // Com group: (10 + 5) * 2 = 30
     * const calc = CalcAUY.from(10).add(5).group().mult(2);
     * ```
     *
     * @example Cenário Real: Cálculo de Base com Adicional
     * ```ts
     * // (Salário + Bônus) * Alíquota
     * const base = CalcAUY.from(3000).add(500).group().mult("0.15");
     * ```
     *
     * @example Cenário Real Complexo: Proporcionalidade de Multa
     * ```ts
     * // (Valor_Total / Dias_Mes) * Dias_Atraso * Taxa_Multa
     * const multa = CalcAUY.from(1000).div(30).group().mult(5).mult("0.02");
     * ```
     */
    public group(): CalcAUY {
        const node: GroupNode = {
            kind: "group",
            child: this.#ast,
        };

        if (logger.isEnabledFor("debug")) {
            logger.debug("Grouping Applied", {
                structure: sanitizeAST(node),
            });
        }

        return new CalcAUY(node);
    }

    // --- Fluent Operations ---

    /** Adição Aritmética. */
    public add(value: InputValue): CalcAUY {
        return this.op("add", value);
    }
    /** Subtração Aritmética. */
    public sub(value: InputValue): CalcAUY {
        return this.op("sub", value);
    }
    /** Multiplicação. Respeita PEMDAS. */
    public mult(value: InputValue): CalcAUY {
        return this.op("mul", value);
    }
    /** Divisão Racional (Infinita até o commit). */
    public div(value: InputValue): CalcAUY {
        return this.op("div", value);
    }
    /** Potenciação. */
    public pow(value: InputValue): CalcAUY {
        return this.op("pow", value);
    }
    /** Módulo (Resto) Euclidiano. */
    public mod(value: InputValue): CalcAUY {
        return this.op("mod", value);
    }
    /** Divisão Inteira (Quociente). */
    public divInt(value: InputValue): CalcAUY {
        return this.op("divInt", value);
    }

    /**
     * Método interno para anexar operações na árvore.
     * @private
     */
    private op(type: OperationType, value: InputValue): CalcAUY {
        let rightNode: CalculationNode;
        let inputType: string;

        // Auto-Agrupamento: Se injetar um CalcAUY, ele é tratado como um bloco lógico isolado.
        if (value instanceof CalcAUY) {
            rightNode = { kind: "group", child: value.#ast };
            inputType = "CalcAUY";
        } else {
            const r: RationalNumber = RationalNumber.from(value as string | number | bigint);
            rightNode = { kind: "literal", value: r.toJSON() as RationalValue, originalInput: value.toString() };
            inputType = typeof value;
        }

        const newAST: CalculationNode = attachOp(this.#ast, type, rightNode);

        if (logger.isEnabledFor("debug")) {
            logger.debug("Node appended to AST", {
                operation: type,
                input_type: inputType,
                structure: sanitizeAST(newAST),
            });
        }

        return new CalcAUY(newAST);
    }

    /**
     * Finaliza a construção da árvore e inicia a fase de avaliação.
     *
     * **Engenharia:** Esta é a fase de transição. A AST é percorrida recursivamente,
     * colapsando frações racionais até chegar no resultado final. O arredondamento
     * só é aplicado aqui ou nos outputs, nunca durante a construção.
     *
     * @param options - Configurações de arredondamento.
     * @returns Uma instância de CalcAUYOutput contendo o resultado final e a AST.
     *
     * @example Exemplo Simples
     * ```ts
     * const res = CalcAUY.from(10).add(5).commit();
     * ```
     *
     * @example Estratégia Customizada
     * ```ts
     * const res = CalcAUY.from("1.255").commit({ roundStrategy: "HALF_EVEN" });
     * ```
     *
     * @example Cenário Real: Fechamento de Venda
     * ```ts
     * const total = CalcAUY.from("99.90").mult(3).commit({ roundStrategy: "NBR5891" });
     * ```
     *
     * @example Cenário Real Complexo: Cálculo Fiscal com Truncagem
     * ```ts
     * // Muitos cálculos fiscais exigem TRUNCATE para não favorecer o contribuinte
     * const icms = CalcAUY.from("1250.45").mult("0.18").commit({ roundStrategy: "TRUNCATE" });
     * ```
     */
    public commit(options: { roundStrategy?: RoundingStrategy } = {}): CalcAUYOutput {
        const strategy: RoundingStrategy = options.roundStrategy ?? "NBR5891";
        const result: RationalNumber = evaluate(this.#ast);
        return new CalcAUYOutput(result, this.#ast, strategy);
    }
}
