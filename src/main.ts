// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// deno-lint-ignore-file ban-unused-ignore default-param-last

import { calculateBigIntPower, calculateFractionalPower } from "./internal/math_utils.ts";
import { parseStringValue } from "./internal/parser.ts";
import { toSuperscript } from "./internal/superscript.ts";
import { wrapLaTeX, wrapUnicode } from "./internal/wrappers.ts";
import { CalcAUDOutput } from "./output.ts";
import { DEFAULT_DISPLAY_PRECISION, INTERNAL_SCALE_FACTOR } from "./constants.ts";
import type { CalcAUDOutputOptions, MathDivModStrategy } from "./output_helpers/options.ts";
import { VERBAL_TOKENS } from "./output_helpers/i18n.ts";
import { CalcAUDError, logFatal } from "./errors.ts";
import { Logger } from "./logger.ts";

/**
 * Representa qualquer valor numérico ou instância de CalcAUD que possa ser
 * processado pela biblioteca.
 *
 * Suporta strings (decimais, frações, científicos), numbers (finitos) e BigInts.
 */
export type CalcAUDAllowedValue = string | number | bigint | CalcAUD;

/**
 * Classe principal da biblioteca CalcAUD.
 *
 * CalcAUD é um motor de cálculo imutável projetado para operações financeiras
 * de alta precisão (12 casas decimais internas) com auditoria nativa.
 * Cada operação realizada gera um rastro de auditoria em LaTeX, Unicode e Verbal,
 * permitindo total transparência e acessibilidade (A11y).
 *
 * @example
 * ```ts
 * // Exemplo Básico: Soma Simples
 * const total = CalcAUD.from(10).add(5).commit(2);
 * console.log(total.toMonetary()); // "R$ 15,00"
 * ```
 *
 * @example
 * ```ts
 * // Exemplo Intermediário: Cálculo de Imposto com Agrupamento
 * const base = CalcAUD.from("1250.50");
 * const imposto = base.mult("0.15").group().add(50).commit(2);
 * console.log(imposto.toLaTeX()); // "$$ (1250.50 \times 0.15) + 50 = ... $$"
 * ```
 *
 * @example
 * ```ts
 * // Exemplo Avançado: Juros Compostos (Potenciação Fracionária)
 * // Taxa de 10% ao ano para 6 meses: (1 + 0.10)^(6/12)
 * const taxaAnual = CalcAUD.from(1).add("0.10");
 * const taxaSemestral = taxaAnual.pow("6/12").sub(1).commit(4);
 * console.log(taxaSemestral.toVerbalA11y()); // "... elevado a 6/12 ..."
 * ```
 */
/**
 * Tipos de operações pendentes dentro de um termo multiplicativo.
 * Essencial para manter a precedência de Potência > (Mult/Div/Mod/DivInt).
 */
export type CalcAUDPendingOperation = "MULT" | "DIV" | "DIV_INT" | "MOD";
export type CalcAUDPendingStrategy = MathDivModStrategy;

export class CalcAUD {
    private readonly accumulatedValue: bigint;
    private readonly activeTermProduct: bigint;
    private readonly activeFactorValue: bigint;
    private readonly activePendingOperation: CalcAUDPendingOperation;
    private readonly activePendingStrategy: CalcAUDPendingStrategy;

    private readonly accumulatedExpression: string;
    private readonly activeTermProductExpression: string;
    private readonly activeFactorExpression: string;

    private readonly accumulatedVerbal: string;
    private readonly activeTermProductVerbal: string;
    private readonly activeFactorVerbal: string;

    private readonly accumulatedUnicode: string;
    private readonly activeTermProductUnicode: string;
    private readonly activeFactorUnicode: string;

    private readonly _isCompound: boolean;

