/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type {
    CalculationNode,
    ControlNode,
    GroupNode,
    LiteralNode,
    MetadataValue,
    OperationType,
    RationalValue,
    SerializedCalculation,
} from "./ast/types.ts";
import { getActiveSession, RationalNumber } from "./core/rational.ts";
import { validateMetadata } from "./core/metadata.ts";
import type { RoundingStrategy } from "./core/constants.ts";
import { evaluate } from "./ast/engine.ts";
import { CalcAUYOutput } from "./output.ts";
import { Lexer } from "./parser/lexer.ts";
import { Parser } from "./parser/parser.ts";
import { attachOp, validateASTNode } from "./ast/builder_utils.ts";
import { getSubLogger, startSpan } from "./utils/logger.ts";
import { sanitizeAST, type SignatureEncoder } from "./utils/sanitizer.ts";
import { generateSignature } from "./utils/security.ts";
import { CalcAUYError } from "./core/errors.ts";
import type { InstanceConfig } from "./core/types.ts";
import { BIRTH_TICKET_MOCK } from "./core/constants.ts";

const logger = getSubLogger("engine");

/**
 * FinalizationRegistry para limpeza automática de chaves no cache global da AST.
 */
const astCacheRegistry = new FinalizationRegistry<string>((key) => {
    globalLiteralNodeCache.delete(key);
});

/**
 * Hot Cache - Referências fortes para nós da AST mais frequentes.
 */
const hotLiteralNodeCache = new Map<string, LiteralNode>();
const HOT_CACHE_LIMIT = 512;

/**
 * Cache Global Inteligente para reuso de nós literais "limpos".
 *
 * **Engenharia:** Utiliza Referências Fracas para permitir que o GC libere
 * nós da AST que não pertencem mais a nenhuma árvore de cálculo ativa.
 */
const globalLiteralNodeCache = new Map<string, WeakRef<LiteralNode>>();

export type InputValue<C extends string, P extends InstanceConfig = InstanceConfig> =
    | string
    | number
    | bigint
    | CalcAUYLogic<C, P>;

/**
 * CalcAUYLogic - Builder Fluído para Construção de Árvores de Cálculo (AST).
 *
 * Esta classe utiliza o padrão Builder para acumular operações em uma estrutura de árvore
 * imutável. Agora possui isolamento estrito via Branding, Symbols e Literal Configuration.
 *
 * @class
 */
export class CalcAUYLogic<Context extends string, Config extends InstanceConfig = InstanceConfig> {
    readonly #ast: CalculationNode | null;
    readonly #instanceId: symbol;
    readonly #config: Required<InstanceConfig>;
    readonly #birthTime: string | null;

    // Branding para IDE: Impede mistura de instâncias com labels ou configurações diferentes
    // @ts-ignore: Branding field
    private readonly __context!: Context;
    // @ts-ignore: Branding field
    private readonly __config_brand!: Config;

    /** @internal */
    constructor(
        ast: CalculationNode | null,
        instanceId: symbol,
        config: Required<InstanceConfig>,
        birthTime: string | null,
    ) {
        this.#ast = ast;
        this.#instanceId = instanceId;
        this.#config = config;
        this.#birthTime = birthTime;
    }

