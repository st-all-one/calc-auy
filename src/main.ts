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
export class CalcAUD {
    private readonly accumulatedValue: bigint;
    private readonly activeTermValue: bigint;
    private readonly accumulatedExpression: string;
    private readonly activeTermExpression: string;
    private readonly accumulatedVerbal: string;
    private readonly activeTermVerbal: string;
    private readonly accumulatedUnicode: string;
    private readonly activeTermUnicode: string;

    private constructor(
        accumulatedValue: bigint,
        activeTermValue: bigint,
        accumulatedExpression: string,
        activeTermExpression: string,
        accumulatedVerbal: string,
        activeTermVerbal: string,
        accumulatedUnicode: string,
        activeTermUnicode: string,
    ) {
        this.accumulatedValue = accumulatedValue;
        this.activeTermValue = activeTermValue;
        this.accumulatedExpression = accumulatedExpression;
        this.activeTermExpression = activeTermExpression;
        this.accumulatedVerbal = accumulatedVerbal;
        this.activeTermVerbal = activeTermVerbal;
        this.accumulatedUnicode = accumulatedUnicode;
        this.activeTermUnicode = activeTermUnicode;
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
        if (value instanceof CalcAUD) { return value; }

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

            // Convertemos tudo para a escala interna de 10^12 para evitar erros de float
            const rawValue = typeof value === "bigint"
                ? value * INTERNAL_SCALE_FACTOR
                : parseStringValue(value.toString());
            const initialExpression = value.toString();
            const initialVerbal = initialExpression;
            const initialUnicode = initialExpression;

            const result = new CalcAUD(
                0n,
                rawValue,
                "",
                initialExpression,
                "",
                initialVerbal,
                "",
                initialUnicode,
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
            const otherValue = other.accumulatedValue + other.activeTermValue;
            const newAccumulatedValue = this.accumulatedValue + this.activeTermValue;

            // Mantemos a imutabilidade criando novos registros léxicos para o total
            const nextActiveExpr = wrapLaTeX(other.getFullLaTeXExpression());
            const nextActiveUnicode = wrapUnicode(other.getFullUnicodeExpression());
            const nextActiveVerbal = other.accumulatedVerbal
                ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                : other.activeTermVerbal;

            const result = new CalcAUD(
                newAccumulatedValue,
                otherValue,
                this.getFullLaTeXExpression(),
                nextActiveExpr,
                this.getFullVerbalExpression(),
                nextActiveVerbal,
                this.getFullUnicodeExpression(),
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "add"]).debug("Addition performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
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

    /**
     * Subtrai um valor do montante atual.
     *
     * @param value Valor a ser subtraído.
     * @returns Nova instância com o resultado da subtração.
     *
     * @example
     * ```ts
     * // Básico
     * CalcAUD.from(10).sub(3); // 7
     *
     * // Com valores negativos
     * CalcAUD.from(10).sub(-5); // 15
     *
     * // Encadeado com expressões complexas
     * CalcAUD.from("100").sub(CalcAUD.from(20).add(30)); // 50
     * ```
     */
    public sub(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.activeTermValue;
            const newAccumulatedValue = this.accumulatedValue + this.activeTermValue;

            const nextActiveExpr = `- ${wrapLaTeX(other.getFullLaTeXExpression())}`;
            const nextActiveUnicode = `- ${wrapUnicode(other.getFullUnicodeExpression())}`;
            const nextActiveVerbal = `${VERBAL_TOKENS.SUB}${
                other.accumulatedVerbal
                    ? `${VERBAL_TOKENS.GRP_START}${other.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`
                    : other.activeTermVerbal
            }`;

            const result = new CalcAUD(
                newAccumulatedValue,
                -otherValue,
                this.getFullLaTeXExpression(),
                nextActiveExpr,
                this.getFullVerbalExpression(),
                nextActiveVerbal,
                this.getFullUnicodeExpression(),
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "sub"]).debug("Subtraction performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
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
            const otherValue = other.accumulatedValue + other.activeTermValue;
            const product = this.activeTermValue * otherValue;

            // Arredondamento na 12ª casa interna para evitar propagação de resíduos infinitesimais
            const halfScale = INTERNAL_SCALE_FACTOR / 2n;
            const adjustment = product >= 0n ? halfScale : -halfScale;
            const nextActiveValue = (product + adjustment) / INTERNAL_SCALE_FACTOR;

            const nextActiveExpr = `${wrapLaTeX(this.activeTermExpression)} \\times ${
                wrapLaTeX(other.getFullLaTeXExpression())
            }`;
            const nextActiveVerbal = `${this.activeTermVerbal}${VERBAL_TOKENS.MULT}${other.getFullVerbalExpression()}`;
            const nextActiveUnicode = `${wrapUnicode(this.activeTermUnicode)} × ${
                wrapUnicode(other.getFullUnicodeExpression())
            }`;

            const result = new CalcAUD(
                this.accumulatedValue,
                nextActiveValue,
                this.accumulatedExpression,
                nextActiveExpr,
                this.accumulatedVerbal,
                nextActiveVerbal,
                this.accumulatedUnicode,
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "mult"]).debug("Multiplication performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
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

    /**
     * Divide o montante atual por um valor.
     *
     * @param value Divisor.
     * @returns Nova instância com o quociente calculado.
     * @throws CalcAUDError se o divisor for zero.
     *
     * @example
     * ```ts
     * // Básico
     * CalcAUD.from(10).div(2); // 5
     *
     * // Divisão com dízima
     * CalcAUD.from(10).div(3).commit(2); // "3.33"
     *
     * // Divisão de montantes complexos
     * CalcAUD.from(100).div(CalcAUD.from(2).add(3)); // 20
     * ```
     */
    public div(value: CalcAUDAllowedValue): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.activeTermValue;
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de divisão por zero.",
                    operation: "division",
                    latex: `\\frac{${this.activeTermExpression}}{0}`,
                    unicode: `${this.activeTermUnicode} ÷ 0`,
                });
            }
            const numerator = this.activeTermValue * INTERNAL_SCALE_FACTOR;

            // Arredondamento Half-Up na 12ª casa decimal interna para precisão absoluta
            const halfDenominator = otherValue / 2n;
            const adjustment = (this.activeTermValue < 0n) === (otherValue < 0n) ? halfDenominator : -halfDenominator;

            const nextActiveValue = (numerator + adjustment) / otherValue;

            const nextActiveExpr = `\\frac{${this.activeTermExpression}}{${other.getFullLaTeXExpression()}}`;
            const nextActiveVerbal = `${this.activeTermVerbal}${VERBAL_TOKENS.DIV}${other.getFullVerbalExpression()}`;
            const nextActiveUnicode = `${wrapUnicode(this.activeTermUnicode)} ÷ ${
                wrapUnicode(other.getFullUnicodeExpression())
            }`;

            const result = new CalcAUD(
                this.accumulatedValue,
                nextActiveValue,
                this.accumulatedExpression,
                nextActiveExpr,
                this.accumulatedVerbal,
                nextActiveVerbal,
                this.accumulatedUnicode,
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "div"]).debug("Division performed {*}", {
                calcTime: end - start,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
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
            const otherValue = other.accumulatedValue + other.activeTermValue;
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de divisão inteira por zero.",
                    operation: "divInt",
                    latex: `\\lfloor \\frac{${this.activeTermExpression}}{0} \\rfloor`,
                    unicode: `⌊${this.activeTermUnicode} ÷ 0⌋`,
                });
            }

            let quotient: bigint;
            let nextActiveExpr: string;
            let nextActiveUnicode: string;
            let nextActiveVerbal: string;

            if (divStrategy === "euclidean") {
                // Lógica Euclidiana: O quociente é o piso (floor) da divisão real
                quotient = this.activeTermValue / otherValue;
                const remainder = this.activeTermValue % otherValue;

                if (remainder !== 0n && ((this.activeTermValue < 0n) !== (otherValue < 0n))) {
                    quotient -= 1n;
                }
                nextActiveExpr =
                    `\\lfloor \\frac{${this.activeTermExpression}}{${other.getFullLaTeXExpression()}} \\rfloor`;
                nextActiveUnicode = `⌊${this.activeTermUnicode} ÷ ${other.getFullUnicodeExpression()}⌋`;
                nextActiveVerbal =
                    `${this.activeTermVerbal}${VERBAL_TOKENS.DIV_INT_E_MID}${other.getFullVerbalExpression()}${VERBAL_TOKENS.DIV_INT_E_SUF}`;
            } else {
                // Lógica Truncada: Descarta a parte fracionária (padrão C/Java/JS)
                quotient = this.activeTermValue / otherValue;
                nextActiveExpr =
                    `\\operatorname{trunc}\\left(\\frac{${this.activeTermExpression}}{${other.getFullLaTeXExpression()}}\\right)`;
                nextActiveUnicode = `trun(${this.activeTermUnicode} ÷ ${other.getFullUnicodeExpression()})`;
                nextActiveVerbal =
                    `${this.activeTermVerbal}${VERBAL_TOKENS.DIV_INT_T_MID}${other.getFullVerbalExpression()}${VERBAL_TOKENS.DIV_INT_T_SUF}`;
            }

            const nextActiveValue = quotient * INTERNAL_SCALE_FACTOR;

            const result = new CalcAUD(
                this.accumulatedValue,
                nextActiveValue,
                this.accumulatedExpression,
                nextActiveExpr,
                this.accumulatedVerbal,
                nextActiveVerbal,
                this.accumulatedUnicode,
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "divInt"]).debug("Integer division performed {*}", {
                calcTime: end - start,
                strategy: divStrategy,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
            });
            return result;
        } catch (e) {
            if (!(e instanceof CalcAUDError)) {
                logFatal(e, { operation: "divInt", value: String(value), divStrategy });
            }
            throw e;
        }
    }

    /**
     * Calcula o módulo (resto da divisão) entre o montante atual e um valor.
     *
     * @param value Divisor.
     * @param divStrategy Estratégia de divisão: "euclidean" (padrão) ou "truncated".
     * @returns Nova instância com o resultado do módulo.
     *
     * @remarks
     * **ATENÇÃO:** A estratégia de divisão deve ser definida neste momento!
     * Opções passadas posteriormente no método `commit()` NÃO afetarão o cálculo realizado aqui.
     *
     * @example
     * ```ts
     * // Básico (Euclidiana)
     * CalcAUD.from(10).mod(3); // 1
     *
     * // Diferença de Estratégia com Negativos
     * CalcAUD.from(-10).mod(3); // 2 (Euclidiano: resto sempre positivo)
     * CalcAUD.from(-10).mod(3, "truncated"); // -1 (Truncado: segue o sinal do dividendo)
     * ```
     */
    public mod(value: CalcAUDAllowedValue, divStrategy: MathDivModStrategy = "euclidean"): CalcAUD {
        const start = performance.now();
        try {
            const other = CalcAUD.from(value);
            const otherValue = other.accumulatedValue + other.activeTermValue;
            if (otherValue === 0n) {
                throw new CalcAUDError({
                    type: "division-by-zero",
                    title: "Operação Matemática Inválida",
                    detail: "Tentativa de cálculo de módulo por zero.",
                    operation: "mod",
                    latex: `${this.activeTermExpression} \\bmod 0`,
                    unicode: `${this.activeTermUnicode} mod 0`,
                });
            }

            let nextActiveValue: bigint;
            let nextActiveExpr: string;
            let nextActiveUnicode: string;
            let nextActiveVerbal: string;

            if (divStrategy === "euclidean") {
                // Módulo Euclidiano garante que o resto seja sempre positivo: ((a % n) + n) % n
                const rawMod = this.activeTermValue % otherValue;
                const absDivisor = otherValue < 0n ? -otherValue : otherValue;
                nextActiveValue = ((rawMod % absDivisor) + absDivisor) % absDivisor;

                nextActiveExpr = `${this.activeTermExpression} \\bmod ${other.getFullLaTeXExpression()}`;
                nextActiveUnicode = `${this.activeTermUnicode} mod ${other.getFullUnicodeExpression()}`;
                nextActiveVerbal =
                    `${VERBAL_TOKENS.MOD_E_PRE}${this.activeTermVerbal}${VERBAL_TOKENS.MOD_E_MID}${other.getFullVerbalExpression()}${VERBAL_TOKENS.MOD_E_SUF}`;
            } else {
                // Resto Truncado segue a implementação nativa da maioria das linguagens
                nextActiveValue = this.activeTermValue % otherValue;

                nextActiveExpr = `${this.activeTermExpression} \\text{ rem } ${other.getFullLaTeXExpression()}`;
                nextActiveUnicode = `${this.activeTermUnicode} % ${other.getFullUnicodeExpression()}`;
                nextActiveVerbal =
                    `${VERBAL_TOKENS.MOD_T_PRE}${this.activeTermVerbal}${VERBAL_TOKENS.MOD_T_MID}${other.getFullVerbalExpression()}${VERBAL_TOKENS.MOD_T_SUF}`;
            }

            const result = new CalcAUD(
                this.accumulatedValue,
                nextActiveValue,
                this.accumulatedExpression,
                nextActiveExpr,
                this.accumulatedVerbal,
                nextActiveVerbal,
                this.accumulatedUnicode,
                nextActiveUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "mod"]).debug("Modulo performed {*}", {
                calcTime: end - start,
                strategy: divStrategy,
                currentAccumulatedResult: (result.accumulatedValue + result.activeTermValue).toString(),
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
    public pow(exponent: string | number): CalcAUD {
        const start = performance.now();
        try {
            const baseValue = this.activeTermValue;
            const baseExpr = wrapLaTeX(this.activeTermExpression);
            const baseVerbal = this.activeTermVerbal;
            const baseUnicode = wrapUnicode(this.activeTermUnicode);

            let nextExpr: string;
            let nextVerbal: string;
            let nextUnicode: string;
            let nextValue: bigint;

            const expStr = exponent.toString();
            if (expStr.includes("/")) {
                // Lógica para potências fracionárias (raízes n-ésimas)
                const parts = expStr.split("/");

                if (parts.length !== 2) {
                    throw new CalcAUDError({
                        type: "invalid-fractional-exponent",
                        title: "Expoente Fracionário Inválido",
                        detail: `O expoente '${expStr}' deve conter apenas um numerador e um denominador.`,
                        operation: "pow",
                    });
                }

                let num: bigint;
                let den: bigint;
                try {
                    num = BigInt(parts[0].trim());
                    den = BigInt(parts[1].trim());
                } catch {
                    throw new CalcAUDError({
                        type: "invalid-exponent-value",
                        title: "Valor de Expoente Inválido",
                        detail: "Não foi possível converter as partes do expoente para inteiros.",
                        operation: "pow",
                    });
                }
                nextValue = calculateFractionalPower(baseValue, num, den, INTERNAL_SCALE_FACTOR);

                const denSup = toSuperscript(den.toString());
                const numSup = num === 1n ? "" : toSuperscript(num.toString());

                nextExpr = num === 1n ? `\\sqrt[${den}]{${baseExpr}}` : `\\sqrt[${den}]{${baseExpr}^{${num}}}`;
                nextVerbal = `${VERBAL_TOKENS.ROOT_IDX}${den}${VERBAL_TOKENS.ROOT_OF}${baseVerbal}${
                    num === 1n ? "" : VERBAL_TOKENS.POW + num
                }`;
                nextUnicode = `${denSup === "²" ? "" : denSup}√(${baseUnicode}${numSup})`;
            } else {
                // Lógica para potências inteiras ou decimais simples
                const exp = BigInt(expStr);
                const expSup = toSuperscript(expStr);

                nextExpr = `{${baseExpr}}^{${expStr}}`;
                nextVerbal = `${baseVerbal}${VERBAL_TOKENS.POW}${expStr}`;
                nextUnicode = `${baseUnicode}${expSup}`;

                if (exp === 0n) { nextValue = INTERNAL_SCALE_FACTOR; }
                else if (exp > 0n) {
                    nextValue = calculateBigIntPower(baseValue, exp)
                        / calculateBigIntPower(INTERNAL_SCALE_FACTOR, exp - 1n);
                } else {
                    const denVal = calculateBigIntPower(baseValue, -exp)
                        / calculateBigIntPower(INTERNAL_SCALE_FACTOR, (-exp) - 1n);
                    nextValue = (INTERNAL_SCALE_FACTOR * INTERNAL_SCALE_FACTOR) / denVal;
                }
            }
            const result = new CalcAUD(
                this.accumulatedValue,
                nextValue,
                this.accumulatedExpression,
                nextExpr,
                this.accumulatedVerbal,
                nextVerbal,
                this.accumulatedUnicode,
                nextUnicode,
            );
            const end = performance.now();
            Logger.getChild(["engine", "pow"]).debug("Power/Root operation performed {*}", {
                calcTime: end - start,
                exponent: expStr,
                result: result.activeTermValue.toString(),
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
            const totalValue = this.accumulatedValue + this.activeTermValue;
            const groupedExpr = `\\left( ${this.getFullLaTeXExpression()} \\right)`;
            const groupedVerbal = `${VERBAL_TOKENS.GRP_START}${this.getFullVerbalExpression()}${VERBAL_TOKENS.GRP_END}`;
            const groupedUnicode = `(${this.getFullUnicodeExpression()})`;
            const result = new CalcAUD(0n, totalValue, "", groupedExpr, "", groupedVerbal, "", groupedUnicode);
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
            const finalValue = this.accumulatedValue + this.activeTermValue;
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
        if (this.accumulatedExpression && this.activeTermExpression) {
            expr += this.activeTermExpression.startsWith("-") ? " " : " + ";
        }
        expr += this.activeTermExpression;
        return expr;
    }

    private getFullVerbalExpression(): string {
        let verbal = this.accumulatedVerbal;
        if (this.accumulatedVerbal && this.activeTermVerbal) {
            verbal += this.activeTermVerbal.startsWith(VERBAL_TOKENS.SUB) ? " " : VERBAL_TOKENS.ADD;
        }
        verbal += this.activeTermVerbal;
        return verbal;
    }

    private getFullUnicodeExpression(): string {
        let unicode = this.accumulatedUnicode;
        if (this.accumulatedUnicode && this.activeTermUnicode) {
            unicode += this.activeTermUnicode.startsWith("-") ? " " : " + ";
        }
        unicode += this.activeTermUnicode;
        return unicode;
    }
}