    private constructor(
        accumulatedValue: bigint,
        activeTermProduct: bigint,
        activeFactorValue: bigint,
        activePendingOperation: CalcAUDPendingOperation,
        activePendingStrategy: CalcAUDPendingStrategy,
        accumulatedExpression: string,
        activeTermProductExpression: string,
        activeFactorExpression: string,
        accumulatedVerbal: string,
        activeTermProductVerbal: string,
        activeFactorVerbal: string,
        accumulatedUnicode: string,
        activeTermProductUnicode: string,
        activeFactorUnicode: string,
        isCompound = false,
    ) {
        this.accumulatedValue = accumulatedValue;
        this.activeTermProduct = activeTermProduct;
        this.activeFactorValue = activeFactorValue;
        this.activePendingOperation = activePendingOperation;
        this.activePendingStrategy = activePendingStrategy;
        this.accumulatedExpression = accumulatedExpression;
        this.activeTermProductExpression = activeTermProductExpression;
        this.activeFactorExpression = activeFactorExpression;
        this.accumulatedVerbal = accumulatedVerbal;
        this.activeTermProductVerbal = activeTermProductVerbal;
        this.activeFactorVerbal = activeFactorVerbal;
        this.accumulatedUnicode = accumulatedUnicode;
        this.activeTermProductUnicode = activeTermProductUnicode;
        this.activeFactorUnicode = activeFactorUnicode;
        this._isCompound = isCompound;
    }