    /**
     * Cria uma nova instância de CalcAUYLogic a partir de um valor inicial.
     */
    public from(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        if (value instanceof CalcAUYLogic) {
            this.validateInstance(value);
            // Se a instância atual estiver vazia, assume a AST da instância recebida
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(value.#ast, this.#instanceId, this.#config, value.#birthTime);
            }
            return value;
        }

        let inputStr: string;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.endsWith("%")) {
                inputStr = `${trimmed.slice(0, -1).replace(/_/g, "")}/100`;
            } else {
                inputStr = value;
            }
        } else {
            inputStr = value.toString();
        }

        // Prioridade 1: Cache de Sessão (Escopado)
        const session = getActiveSession();
        const sessionCached = session?.getExtra<LiteralNode>(inputStr);
        if (sessionCached) {
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(
                    sessionCached,
                    this.#instanceId,
                    this.#config,
                    this.#generateBirthTime(),
                );
            }
            return this.op("add", value);
        }

        // Prioridade 2: Hot Cache (Referências Fortes)
        const hotCached = hotLiteralNodeCache.get(inputStr);
        if (hotCached) {
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(
                    hotCached,
                    this.#instanceId,
                    this.#config,
                    this.#generateBirthTime(),
                );
            }
            return this.op("add", value);
        }

        // Prioridade 3: Cold Cache (WeakRef)
        const globalRef = globalLiteralNodeCache.get(inputStr);
        const globalCached = globalRef?.deref();
        if (globalCached) {
            if (this.#ast === null) {
                return new CalcAUYLogic<Context, Config>(
                    globalCached,
                    this.#instanceId,
                    this.#config,
                    this.#generateBirthTime(),
                );
            }
            if (hotLiteralNodeCache.size < HOT_CACHE_LIMIT) {
                hotLiteralNodeCache.set(inputStr, globalCached);
            }
            return this.op("add", value);
        }

        const newNode = this.#createBaseNode(inputStr);

        if (session) {
            session.setExtra(inputStr, newNode);
        } else {
            if (hotLiteralNodeCache.size < HOT_CACHE_LIMIT) {
                hotLiteralNodeCache.set(inputStr, newNode);
            }
            globalLiteralNodeCache.set(inputStr, new WeakRef(newNode));
            astCacheRegistry.register(newNode, inputStr);
        }

        if (this.#ast === null) {
            return new CalcAUYLogic<Context, Config>(
                newNode,
                this.#instanceId,
                this.#config,
                this.#generateBirthTime(),
            );
        }

        return this.op("add", value);
    }

    /**
     * Analisa uma string contendo uma expressão matemática complexa.
     */
    public parseExpression(expression: string): CalcAUYLogic<Context, Config> {
        const lexer: Lexer = new Lexer(expression);
        const tokens = lexer.tokenize();
        const parser: Parser = new Parser(tokens);
        const newNode = parser.parse();

        if (this.#ast === null) {
            return new CalcAUYLogic<Context, Config>(
                newNode,
                this.#instanceId,
                this.#config,
                this.#generateBirthTime(),
            );
        }

        // Se já houver AST, adiciona a expressão à árvore atual
        return this.add(new CalcAUYLogic<Context, Config>(newNode, this.#instanceId, this.#config, this.#birthTime));
    }

    /**
     * Retorna a configuração da instância atual (apenas leitura).
     * @internal
     */
    public getContextConfig(): Required<InstanceConfig> {
        return { ...this.#config };
    }

    /**
     * Reconstrói um cálculo a partir de um estado salvo (JSON) e valida sua integridade.
     *
     * **Engenharia:** Permite opcionalmente informar um salt e encoder diferentes do
     * atual da instância, possibilitando a hidratação segura de cálculos vindos de
     * outros contextos isolados.
     */
    public async hydrate(
        ast: CalculationNode | string | object,
        config: { salt?: string; encoder?: SignatureEncoder } = {},
    ): Promise<CalcAUYLogic<Context, Config>> {
        const payload: SerializedCalculation = typeof ast === "string" ? JSON.parse(ast) : ast as SerializedCalculation;
        const signature = payload.signature;

        if (!signature) {
            throw new CalcAUYError("integrity-critical-violation", "Assinatura ausente na hidratação.");
        }

        const verificationSalt = config.salt ?? this.#config.salt;
        const verificationEncoder = config.encoder ?? this.#config.encoder;

        // Decisão de Dados para Verificação:
        // Se o payload contém resultado e estratégia, ele é um Audit Trace (Assinado como envelope)
        // Se não, ele é um rastro de hibernação (Assinado como AST pura)
        const isAuditTrace = payload.finalResult !== undefined && payload.roundStrategy !== undefined;
        const dataToVerify = isAuditTrace
            ? {
                ast: payload.ast,
                finalResult: payload.finalResult,
                roundStrategy: payload.roundStrategy,
            }
            : payload.ast;

        const expectedHash = await generateSignature(dataToVerify, verificationSalt, verificationEncoder);
        if (signature !== expectedHash) {
            throw new CalcAUYError("integrity-critical-violation", "Violação de integridade na hidratação.");
        }

        const node: CalculationNode = payload.ast;
        validateASTNode(node);

        // Extrai o birthTime original se disponível nos metadados da raiz
        const originalBirthTime = node.metadata?.timestamp as string | undefined;

        // Envolve em nó de controle (reanimação)
        const controlNode: ControlNode = {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                previousContextLabel: payload.contextLabel || "",
                previousSignature: signature,
                previousRoundStrategy: payload.roundStrategy || "",
            },
            child: node,
        };

        return new CalcAUYLogic<Context, Config>(
            controlNode,
            this.#instanceId,
            this.#config,
            originalBirthTime || null,
        );
    }

    /**
     * Captura e serializa a árvore atual em uma string JSON pronta para persistência.
     */
    public async hibernate(): Promise<string> {
        const root = this.assertAST();

        // Injeta o carimbo de nascimento apenas no fechamento
        // Otimização: Shallow copy do root para evitar structuredClone pesado em árvores imutáveis
        const ast = this.#birthTime
            ? { ...root, metadata: { ...root.metadata, timestamp: this.#birthTime } } as CalculationNode
            : root;

        const signature = await generateSignature(ast, this.#config.salt, this.#config.encoder);
        const payload: SerializedCalculation = {
            ast,
            signature,
            contextLabel: this.#config.contextLabel,
        };
        return JSON.stringify(payload);
    }

    /**
     * Incorpora um cálculo de uma instância externa (cross-context).
     *
     * **Engenharia:** Este é o único portal seguro para unir cálculos de jurisdições diferentes.
     * Ele valida a integridade, assina o dado externo e o carimba com um nó de controle.
     * Pode ser usado como ponto de partida (substituindo o .from) ou para anexar a um cálculo existente.
     */
    public async fromExternalInstance(
        external: CalcAUYLogic<string, InstanceConfig> | string | object,
    ): Promise<CalcAUYLogic<Context, Config>> {
        let externalAST: CalculationNode;
        let externalSignature: string;
        let externalContextLabel = "";
        let externalStrategy = "";
        let externalBirthTime: string | null = null;

        if (external instanceof CalcAUYLogic) {
            // Instância "Viva": Fecha com assinatura imediata e valida
            const hibernated = await external.hibernate();
            const payload: SerializedCalculation = JSON.parse(hibernated);
            // deno-lint-ignore no-non-null-assertion
            externalAST = payload.ast!;
            externalSignature = payload.signature;
            const extConfig = external.getContextConfig();
            externalContextLabel = extConfig.contextLabel;
            externalStrategy = extConfig.roundStrategy || "";
            externalBirthTime = (externalAST.metadata?.timestamp as string) || null;
        } else {
            // Objeto ou JSON serializado
            const payload: SerializedCalculation = typeof external === "string"
                ? JSON.parse(external)
                : external as SerializedCalculation;
            if (!payload.signature) {
                throw new CalcAUYError(
                    "integrity-critical-violation",
                    "Instância externa sem assinatura de integridade.",
                );
            }
            // deno-lint-ignore no-non-null-assertion
            externalAST = payload.ast!;
            externalSignature = payload.signature;
            externalContextLabel = payload.contextLabel || "";
            externalStrategy = payload.roundStrategy || "";
            // Validação estrutural básica
            validateASTNode(externalAST);
            externalBirthTime = (externalAST.metadata?.timestamp as string) || null;
        }

        // Carimbo de Jurisdição (Linhagem original preservada)
        const controlNode: ControlNode = {
            kind: "control",
            type: "reanimation_event",
            metadata: {
                previousContextLabel: externalContextLabel,
                previousSignature: externalSignature,
                previousRoundStrategy: externalStrategy,
            },
            child: externalAST,
        };

        if (this.#ast === null) {
            // Se for o ponto de partida, herda o nascimento da instância externa ou gera um novo
            const birth = externalBirthTime || this.#generateBirthTime();
            return new CalcAUYLogic<Context, Config>(controlNode, this.#instanceId, this.#config, birth);
        }

        // União via operação especial, envolvida em grupo por segurança
        const group: GroupNode = { kind: "group", child: controlNode };
        const newAST = attachOp(this.assertAST(), "crossContextAdd", group);

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    }

    /**
     * Anexa metadados de negócio ao nó atual da árvore.
     */
    public setMetadata(key: string, value: MetadataValue): CalcAUYLogic<Context, Config> {
        validateMetadata(value);
        const ast = this.assertAST();
        const newAST: CalculationNode = {
            ...ast,
            metadata: { ...(ast.metadata), [key]: value },
        } as CalculationNode;

        if (logger.isEnabledFor("debug")) {
            logger.debug("Metadata Attached", {
                key,
                structure: sanitizeAST(newAST, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    }

    /**
     * Envolve a expressão atual em um grupo (parênteses).
     */
    public group(): CalcAUYLogic<Context, Config> {
        const ast = this.assertAST();
        if (ast.kind === "group" || ast.kind === "literal") {
            return this;
        }

        const node: GroupNode = {
            kind: "group",
            child: ast,
        };

        if (logger.isEnabledFor("debug")) {
            logger.debug("Grouping Applied", {
                structure: sanitizeAST(node, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(node, this.#instanceId, this.#config, this.#birthTime);
    }

    // --- Fluent Operations ---

    public add(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("add", value);
    }
    public sub(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("sub", value);
    }
    public mult(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("mul", value);
    }
    public div(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("div", value);
    }
    public pow(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("pow", value);
    }
    public mod(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("mod", value);
    }
    public divInt(value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        return this.op("divInt", value);
    }

    /**
     * Garante que a AST foi inicializada.
     * @private
     */
    private assertAST(): CalculationNode {
        if (this.#ast === null) {
            throw new CalcAUYError(
                "invalid-syntax",
                "O cálculo ainda não foi inicializado. Use .from() ou .parseExpression() como ponto de partida.",
            );
        }
        return this.#ast;
    }

    /**
     * Valida se a instância fornecida pertence ao mesmo contexto.
     * @private
     */
    private validateInstance(other: CalcAUYLogic<string, InstanceConfig>): void {
        if (other.#instanceId !== this.#instanceId) {
            throw new CalcAUYError(
                "instance-mismatch",
                `Tentativa de misturar instâncias de contextos diferentes. Use 'fromExternalInstance' para integração cross-context.`,
                {
                    currentContext: this.#config.contextLabel,
                    otherContext: other.getContextConfig().contextLabel,
                },
            );
        }
    }

    /**
     * Gera o timestamp de nascimento seguindo as regras de mock.
     * @private
     */
    #generateBirthTime(): string {
        return (this.#config[BIRTH_TICKET_MOCK] as string) || new Date().toISOString();
    }

    /**
     * Helper centralizado para criação de nós base literais.
     * @private
     */
    #createBaseNode(input: string): LiteralNode {
        const r: RationalNumber = RationalNumber.from(input);
        return {
            kind: "literal",
            value: r.toJSON() as RationalValue,
            originalInput: input,
        };
    }

    /**
     * Método interno para anexar operações na árvore.
     * @private
     */
    private op(type: OperationType, value: InputValue<Context, Config>): CalcAUYLogic<Context, Config> {
        const ast = this.assertAST();
        let rightNode: CalculationNode;
        let inputType: string;

        if (value instanceof CalcAUYLogic) {
            this.validateInstance(value);
            const innerAST = value.assertAST();
            if (innerAST.kind === "group" || innerAST.kind === "literal") {
                rightNode = innerAST;
            } else {
                rightNode = { kind: "group", child: innerAST };
            }
            inputType = "CalcAUYLogic";
        } else {
            const r: RationalNumber = RationalNumber.from(value);
            rightNode = {
                kind: "literal",
                value: r.toJSON() as RationalValue,
                originalInput: value.toString(),
            };
            inputType = typeof value;
        }

        const newAST: CalculationNode = attachOp(ast, type, rightNode);

        if (logger.isEnabledFor("debug")) {
            logger.debug("Node appended to AST", {
                operation: type,
                input_type: inputType,
                structure: sanitizeAST(newAST, this.#config),
            });
        }

        return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    }

    /**
     * Finaliza a construção da árvore e inicia a fase de avaliação.
     */
    public async commit(): Promise<CalcAUYOutput> {
        using _span = startSpan("commit", logger);
        const root = this.assertAST();

        // Otimização: Shallow copy do root para injeção de timestamp, preservando a árvore original
        const ast = this.#birthTime
            ? { ...root, metadata: { ...root.metadata, timestamp: this.#birthTime } } as CalculationNode
            : root;

        const roundStrategy: RoundingStrategy = this.#config.roundStrategy;
        const result: RationalNumber = evaluate(ast);

        // Gera a assinatura de integridade do resultado consolidado (AST fixa + Resultado)
        const payload = {
            ast,
            finalResult: result.toJSON(),
            roundStrategy,
        };
        const signature = await generateSignature(payload, this.#config.salt, this.#config.encoder);

        return new CalcAUYOutput(result, ast, roundStrategy, signature, this.#config);
    }
}