    /**
     * Cria uma nova instância de CalcAUD a partir de um valor suportado.
     *
     * @param value String, Number, BigInt ou outra instância de CalcAUD.
     * @returns Uma nova instância de CalcAUD.
     * @throws CalcAUDError se o tipo for inválido ou o número não for finito.
     *
     * @example
     * ```ts
     * CalcAUD.from(100);           // Via Number
     * CalcAUD.from("150.50");      // Via String Decimal
     * CalcAUD.from("1/3");         // Via String Fração
     * CalcAUD.from(1000n);         // Via BigInt
     * ```
     */
    public static from(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        if (value instanceof CalcAUD) {
            // Evitamos agrupamento redundante se já for uma expressão agrupada
            const isAlreadyGrouped = value.accumulatedExpression === "" &&
                value.activeTermProductExpression === "" &&
                value.activeFactorExpression.startsWith("\\left(");

            if (value._isCompound && !isAlreadyGrouped) {
                return value.group();
            }
            return value;
        }

        try {
            // Validação rigorosa em runtime para garantir integridade dos cálculos
            const isValidType = value !== null
                && value !== undefined
                && (typeof value === "string" || typeof value === "number" || typeof value === "bigint");

            const isInvalidNumber = typeof value === "number" && !Number.isFinite(value);

            if (!isValidType || isInvalidNumber) {
                throw new CalcAUDError({
                    type: "invalid-input-format",
                    title: "Tipo de Dado Inválido",
                    detail: `O tipo '${typeof value}' não é um formato suportado para inicialização.`,
                    operation: "from",
                });
            }

            // Convertemos tudo para a escala interna para evitar erros de float
            const rawValue = typeof value === "bigint"
                ? value * INTERNAL_SCALE_FACTOR
                : parseStringValue(value.toString());

            const initialExpression = value.toString();
            const initialVerbal = initialExpression;
            const initialUnicode = initialExpression;

            const result = new CalcAUD(
                0n,
                INTERNAL_SCALE_FACTOR,
                rawValue,
                undefined,
                initialExpression,
                initialUnicode,
                initialVerbal,
                "MULT",
                "euclidean",
                "",
                "",
                initialExpression,
                "",
                "",
                initialVerbal,
                "",
                "",
                initialUnicode,
                false,
            );

            const end = performance.now();
            Logger.getChild(["input", "from"]).debug("Input initialized {*}", {
                calcTime: end - start,
                value: String(value),
                type: typeof value,
                internalValue: rawValue.toString(),
            });

            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "from", value: value });
            }
            throw e;
        }
    }

    /**
     * Adiciona um valor ao montante atual.
     *
     * @param value Valor a ser somado.
     * @returns Nova instância com o resultado da soma.
     *
     * @example
     * ```ts
     * // Básico
     * CalcAUD.from(10).add(5); // 15
     *
     * // Com decimais
     * CalcAUD.from("10.50").add("0.25"); // 10.75
     *
     * // Encadeado
     * CalcAUD.from(10).add(5).add(2); // 17
     * ```
     */
    public add(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();

            const newAccumulatedValue = this.accumulatedValue + this.getActiveTermValue();

            const result = new CalcAUD(
                newAccumulatedValue,
                INTERNAL_SCALE_FACTOR,
                otherValue,
                undefined,
                wrapLaTeX(other.getFullLaTeXExpression()),
                wrapUnicode(other.getFullUnicodeExpression()),
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                "MULT",
                "euclidean",
                this.getFullLaTeXExpression(),
                "",
                wrapLaTeX(other.getFullLaTeXExpression()),
                this.getFullVerbalExpression(),
                "",
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                this.getFullUnicodeExpression(),
                "",
                wrapUnicode(other.getFullUnicodeExpression()),
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "add"]).debug("Addition performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
                addingValue: otherValue.toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "add", value: value });
            }
            throw e;
        }
    }

    public sub(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();

            const newAccumulatedValue = this.accumulatedValue + this.getActiveTermValue();

            const result = new CalcAUD(
                newAccumulatedValue,
                INTERNAL_SCALE_FACTOR,
                -otherValue,
                undefined,
                `- ${wrapLaTeX(other.getFullLaTeXExpression())}`,
                `- ${wrapUnicode(other.getFullUnicodeExpression())}`,
                `${VERBAL_TOKENS.SUB}${
                    other.accumulatedVerbal
                        ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                        : other.activeFactorVerbal
                }`,
                "MULT",
                "euclidean",
                this.getFullLaTeXExpression(),
                "",
                `- ${wrapLaTeX(other.getFullLaTeXExpression())}`,
                this.getFullVerbalExpression(),
                "",
                `${VERBAL_TOKENS.SUB}${
                    other.accumulatedVerbal
                        ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                        : other.activeFactorVerbal
                }`,
                this.getFullUnicodeExpression(),
                "",
                `- ${wrapUnicode(other.getFullUnicodeExpression())}`,
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "sub"]).debug("Subtraction performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
                subtrahend: otherValue.toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "sub", value: value });
            }
            throw e;
        }
    }

    /**
     * Multiplica o montante atual por um valor.
     *
     * @param value Fator de multiplicação.
     * @returns Nova instância com o resultado do produto.
     *
     * @example
     * ```ts
     * // Básico
     * CalcAUD.from(10).mult(2); // 20
     *
     * // Cálculo de Porcentagem
     * CalcAUD.from(1200).mult("0.05"); // 60
     *
     * // Multiplicação por fração
     * CalcAUD.from(100).mult("1/2"); // 50
     * ```
     */
    public mult(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();

            const nextProduct = this.getActiveTermValue();
            const nextProductExpr = this.getActiveTermLaTeX();
            const nextProductVerbal = this.getActiveTermVerbal();
            const nextProductUnicode = this.getActiveTermUnicode();

            const result = new CalcAUD(
                this.accumulatedValue,
                nextProduct,
                otherValue,
                undefined,
                wrapLaTeX(other.getFullLaTeXExpression()),
                wrapUnicode(other.getFullUnicodeExpression()),
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                "MULT",
                "euclidean",
                this.accumulatedExpression,
                nextProductExpr,
                wrapLaTeX(other.getFullLaTeXExpression()),
                this.accumulatedVerbal,
                nextProductVerbal,
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                this.accumulatedUnicode,
                nextProductUnicode,
                wrapUnicode(other.getFullUnicodeExpression()),
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "mult"]).debug("Multiplication performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
                multiplier: otherValue.toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "mult", value: value });
            }
            throw e;
        }
    }

    public div(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de divisão por zero.",
                    operation: "division",
                    latex: `\\frac{${this.getActiveTermLaTeX()}}{0}`,
                    unicode: `${this.getActiveTermUnicode()} ÷ 0`,
                });
            }

            const nextProduct = this.getActiveTermValue();
            const nextProductExpr = this.getActiveTermLaTeX();
            const nextProductVerbal = this.getActiveTermVerbal();
            const nextProductUnicode = this.getActiveTermUnicode();

            const result = new CalcAUD(
                this.accumulatedValue,
                nextProduct,
                otherValue,
                undefined,
                wrapLaTeX(other.getFullLaTeXExpression()),
                wrapUnicode(other.getFullUnicodeExpression()),
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                "DIV",
                "euclidean",
                this.accumulatedExpression,
                nextProductExpr,
                wrapLaTeX(other.getFullLaTeXExpression()),
                this.accumulatedVerbal,
                nextProductVerbal,
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                this.accumulatedUnicode,
                nextProductUnicode,
                wrapUnicode(other.getFullUnicodeExpression()),
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "div"]).debug("Division performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
                divisor: otherValue.toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "div", value: value });
            }
            throw e;
        }
    }

    /**
     * Realiza a divisão inteira (quociente) entre o montante atual e um valor.
     *
     * @param value Divisor.
     * @param divStrategy Estratégia de divisão: "euclidean" (padrão) ou "truncated".
     * @returns Nova instância com o resultado da divisão inteira.
     *
     * @remarks
     * **ATENÇÃO:** A estratégia de divisão deve ser definida neste momento!
     * Opções passadas posteriormente no método `commit()` NÃO afetarão o cálculo realizado aqui.
     *
     * @example
     * ```ts
     * // Básico (Euclidiana - Padrão)
     * CalcAUD.from(10).divInt(3); // 3
     *
     * // Negativos (Euclidiana vs Truncada)
     * CalcAUD.from(-10).divInt(3); // -4 (Piso)
     * CalcAUD.from(-10).divInt(3, "truncated"); // -3 (Truncado)
     * ```
     */
    public divInt(value: CalcAUDAllowedValue, divStrategy: MathDivModStrategy = "euclidean"): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de divisão inteira por zero.",
                    operation: "divInt",
                    latex: `\\lfloor \\frac{${this.getActiveTermLaTeX()}}{0} \\rfloor`,
                    unicode: `⌊${this.getActiveTermUnicode()} ÷ 0⌋`,
                });
            }

            const nextProduct = this.getActiveTermValue();
            const nextProductExpr = this.getActiveTermLaTeX();
            const nextProductVerbal = this.getActiveTermVerbal();
            const nextProductUnicode = this.getActiveTermUnicode();

            const result = new CalcAUD(
                this.accumulatedValue,
                nextProduct,
                otherValue,
                undefined,
                wrapLaTeX(other.getFullLaTeXExpression()),
                wrapUnicode(other.getFullUnicodeExpression()),
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                "DIV_INT",
                divStrategy,
                this.accumulatedExpression,
                nextProductExpr,
                wrapLaTeX(other.getFullLaTeXExpression()),
                this.accumulatedVerbal,
                nextProductVerbal,
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                this.accumulatedUnicode,
                nextProductUnicode,
                wrapUnicode(other.getFullUnicodeExpression()),
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "divInt"]).debug("Integer division performed {*}", {
                calcTime: end - start,
                strategy: divStrategy,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "divInt", value: String(value), divStrategy });
            }
            throw e;
        }
    }

    public mod(value: CalcAUDAllowedValue, divStrategy: MathDivModStrategy = "euclidean"): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.getActiveTermValue();
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de cálculo de módulo por zero.",
                    operation: "mod",
                    latex: `${this.getActiveTermLaTeX()} \\bmod 0`,
                    unicode: `${this.getActiveTermUnicode()} mod 0`,
                });
            }

            const nextProduct = this.getActiveTermValue();
            const nextProductExpr = this.getActiveTermLaTeX();
            const nextProductVerbal = this.getActiveTermVerbal();
            const nextProductUnicode = this.getActiveTermUnicode();

            const result = new CalcAUD(
                this.accumulatedValue,
                nextProduct,
                otherValue,
                undefined,
                wrapLaTeX(other.getFullLaTeXExpression()),
                wrapUnicode(other.getFullUnicodeExpression()),
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                "MOD",
                divStrategy,
                this.accumulatedExpression,
                nextProductExpr,
                wrapLaTeX(other.getFullLaTeXExpression()),
                this.accumulatedVerbal,
                nextProductVerbal,
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeFactorVerbal,
                this.accumulatedUnicode,
                nextProductUnicode,
                wrapUnicode(other.getFullUnicodeExpression()),
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "mod"]).debug("Modulo performed {*}", {
                calcTime: end - start,
                strategy: divStrategy,
                currentAccumulatedResult: (result.accumulatedValue + result.getActiveTermValue()).toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "mod", value: String(value), divStrategy });
            }
            throw e;
        }
    }

    /**
     * Eleva o montante atual a uma potência ou calcula uma raiz.
     *
     * @param exponent O expoente. Pode ser inteiro (ex: 2), decimal (ex: 0.5) ou fração (ex: "1/2").
     * @returns Nova instância com o resultado da operação.
     *
     * @example
     * ```ts
     * // Potenciação Inteira
     * CalcAUD.from(2).pow(3); // 8
     *
     * // Raiz Quadrada via Decimal
     * CalcAUD.from(9).pow(0.5); // 3
     *
     * // Raiz Cúbica via Fração
     * CalcAUD.from(27).pow("1/3"); // 3
     * ```
     */
    public pow(exponent: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const isFractionString = typeof exponent === "string" && exponent.includes("/");
            const expStr = exponent.toString();

            if (isFractionString) {
                // Validação de Fração (Exigido pelos testes de validação)
                const parts = expStr.split("/");
                if (parts.length !== 2) {
                    throw new CalcAUDError({
                        type: "invalid-fractional-exponent",
                        title: "Expoente Fracionário Inválido",
                        detail: `O expoente '${expStr}' deve conter apenas um numerador e um denominador.`,
                        operation: "pow",
                    });
                }
                try {
                    BigInt(parts[0].trim());
                    BigInt(parts[1].trim());
                } catch {
                    throw new CalcAUDError({
                        type: "invalid-exponent-value",
                        title: "Valor de Expoente Inválido",
                        detail: "Não foi possível converter as partes do expoente para inteiros.",
                        operation: "pow",
                    });
                }
            }

            const other = CalcAUD.from(exponent);
            
            let nextBase: bigint;
            let nextExponent: CalcAUD;
            let nextFactorExpr: string;
            let nextFactorUnicode: string;
            let nextFactorVerbal: string;

            if (!this.activeFactorExponent) {
                // Primeiro nível da potência: base^exp
                nextBase = this.activeFactorBaseValue;
                nextExponent = other;
                
                const isRoot = isFractionString && other.activeFactorExpression.split("/")[0].trim() === "1";
                if (isRoot) {
                    const den = other.activeFactorExpression.split("/")[1].trim();
                    const denSup = toSuperscript(den);
                    nextFactorExpr = `\\sqrt[${den}]{${this.activeFactorRawBaseExpression}}`;
                    nextFactorUnicode = `${denSup === "²" ? "" : denSup}√(${this.activeFactorRawBaseUnicode})`;
                    nextFactorVerbal = `${VERBAL_TOKENS.ROOT_IDX}${den}${VERBAL_TOKENS.ROOT_OF}${this.activeFactorRawBaseVerbal}`;
                } else {
                    nextFactorExpr = `{${this.activeFactorRawBaseExpression}}^{${other.getFullLaTeXExpression()}}`;
                    nextFactorUnicode = `${wrapUnicode(this.activeFactorRawBaseUnicode)}${toSuperscript(other.getFullUnicodeExpression())}`;
                    nextFactorVerbal = `${this.activeFactorRawBaseVerbal}${VERBAL_TOKENS.POW}${other.getFullVerbalExpression()}`;
                }
            } else {
                // Torres de Potência (Associatividade à Direita)
                nextBase = this.activeFactorBaseValue;
                nextExponent = this.activeFactorExponent.pow(other);
                
                nextFactorExpr = `{${this.activeFactorRawBaseExpression}}^{${nextExponent.getFullLaTeXExpression()}}`;
                nextFactorUnicode = `${wrapUnicode(this.activeFactorRawBaseUnicode)}${toSuperscript("(" + nextExponent.getFullUnicodeExpression() + ")")}`;
                nextFactorVerbal = `${this.activeFactorRawBaseVerbal}${VERBAL_TOKENS.POW}${VERBAL_TOKENS.GRP_START}${nextExponent.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`;
            }

            const result = new CalcAUD(
                this.accumulatedValue,
                this.activeTermProduct,
                nextBase,
                nextExponent,
                this.activeFactorRawBaseExpression,
                this.activeFactorRawBaseUnicode,
                this.activeFactorRawBaseVerbal,
                this.activePendingOperation,
                this.activePendingStrategy,
                this.accumulatedExpression,
                this.activeTermProductExpression,
                nextFactorExpr,
                this.accumulatedVerbal,
                this.activeTermProductVerbal,
                nextFactorVerbal,
                this.accumulatedUnicode,
                this.activeTermProductUnicode,
                nextFactorUnicode,
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "pow"]).debug("Power operation performed {*}", {
                calcTime: end - start,
                exponent: expStr,
                isTower: !!this.activeFactorExponent,
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "pow", exponent });
            }
            throw e;
        }
    }

    /**
     * Agrupa a expressão atual em parênteses para definir precedência léxica.
     *
     * @returns Nova instância com a expressão agrupada.
     *
     * @example
     * ```ts
     * // Sem agrupamento (auditoria linear)
     * CalcAUD.from(10).add(5).mult(2); // "10 + 5 * 2" (em LaTeX)
     *
     * // Com agrupamento (auditoria protegida)
     * CalcAUD.from(10).add(5).group().mult(2); // "(10 + 5) * 2"
     * ```
     */
    public group(): CalcAUD {
        const start = performance.now();
        try {
            const totalValue = this.accumulatedValue + this.getActiveTermValue();
            const groupedExpr = `\\left( ${this.getFullLaTeXExpression()} \\right)`;
            const groupedVerbal = `${VERBAL_TOKENS.GRP_START}${this.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`;
            const groupedUnicode = `(${this.getFullUnicodeExpression()})`;
            const result = new CalcAUD(
                0n,
                INTERNAL_SCALE_FACTOR,
                totalValue,
                undefined,
                groupedExpr,
                groupedUnicode,
                groupedVerbal,
                "MULT",
                "euclidean",
                "",
                "",
                groupedExpr,
                "",
                "",
                groupedVerbal,
                "",
                "",
                groupedUnicode,
                true,
            );
            const end = performance.now();
            Logger.getChild(["engine", "group"]).debug("Grouping performed {*}", {
                calcTime: end - start,
                totalValue: totalValue.toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "group" });
            }
            throw e;
        }
    }

    /**
     * Finaliza o cálculo e retorna um objeto de saída (CalcAUDOutput) para formatação.
     *
     * @param decimals Precisão decimal desejada para o output (padrão: 6).
     * @param options Opções de formatação, locale e arredondamento.
     * @returns Objeto de saída formatável.
     * @throws CalcAUDError se a precisão for negativa ou inválida.
     *
     * @example
     * ```ts
     * // Saída Monetária Brasileira
     * const out = CalcAUD.from(10.5).commit(2);
     * console.log(out.toMonetary()); // "R$ 10,50"
     *
     * // Saída com arredondamento bancário
     * const out = CalcAUD.from("1.255").commit(2, { roundingMethod: "HALF-EVEN" });
     * console.log(out.toString()); // "1.26"
     * ```
     */
    public commit(
        decimals: number = DEFAULT_DISPLAY_PRECISION,
        options?: CalcAUDOutputOptions,
    ): CalcAUDOutput {
        const start = performance.now();
        if (decimals < 0 || !Number.isInteger(decimals)) {
            throw new CalcAUDError({
                type: "invalid-precision",
                title: "Precisão Decimal Inválida",
                detail: `O número de casas decimais deve ser um inteiro positivo. Recebido: ${decimals}`,
                operation: "commit",
            });
        }
        try {
            const finalValue = this.accumulatedValue + this.getActiveTermValue();
            const result = new CalcAUDOutput(
                finalValue,
                decimals,
                this.getFullLaTeXExpression(),
                this.getFullVerbalExpression(),
                this.getFullUnicodeExpression(),
                options,
            );
            const end = performance.now();
            Logger.getChild(["engine", "commit"]).debug("Commit performed {*}", {
                calcTime: end - start,
                finalValue: finalValue.toString(),
                decimals,
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "commit", decimals, options });
            }
            throw e;
        }
    }

    private getFullLaTeXExpression(): string {
        let expr = this.accumulatedExpression;
        const active = this.getActiveTermLaTeX();
        if (this.accumulatedExpression && active) {
            expr += active.startsWith("-") ? " " : " + ";
        }
        expr += active;
        return expr;
    }

    private getFullVerbalExpression(): string {
        let verbal = this.accumulatedVerbal;
        const active = this.getActiveTermVerbal();
        if (this.accumulatedVerbal && active) {
            verbal += active.startsWith(VERBAL_TOKENS.SUB) ? " " : VERBAL_TOKENS.ADD;
        }
        verbal += active;
        return verbal;
    }

    private getFullUnicodeExpression(): string {
        let unicode = this.accumulatedUnicode;
        const active = this.getActiveTermUnicode();
        if (this.accumulatedUnicode && active) {
            unicode += active.startsWith("-") ? " " : " + ";
        }
        unicode += active;
        return unicode;
    }

    private getActiveFactorValue(): bigint {
        if (!this.activeFactorExponent) {
            return this.activeFactorBaseValue;
        }

        const expAUD = this.activeFactorExponent;
        
        // Detecção de Fração Simples (para raízes)
        const isFractionStr = expAUD.accumulatedExpression === "" &&
            expAUD.activeFactorExpression.includes("/") &&
            !expAUD.activeFactorExponent;

        if (isFractionStr) {
            const parts = expAUD.activeFactorExpression.split("/");
            try {
                const num = BigInt(parts[0].trim());
                const den = BigInt(parts[1].trim());
                return calculateFractionalPower(this.activeFactorBaseValue, num, den, INTERNAL_SCALE_FACTOR);
            } catch (e) {
                // Se for um CalcAUDError (ex: raiz par de negativo), relança
                if (e instanceof CalcAUDError) throw e;
                // Se falhar o parse do BigInt, segue para o cálculo normal via valor consolidado
            }
        }

        const expValue = expAUD.accumulatedValue + expAUD.getActiveTermValue();
        const exp = expValue / INTERNAL_SCALE_FACTOR;

        if (exp === 0n) return INTERNAL_SCALE_FACTOR;
        if (exp > 0n) {
            return calculateBigIntPower(this.activeFactorBaseValue, exp) /
                calculateBigIntPower(INTERNAL_SCALE_FACTOR, exp - 1n);
        } else {
            // Potência negativa: 1 / (base^-exp)
            if (this.activeFactorBaseValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Base zero com expoente negativo resulta em divisão por zero.",
                    operation: "pow",
                });
            }
            const denVal = calculateBigIntPower(this.activeFactorBaseValue, -exp) /
                calculateBigIntPower(INTERNAL_SCALE_FACTOR, (-exp) - 1n);
            if (denVal === 0n) return 0n;
            return (INTERNAL_SCALE_FACTOR * INTERNAL_SCALE_FACTOR) / denVal;
        }
    }

    private getActiveTermValue(): bigint {
        const factorValue = this.getActiveFactorValue();
        if (factorValue === 0n && this.activePendingOperation !== "MULT") {
            // Divisão por zero deve ser evitada pelo chamador ou lançar erro antes.
            return 0n;
        }

        switch (this.activePendingOperation) {
            case "DIV": {
                const numerator = this.activeTermProduct * INTERNAL_SCALE_FACTOR;
                const halfDenominator = factorValue / 2n;
                const adjustment = (this.activeTermProduct < 0n) === (factorValue < 0n)
                    ? halfDenominator
                    : -halfDenominator;
                return (numerator + adjustment) / factorValue;
            }
            case "DIV_INT": {
                const termValue = this.activeTermProduct;
                const divisor = factorValue;
                const res = termValue / divisor;
                let quotient = res / INTERNAL_SCALE_FACTOR;

                if (this.activePendingStrategy === "euclidean") {
                    const remainder = termValue % divisor;
                    if (remainder !== 0n && ((this.activeTermProduct < 0n) !== (factorValue < 0n))) {
                        quotient -= 1n;
                    }
                }
                return quotient * INTERNAL_SCALE_FACTOR;
            }
            case "MOD": {
                const termValue = this.activeTermProduct;
                const divisor = factorValue;
                const rawMod = termValue % divisor;

                if (this.activePendingStrategy === "euclidean") {
                    const absDivisor = divisor < 0n ? -divisor : divisor;
                    return ((rawMod % absDivisor) + absDivisor) % absDivisor;
                }
                return rawMod;
            }
            case "MULT":
            default: {
                const product = this.activeTermProduct * factorValue;
                const halfScale = INTERNAL_SCALE_FACTOR / 2n;
                const adjustment = product >= 0n ? halfScale : -halfScale;
                return (product + adjustment) / INTERNAL_SCALE_FACTOR;
            }
        }
    }

    private getActiveTermLaTeX(): string {
        const num = this.activeTermProductExpression || "1";
        switch (this.activePendingOperation) {
            case "DIV":
                return `\\frac{${num}}{${this.activeFactorExpression}}`;
            case "DIV_INT":
                if (this.activePendingStrategy === "euclidean") {
                    return `\\lfloor \\frac{${num}}{${this.activeFactorExpression}} \\rfloor`;
                }
                return `\\operatorname{trunc}\\left(\\frac{${num}}{${this.activeFactorExpression}}\\right)`;
            case "MOD":
                if (this.activePendingStrategy === "euclidean") {
                    return `${num} \\bmod ${this.activeFactorExpression}`;
                }
                return `${num} \\text{ rem } ${this.activeFactorExpression}`;
            case "MULT":
            default:
                if (this.activeTermProductExpression) {
                    return `${this.activeTermProductExpression} \\times ${this.activeFactorExpression}`;
                }
                return this.activeFactorExpression;
        }
    }

    private getActiveTermUnicode(): string {
        const num = this.activeTermProductUnicode || "1";
        switch (this.activePendingOperation) {
            case "DIV":
                return `${wrapUnicode(num)} ÷ ${wrapUnicode(this.activeFactorUnicode)}`;
            case "DIV_INT":
                if (this.activePendingStrategy === "euclidean") {
                    return `⌊${wrapUnicode(num)} ÷ ${wrapUnicode(this.activeFactorUnicode)}⌋`;
                }
                return `trun(${wrapUnicode(num)} ÷ ${wrapUnicode(this.activeFactorUnicode)})`;
            case "MOD":
                if (this.activePendingStrategy === "euclidean") {
                    return `${wrapUnicode(num)} mod ${wrapUnicode(this.activeFactorUnicode)}`;
                }
                return `${wrapUnicode(num)} % ${wrapUnicode(this.activeFactorUnicode)}`;
            case "MULT":
            default:
                if (this.activeTermProductUnicode) {
                    return `${this.activeTermProductUnicode} × ${wrapUnicode(this.activeFactorUnicode)}`;
                }
                return this.activeFactorUnicode;
        }
    }

    private getActiveTermVerbal(): string {
        const num = this.activeTermProductVerbal || "1";
        switch (this.activePendingOperation) {
            case "DIV":
                return `${num}${VERBAL_TOKENS.DIV}${this.activeFactorVerbal}`;
            case "DIV_INT":
                if (this.activePendingStrategy === "euclidean") {
                    return `${num}${VERBAL_TOKENS.DIV_INT_E_MID}${this.activeFactorVerbal}${VERBAL_TOKENS.DIV_INT_E_SUF}`;
                }
                return `${num}${VERBAL_TOKENS.DIV_INT_T_MID}${this.activeFactorVerbal}${VERBAL_TOKENS.DIV_INT_T_SUF}`;
            case "MOD":
                if (this.activePendingStrategy === "euclidean") {
                    return `${VERBAL_TOKENS.MOD_E_PRE}${num}${VERBAL_TOKENS.MOD_E_MID}${this.activeFactorVerbal}${VERBAL_TOKENS.MOD_E_SUF}`;
                }
                return `${VERBAL_TOKENS.MOD_T_PRE}${num}${VERBAL_TOKENS.MOD_T_MID}${this.activeFactorVerbal}${VERBAL_TOKENS.MOD_T_SUF}`;
            case "MULT":
            default:
                if (this.activeTermProductVerbal) {
                    return `${this.activeTermProductVerbal}${VERBAL_TOKENS.MULT}${this.activeFactorVerbal}`;
                }
                return this.activeFactorVerbal;
        }
    }
}
