/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalculationNode } from "./ast/types.ts";
import type { RationalNumber } from "./core/rational.ts";
import {
    DEFAULT_DECIMAL_PRECISION,
    KATEX_CSS_MINIFIED,
    ROUNDING_IDS,
    type RoundingStrategy,
} from "./core/constants.ts";
import { applyRounding } from "./rounding/rounding.ts";
import { type CalcAUYLocaleA11y, getLocale } from "./i18n/i18n.ts";
import { CalcAUYError } from "./core/errors.ts";
import { toSubscript } from "./utils/unicode.ts";
import { renderAST } from "./output_internal/renderer.ts";
import { performSlice, performSliceByRatio } from "./output_internal/slicer.ts";
import { generateSVG } from "./output_internal/image_utils.ts";
import type { IKatex, OutputOptions } from "./core/types.ts";
import { getSubLogger, startSpan } from "./utils/logger.ts";
import type { InstanceConfig } from "./core/types.ts";

const logger = getSubLogger("output");

/**
 * Assinatura para processadores de saída customizados.
 *
 * Permite estender a CalcAUYLogic com novos formatos (XML, CSV, Protobuf, etc)
 * sem modificar o core da biblioteca.
 *
 * @typeParam Toutput - O tipo de retorno esperado pelo processador.
 */
export type ICalcAUYCustomOutput<Toutput> = (
    this: CalcAUYOutput,
    context: ICalcAUYCustomOutputContext,
) => Toutput;

/**
 * Contexto de dados fornecido aos processadores customizados.
 *
 * **Engenharia:** Fornece acesso direto à AST e ao RationalNumber (n/d),
 * além de referências pré-bound para todos os métodos de exportação padrão.
 */
export interface ICalcAUYCustomOutputContext {
    /** O valor final consolidado em forma racional absoluta. */
    result: RationalNumber;
    /** A árvore de sintaxe completa para reconstrução customizada. */
    ast: CalculationNode;
    /** A estratégia de arredondamento aplicada no commit. */
    roundStrategy: RoundingStrategy;
    /** Rastros auditáveis pré-gerados. */
    audit: {
        latex: string;
        unicode: string;
        verbal: string;
    };
    /** Opções de saída ativas. */
    options: Readonly<OutputOptions>;
    /** Referências prontas para uso dos métodos de exportação da classe. */
    methods: Pick<
        CalcAUYOutput,
        | "toStringNumber"
        | "toFloatNumber"
        | "toScaledBigInt"
        | "toRawInternalNumber"
        | "toASTObject"
        | "toMonetary"
        | "toLaTeX"
        | "toUnicode"
        | "toHTML"
        | "toImageBuffer"
        | "toVerbalA11y"
        | "toSlice"
        | "toSliceByRatio"
        | "toAuditTrace"
        | "toJSON"
    >;
}

/**
 * Chaves de saída suportadas pelo método toJSON.
 */
export type OutputKey =
    | "toStringNumber"
    | "toFloatNumber"
    | "toScaledBigInt"
    | "toRawInternalNumber"
    | "toMonetary"
    | "toLaTeX"
    | "toUnicode"
    | "toHTML"
    | "toImageBuffer"
    | "toVerbalA11y"
    | "toSlice"
    | "toSliceByRatio"
    | "toAuditTrace";

/**
 * Chaves que obrigatoriamente exigem a instância do KaTeX.
 */
type KatexDependentKey = "toHTML" | "toImageBuffer";

/**
 * CalcAUYOutput - Container imutável para resultados de cálculo e múltiplos formatos de exportação.
 *
 * Esta classe é gerada pelo método `CalcAUYLogic.commit()`. Ela encapsula o resultado final
 * (como um `RationalNumber`) e a AST original, permitindo que o desenvolvedor extraia
 * a informação no formato mais adequado para cada canal (UI, Relatórios, Logs, A11y).
 *
 * @class
 */
export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #roundStrategy: RoundingStrategy;
    readonly #signature: string;
    readonly #config: Required<InstanceConfig>;
    readonly #cache: Map<number, RationalNumber> = new Map<number, RationalNumber>();
    readonly #outputCache: Map<string, string | Uint8Array> = new Map();
    #cachedASTObject: Record<string, unknown> | null = null;
    #cachedMethods: ICalcAUYCustomOutputContext["methods"] | null = null;
    #cachedResultJSON: { n: string; d: string } | null = null;

    static #cachedKaTeXCSS: string | null = null;
    static readonly #formatterCache = new Map<string, Intl.NumberFormat>();
    static readonly #encoder = new TextEncoder();

    public constructor(
        result: RationalNumber,
        ast: CalculationNode,
        roundStrategy: RoundingStrategy,
        signature: string,
        config: Required<InstanceConfig>,
    ) {
        this.#result = result;
        this.#ast = ast;
        this.#roundStrategy = roundStrategy;
        this.#signature = signature;
        this.#config = config;
    }

    private getRounded(precision: number): RationalNumber {
        if (!this.#cache.has(precision)) {
            const rounded: RationalNumber = applyRounding(this.#result, this.#roundStrategy, precision);
            this.#cache.set(precision, rounded);
        }
        // deno-lint-ignore no-non-null-assertion
        return this.#cache.get(precision)!;
    }

    private getEffectivePrecision(options?: OutputOptions): number {
        if (options?.decimalPrecision !== undefined) { return options.decimalPrecision; }
        return this.#roundStrategy === "NONE" ? 50 : DEFAULT_DECIMAL_PRECISION;
    }

    private getResultJSON(): { n: string; d: string } {
        if (!this.#cachedResultJSON) {
            this.#cachedResultJSON = this.#result.toJSON() as { n: string; d: string };
        }
        return this.#cachedResultJSON;
    }

    /**
     * Retorna a representação decimal do resultado como uma string numérica pura.
     *
     * **Engenharia:** Utiliza a estratégia de arredondamento definida no commit para
     * converter a fração racional interna em uma string decimal com precisão fixa.
     * É o método mais seguro para transferir valores entre sistemas.
     *
     * @param options - Configurações de saída (especialmente `decimalPrecision`).
     * @returns String numérica (ex: "10.5000").
     *
     * @example Exemplo Simples
     * ```ts
     * const str = output.toStringNumber(); // "15.0000"
     * ```
     *
     * @example Precisão Customizada (Arredondamento aplicado)
     * ```ts
     * // Se o valor for 1.2555 e a estratégia for NBR-5891
     * const str = output.toStringNumber({ decimalPrecision: 2 }); // "1.26"
     * ```
     *
     * @example Cenário Real: Integração com API de Pagamentos
     * ```ts
     * // APIs como Stripe esperam valores em formato de string para evitar erros de parser JSON.
     * const payload = { amount: output.toStringNumber({ decimalPrecision: 2 }) };
     * ```
     *
     * @example Cenário Real Complexo: Geração de XML de Nota Fiscal
     * ```ts
     * // Itens de nota fiscal podem exigir precisão de até 10 casas para exportação.
     * const xmlVal = `<vUnCom>${res.toStringNumber({ decimalPrecision: 10 })}</vUnCom>`;
     * ```
     */
    public toStringNumber(options?: OutputOptions): string {
        using _span = startSpan("toStringNumber", logger, options);
        return this.toStringNumberInternal(options);
    }

    private toStringNumberInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toStringNumber:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const result = isNone ? this.#result.toDecimalString(p) : this.getRounded(p).toDecimalString(p);

        // Se for NONE, removemos zeros à direita desnecessários para mostrar o valor "limpo"
        const finalResult = isNone ? result.replace(/\.?0+$/, "").replace(/\.$/, "") || "0" : result;

        this.#outputCache.set(cacheKey, finalResult);
        return finalResult;
    }

    /**
     * Converte o resultado para o tipo `number` nativo do JavaScript.
     *
     * **Aviso de Engenharia:** Este método deve ser usado apenas para fins de exibição
     * em gráficos ou bibliotecas que não aceitam BigInt/Strings. Para cálculos
     * subsequentes, prefira manter a fluidez da CalcAUYLogic para evitar os erros
     * de arredondamento inerentes ao padrão IEEE 754 (float).
     *
     * @param options - Configurações de saída.
     * @returns O valor como number (float de 64 bits).
     *
     * @example Exemplo Simples
     * ```ts
     * const val = output.toFloatNumber();
     * ```
     *
     * @example Operação com Number nativo
     * ```ts
     * const total = output.toFloatNumber() + 10.5;
     * ```
     *
     * @example Cenário Real: Dashboard de BI (Gráficos)
     * ```ts
     * // Passando para o Chart.js que espera arrays de numbers.
     * chart.data.datasets[0].data.push(resultado.toFloatNumber());
     * ```
     *
     * @example Cenário Real Complexo: Lógica de UI Condicional
     * ```ts
     * // Decidindo qual componente renderizar baseado no valor aproximado.
     * const isHighValue = resultado.toFloatNumber() > 1_000_000;
     * ```
     */
    public toFloatNumber(options?: OutputOptions): number {
        using _span = startSpan("toFloatNumber", logger, options);
        return Number.parseFloat(this.toStringNumberInternal(options));
    }

    /**
     * Retorna o valor escalado para a precisão informada como um BigInt.
     *
     * **Engenharia:** Útil para persistência em bancos de dados que armazenam
     * valores monetários como "inteiros escalados" (scaled integers) para
     * eliminar completamente o risco de imprecisão em consultas SQL SUM/AVG.
     *
     * @param options - A `decimalPrecision` define a escala (ex: 2 para centavos).
     * @returns BigInt escalado (ex: 15.50 com precisão 2 retorna 1550n).
     *
     * @example Exemplo Simples (Centavos)
     * ```ts
     * const scaled = output.toScaledBigInt({ decimalPrecision: 2 }); // 1500n
     * ```
     *
     * @example Escala para Alta Precisão (Milésimos)
     * ```ts
     * const mil = output.toScaledBigInt({ decimalPrecision: 3 }); // 15000n
     * ```
     *
     * @example Cenário Real: Persistência em PostgreSQL (BIGINT)
     * ```ts
     * // Armazenando 150.50 como 15050 no banco de dados.
     * await prisma.transaction.create({ data: { amount: res.toScaledBigInt({ decimalPrecision: 2 }) } });
     * ```
     *
     * @example Cenário Real Complexo: Reconciliação Bancária
     * ```ts
     * // Comparações exatas entre BigInts evitarem erros de '0.1 + 0.2 !== 0.3'
     * const isValid = res.toScaledBigInt({ decimalPrecision: 2 }) === expectedCentsFromBank;
     * ```
     */
    public toScaledBigInt(options?: OutputOptions): bigint {
        using _span = startSpan("toScaledBigInt", logger, options);
        return this.toScaledBigIntInternal(options);
    }

    private toScaledBigIntInternal(options?: OutputOptions): bigint {
        const p: number = this.getEffectivePrecision(options);
        const pScale: bigint = 10n ** BigInt(p);
        const rounded: RationalNumber = this.getRounded(p);
        return (rounded.n * pScale) / rounded.d;
    }

    /**
     * Retorna o resultado racional bruto (n/d) sem qualquer arredondamento ou processamento.
     *
     * **Engenharia:** Este é o método definitivo para obter a precisão absoluta do motor interno.
     * Útil para sistemas que desejam realizar seu próprio processamento ou persistência
     * de frações puras.
     *
     * @returns Objeto contendo o numerador (n) e o denominador (d) como BigInts.
     */
    public toRawInternalNumber(): { n: bigint; d: bigint } {
        using _span = startSpan("toRawInternalNumber", logger, {});
        return this.toRawInternalNumberInternal();
    }

    private toRawInternalNumberInternal(): { n: bigint; d: bigint } {
        return { n: this.#result.n, d: this.#result.d };
    }

    /**
     * Retorna o rastro completo da execução como um objeto para inspeção programática.
     *
     * **Engenharia:** Semelhante ao `toAuditTrace`, mas retorna o objeto puro
     * (sem serialização JSON). Útil para integrações que já lidam com objetos JS/TS.
     */
    public toASTObject(): Record<string, unknown> {
        using _span = startSpan("toASTObject", logger, {});
        return this.toASTObjectInternal();
    }

    private toASTObjectInternal(): Record<string, unknown> {
        if (!this.#cachedASTObject) {
            this.#cachedASTObject = {
                // Otimização: Shallow copy do root. Nós da AST são imutáveis por design.
                ast: { ...this.#ast },
                finalResult: this.getResultJSON(),
                roundStrategy: this.#roundStrategy,
                signature: this.#signature,
                contextLabel: this.#config.contextLabel,
            };
        }
        return { ...this.#cachedASTObject };
    }

    /**
     * Gera uma string monetária formatada e localizada (ex: R$ 1.250,00).
     *
     * **Engenharia:** Utiliza internamente a API `Intl.NumberFormat` para garantir
     * conformidade absoluta com as regras de cada localidade (símbolo da moeda,
     * separadores de milhar e decimal). A precisão informada força o comportamento
     * da API nativa para evitar arredondamentos inesperados.
     *
     * @param options - Configurações de localidade (`locale`) e moeda (`currency`).
     * @returns String monetária formatada conforme o padrão do país.
     *
     * @example Exemplo Simples (Padrão pt-BR / BRL)
     * ```ts
     * const brl = output.toMonetary(); // "R$ 15,00"
     * ```
     *
     * @example Internacionalização (en-US / USD)
     * ```ts
     * const usd = output.toMonetary({ locale: "en-US", currency: "USD" }); // "$15.00"
     * ```
     *
     * @example Cenário Real: Nota Fiscal de Exportação (Euro)
     * ```ts
     * // Exibindo valor em Euro com convenções de separador decimal da França.
     * const eur = res.toMonetary({ locale: "fr-FR", currency: "EUR" }); // "15,00 €"
     * ```
     *
     * @example Cenário Real Complexo: Conversão de Câmbio para Relatório
     * ```ts
     * // Valor calculado em dólar sendo exibido para investidores brasileiros.
     * const reportVal = res.toMonetary({ locale: "pt-BR", currency: "USD" }); // "US$ 15,00"
     * ```
     */
    public toMonetary(options?: OutputOptions): string {
        using _span = startSpan("toMonetary", logger, options);
        return this.toMonetaryInternal(options);
    }

    private toMonetaryInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const loc = getLocale(options?.locale);
        const currency: string = options?.currency ?? loc.currency;
        const val: string = this.toStringNumberInternal(options);

        const numberValue = Number.parseFloat(val);
        if (Number.isNaN(numberValue)) { return val; }

        const cacheKey = `${loc.locale}:${currency}:${p}:${this.#roundStrategy === "NONE"}`;
        let formatter = CalcAUYOutput.#formatterCache.get(cacheKey);
        if (!formatter) {
            formatter = new Intl.NumberFormat(loc.locale, {
                style: "currency",
                currency,
                minimumFractionDigits: p,
                maximumFractionDigits: p,
            });
            CalcAUYOutput.#formatterCache.set(cacheKey, formatter);
        }

        return formatter.format(numberValue);
    }

    /**
     * Reconstrói a expressão matemática completa em sintaxe LaTeX.
     *
     * **Engenharia:** Percorre a AST recursivamente e traduz cada operação em
     * notação LaTeX matemática pura. Inclui o invólucro de arredondamento
     * `\text{round}` para garantir que o rastro reflita a realidade do cálculo.
     *
     * @param options - Permite definir a `decimalPrecision` para o resultado final do rastro.
     * @returns String LaTeX compatível com MathJax e KaTeX.
     *
     * @example Exemplo Simples
     * ```ts
     * const latex = output.toLaTeX(); // "\text{round}_{...}(10 + 5, 4) = 15.0000"
     * ```
     *
     * @example Expressões com Frações e Potências
     * ```ts
     * // "10 / (2^3)" vira "\text{round}(\frac{10}{2^{3}}, 4)..."
     * ```
     *
     * @example Cenário Real: Memorial de Cálculo em Laudo Pericial
     * ```ts
     * // Inserindo a fórmula exata em um documento acadêmico ou jurídico.
     * const text = `O montante foi calculado via: $${res.toLaTeX()}$`;
     * ```
     *
     * @example Cenário Real Complexo: Dashboard de Engenharia Financeira
     * ```ts
     * // Renderizando fórmulas complexas de derivativos em tempo real.
     * const formulaHTML = renderLaTeX(res.toLaTeX({ decimalPrecision: 8 }));
     * ```
     */
    public toLaTeX(options?: OutputOptions): string {
        using _span = startSpan("toLaTeX", logger, options);
        return this.toLaTeXInternal(options);
    }

    private toLaTeXInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toLaTeX:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const base: string = renderAST(this.#ast, "latex");
        let roundedStr: string = this.toStringNumberInternal(options);
        // Escapar % no resultado para LaTeX para evitar erros de comentário
        roundedStr = roundedStr.replace(/%/g, String.raw`\%`);
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const result = String.raw`\text{round}_{\text{${strategyName}}}(${base}, ${p}) = ${roundedStr}`;
        this.#outputCache.set(cacheKey, result);
        return result;
    }

    /**
     * Gera uma representação matemática utilizando glifos Unicode (sobrescritos/subscritos).
     *
     * **Engenharia:** Utiliza um mapeamento de homóglifos e caracteres Unicode especiais
     * (incluindo suporte a Unicode 17.0) para criar uma visualização legível em ambientes
     * de texto puro (CLI, Logs, Mensagens). É ideal para auditoria rápida via terminal.
     *
     * @param options - Opções de saída.
     * @returns String Unicode matemática (ex: "roundₙᵦᵣ(2³ + 5, 2) = 13.00").
     *
     * @example Exemplo Simples
     * ```ts
     * console.log(output.toUnicode()); // "roundₙᵦᵣ₋₅₈₉₁(10 + 5, 4) = 15.0000"
     * ```
     *
     * @example Potências e Raízes em CLI
     * ```ts
     * // Se a AST tiver uma potência fracionária, o rastro apresentará glifos como √ ou ∛.
     * ```
     *
     * @example Cenário Real: Logs de Transação em Terminal
     * ```ts
     * logger.info(`Audit Trail: ${res.toUnicode()}`);
     * ```
     *
     * @example Cenário Real Complexo: Notificações de Bot (Slack/Discord)
     * ```ts
     * // Enviando uma fórmula legível via mensagem de texto sem depender de renderizadores ricos.
     * await bot.sendMessage(`Cálculo finalizado: ${res.toUnicode({ decimalPrecision: 2 })}`);
     * ```
     */
    public toUnicode(options?: OutputOptions): string {
        using _span = startSpan("toUnicode", logger, options);
        return this.toUnicodeInternal(options);
    }

    private toUnicodeInternal(options?: OutputOptions): string {
        const p: number = this.getEffectivePrecision(options);
        const isNone = this.#roundStrategy === "NONE";
        const cacheKey = `toUnicode:${p}:${isNone}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        const base: string = renderAST(this.#ast, "unicode");
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const subStrategy: string = toSubscript(strategyName);
        const result = `round${subStrategy}(${base}, ${p}) = ${this.toStringNumberInternal(options)}`;
        this.#outputCache.set(cacheKey, result);
        return result;
    }

    /**
     * Renderiza o resultado em um fragmento HTML altamente acessível e visualmente rico.
     *
     * **Engenharia:** Integra o motor KaTeX para renderização visual e injeta
     * automaticamente o rastro verbalizado no atributo `aria-label`, garantindo
     * conformidade com normas de acessibilidade digital (WCAG). O CSS do KaTeX
     * é injetado automaticamente para garantir a independência do fragmento.
     *
     * @param katex - Instância da biblioteca KaTeX (inversão de dependência).
     * @param options - Opções de saída.
     * @param customLocale - Tradução customizada completa (opcional).
     * @returns Fragmento HTML (div + style + content).
     *
     * @example Exemplo Simples
     * ```ts
     * const fragment = res.toHTML(katexInstance);
     * ```
     *
     * @example Injeção em Frameworks (React/Vue)
     * ```ts
     * // Utilizando dangerouslySetInnerHTML para exibir o rastro renderizado.
     * <div dangerouslySetInnerHTML={{ __html: res.toHTML(katex) }} />
     * ```
     *
     * @example Cenário Real: Portal de Transparência Governamental
     * ```ts
     * // Exibe a fórmula do gasto público de forma clara e acessível para o cidadão.
     * document.getElementById("info").innerHTML = res.toHTML(katex);
     * ```
     *
     * @example Cenário Real Complexo: Relatório de Auditoria Digital
     * ```ts
     * // Geração dinâmica de tabelas onde cada valor possui seu rastro visual no hover.
     * const html = `<td>${res.toHTML(katex, { decimalPrecision: 2 })}</td>`;
     * ```
     */
    public toHTML(katex: IKatex, options?: OutputOptions, customLocale?: CalcAUYLocaleA11y, skipA11y = false): string {
        using _span = startSpan("toHTML", logger, options);
        const fullLatex: string = this.toLaTeXInternal(options);
        return this.renderHTMLInternal(katex, fullLatex, options, customLocale, skipA11y);
    }

    /**
     * Gera um buffer de imagem (SVG) contendo o rastro visual do cálculo.
     *
     * @param katex - Instância da biblioteca KaTeX.
     * @param options - Opções de saída.
     * @param customLocale - Tradução customizada completa (opcional).
     * @returns Buffer (Uint8Array) contendo o código SVG.
     */
    public toImageBuffer(katex: IKatex, options?: OutputOptions, customLocale?: CalcAUYLocaleA11y): Uint8Array {
        const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const cacheKey = `toImageBuffer:${p}:${!!customLocale}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as Uint8Array; }

        using _span = startSpan("toImageBuffer", logger, options);
        const latex: string = this.toLaTeXInternal(options);
        const IGNORE_ARAI_LABEL = true;
        const html: string = this.renderHTMLInternal(katex, latex, options, customLocale, IGNORE_ARAI_LABEL);

        const svg: string = generateSVG(html, latex);
        const result = CalcAUYOutput.#encoder.encode(svg);
        this.#outputCache.set(cacheKey, result);
        return result;
    }

    /**
     * Gera a tradução verbal (fonética) do rastro de cálculo.
     *
     * **Engenharia:** Transforma a estrutura lógica da árvore em uma sequência de
     * frases naturais. Essencial para usuários de leitores de tela e interfaces de voz.
     * Detecta automaticamente o início e fim de grupos (parênteses) para garantir
     * que a leitura respeite a hierarquia das operações.
     *
     * @param options - Permite definir o `locale` (idioma) e a `decimalPrecision`.
     * @param customLocale - Tradução customizada completa (opcional). Se fornecida, deve conter todos os tokens.
     * @returns Tradução verbal completa (ex: "dez mais cinco, dividido por dois...").
     *
     * @example Exemplo Simples (pt-BR)
     * ```ts
     * const voz = res.toVerbalA11y();
     * // "dez mais cinco é igual a quinze..."
     * ```
     *
     * @example Localização para Inglês (en-US)
     * ```ts
     * const voice = res.toVerbalA11y({ locale: "en-US" });
     * // "ten plus five is equal to fifteen..."
     * ```
     *
     * @example Cenário Real: Assistente de Voz em App de Finanças
     * ```ts
     * // Fornece uma confirmação auditiva detalhada da transação.
     * await speechSDK.speak(res.toVerbalA11y({ decimalPrecision: 2 }));
     * ```
     *
     * @example Cenário Real Complexo: Inclusão em PDV (Ponto de Venda)
     * ```ts
     * // Garante que o cliente cego compreenda exatamente quais taxas e descontos foram aplicados.
     * const a11yDescription = res.toVerbalA11y({ locale: "pt-BR" });
     * ```
     */
    public toVerbalA11y(options?: OutputOptions, customLocale?: CalcAUYLocaleA11y): string {
        using _span = startSpan("toVerbalA11y", logger, options);
        return this.toVerbalA11yInternal(options, customLocale);
    }

    private toVerbalA11yInternal(options?: OutputOptions, customLocale?: CalcAUYLocaleA11y): string {
        const p: number = this.getEffectivePrecision(options);
        const loc = customLocale || getLocale(options?.locale);
        const base: string = renderAST(this.#ast, "verbal", loc);
        const strategyName: string = ROUNDING_IDS[this.#roundStrategy];
        const finalValueStr: string = this.toStringNumberInternal(options).replace(".", loc.voicedSeparator);
        const { phrases } = loc;
        return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
    }

    /**
     * Divide o valor final em partes iguais utilizando o Algoritmo de Maior Resto.
     *
     * **Engenharia:** Garante que a soma das fatias seja exatamente igual ao total
     * original. Se houver sobras de centavos na divisão inteira, o algoritmo as
     * distribui para as primeiras parcelas até que o saldo seja zero.
     *
     * @param parts - Número de parcelas desejadas.
     * @param options - Permite definir a `decimalPrecision` para o rateio.
     * @returns Array de strings numéricas representando as fatias.
     *
     * @example Exemplo Simples (10.00 / 3)
     * ```ts
     * const fatias = res.toSlice(3, { decimalPrecision: 2 });
     * // ["3.34", "3.33", "3.33"] -> Soma = 10.00
     * ```
     *
     * @example Rateio com Alta Precisão
     * ```ts
     * const fatias = res.toSlice(3, { decimalPrecision: 4 });
     * // ["3.3334", "3.3333", "3.3333"]
     * ```
     *
     * @example Cenário Real: Parcelamento de Fatura sem Juros
     * ```ts
     * // Dividindo uma compra de 100.00 em 3x no cartão.
     * const parcelas = venda.toSlice(3, { decimalPrecision: 2 });
     * ```
     *
     * @example Cenário Real Complexo: Distribuição de Dividendos
     * ```ts
     * // Rateando lucro entre 7 acionistas com precisão total.
     * const pagamentos = lucro.toSlice(7);
     * ```
     */
    public toSlice(parts: number, options?: OutputOptions): string[] {
        using _span = startSpan("toSlice", logger, { ...options, parts });
        return this.toSliceInternal(parts, options);
    }

    private toSliceInternal(parts: number, options?: OutputOptions): string[] {
        const p: number = this.getEffectivePrecision(options);
        const totalCents: bigint = this.toScaledBigIntInternal(options);
        return performSlice(totalCents, parts, p);
    }

    /**
     * Divide o valor final baseado em um array de proporções (ratios).
     *
     * **Engenharia:** Semelhante ao `toSlice`, mas utiliza pesos customizados.
     * As proporções podem ser informadas como porcentagens ("30%"), decimais (0.3)
     * ou frações. O algoritmo normaliza os pesos e distribui centavos remanescentes
     * priorizando os maiores restos decimais.
     *
     * @param ratios - Array de pesos (ex: ["0.1", "0.2", "0.7"] ou ["33.33%", "66.67%"]).
     * @param options - Opções de precisão e localidade.
     * @returns Array de strings numéricas proporcionais.
     *
     * @example Exemplo Simples
     * ```ts
     * const partes = res.toSliceByRatio([0.5, 0.5]); // Metade para cada
     * ```
     *
     * @example Uso de Porcentagens
     * ```ts
     * const partes = res.toSliceByRatio(["30%", "70%"]);
     * ```
     *
     * @example Cenário Real: Divisão de Impostos (Federal / Estadual / Municipal)
     * ```ts
     * const impostos = total.toSliceByRatio(["60%", "30%", "10%"]);
     * ```
     *
     * @example Cenário Real Complexo: Rateio de Custos de Importação
     * ```ts
     * // Rateando custo de frete baseado no peso/valor de cada item do container.
     * const custos = freteTotal.toSliceByRatio(pesosDosItens);
     * ```
     */
    public toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[] {
        using _span = startSpan("toSliceByRatio", logger, { ...options, ratios });
        return this.toSliceByRatioInternal(ratios, options);
    }

    private toSliceByRatioInternal(ratios: (number | string)[], options?: OutputOptions): string[] {
        const p: number = this.getEffectivePrecision(options);
        const totalCents: bigint = this.toScaledBigIntInternal(options);
        return performSliceByRatio(totalCents, ratios, p);
    }
    /**
     * Retorna o rastro completo da execução em formato JSON para auditoria profunda.
     *
     * **Engenharia:** Exporta um snapshot da AST, o resultado racional bruto
     * (numerador e denominador) e a estratégia de arredondamento. Ideal para
     * sistemas de compliance onde é necessário provar como o valor foi obtido.
     *
     * @returns String JSON contendo o snapshot técnico do cálculo.
     *
     * @example Exemplo Simples
     * ```ts
     * const trace = res.toAuditTrace();
     * ```
     *
     * @example Inspeção de Metadados
     * ```ts
     * const data = JSON.parse(res.toAuditTrace());
     * console.log(data.ast.metadata);
     * ```
     *
     * @example Cenário Real: Armazenamento Forense
     * ```ts
     * // Salvando o rastro completo em uma coluna JSONB no banco de dados.
     * await db.audit_logs.create({ payload: res.toAuditTrace() });
     * ```
     *
     * @example Cenário Real Complexo: Validação em Terceiros
     * ```ts
     * // Enviando o rastro para que um órgão regulador valide o cálculo independentemente.
     * await api.submitAudit(res.toAuditTrace());
     * ```
     */
    public toAuditTrace(): string {
        using _span = startSpan("toAuditTrace", logger, {});
        return this.toAuditTraceInternal();
    }

    private toAuditTraceInternal(): string {
        const cacheKey = "auditTrace";
        let trace = this.#outputCache.get(cacheKey) as string;
        if (trace === undefined) {
            trace = JSON.stringify(this.toASTObjectInternal());
            this.#outputCache.set(cacheKey, trace);
        }
        return trace;
    }

    /**
     * Consolida múltiplos formatos de saída em uma única string JSON pronta para consumo.
     *
     * **Engenharia:** Executa os métodos de exportação solicitados, aplica as
     * `options` globais e organiza tudo em um dicionário. Útil para APIs que
     * precisam entregar várias representações do mesmo dado em uma única resposta.
     *
     * @param outputs - List of method names (e.g., ["toMonetary", "toLaTeX"]).
     * @param katex - KaTeX library instance (required ONLY if toHTML or toImageBuffer are requested).
     * @param options - Precision and locale options applied to all fields.
     * @returns Consolidated JSON string.
     *
     * @example Exemplo Simples
     * ```ts
     * const json = res.toJSON(["toMonetary", "toStringNumber"]);
     * ```
     *
     * @example Com Opções Globais
     * ```ts
     * const json = res.toJSON(["toUnicode", "toVerbalA11y"], { locale: "en-US" });
     * ```
     *
     * @example Cenário Real: Resposta de API REST
     * ```ts
     * // Retornando tudo o que o front-end precisa para exibir o valor e o rastro.
     * return new Response(res.toJSON(["toMonetary", "toHTML", "toVerbalA11y"]));
     * ```
     *
     * @example Cenário Real Complexo: Integração de Sistemas (B2B)
     * ```ts
     * // Fornecendo valores numéricos exatos e justificativa em LaTeX para o parceiro.
     * const b2bPayload = res.toJSON(["toStringNumber", "toLaTeX"], { decimalPrecision: 10 });
     * ```
     */
    public toJSON<T extends OutputKey>(
        outputs?: T[],
        katex?: T extends KatexDependentKey ? IKatex : IKatex | undefined,
        options?: OutputOptions,
    ): string {
        using _span = startSpan("toJSON", logger, { outputs, options });
        const keys: OutputKey[] = (outputs as OutputKey[])
            ?? [
                "toStringNumber",
                "toScaledBigInt",
                "toMonetary",
                "toLaTeX",
                "toUnicode",
                "toVerbalA11y",
                "toAuditTrace",
            ];
        const res: Record<string, unknown> = {};

        // Mapeamento rigoroso para métodos internos para evitar spam de logs recursivos
        const self = this as unknown as Record<string, (opts?: OutputOptions) => unknown>;

        for (const key of keys) {
            if (key === ("toJSON" as OutputKey) || key === ("toCustomOutput" as OutputKey)) {
                continue;
            }

            // Validação em tempo de execução
            if ((key === "toHTML" || key === "toImageBuffer") && !katex) {
                throw new CalcAUYError(
                    "invalid-syntax",
                    `O parâmetro 'katex' é obrigatório para o método ${key} no toJSON.`,
                );
            }

            const internalKey = `${key}Internal`;
            // Prioriza o método Internal (sem log) se existir, senão usa o público
            const method = self[internalKey] || self[key];

            if (typeof method === "function") {
                let val: unknown;
                if (key === "toHTML" || key === "toImageBuffer") {
                    const fullLatex = this.toLaTeXInternal(options);
                    const IGNORE_ARAI_LABEL = key === "toImageBuffer";
                    const html = this.renderHTMLInternal(
                        katex as IKatex,
                        fullLatex,
                        options,
                        undefined,
                        IGNORE_ARAI_LABEL,
                    );

                    if (key === "toImageBuffer") {
                        const svg: string = generateSVG(html, fullLatex);
                        val = CalcAUYOutput.#encoder.encode(svg);
                    } else {
                        val = html;
                    }
                } else if (key === "toSlice") {
                    // toSlice exige 'parts' nas options, mas o toJSON padrão não o suporta diretamente
                    // a menos que seja passado via options. No caso de toJSON genérico, ignoramos.
                    continue;
                } else {
                    val = method.call(this, options);
                }

                res[key] = typeof val === "bigint" ? val.toString() : val;
            }
        }

        // Adiciona a assinatura de integridade e o contexto ao JSON final
        res.signature = this.#signature;
        res.contextLabel = this.#config.contextLabel;

        return JSON.stringify(res, (_key, value) => typeof value === "bigint" ? value.toString() : value);
    }

    /**
     * Permite a injeção de processadores de saída customizados (Extensibilidade).
     *
     * **Engenharia:** Fornece acesso total à AST, ao resultado racional absoluto
     * e a todos os métodos internos da classe através do contexto. É a forma
     * definitiva de adaptar a biblioteca a necessidades específicas de negócio.
     *
     * @param processor - Função customizada que processa o rastro.
     * @returns O retorno definido pelo processador injetado.
     *
     * @example Exemplo Simples (XML)
     * ```ts
     * const xml = res.toCustomOutput((ctx) => `<val>${ctx.result.n}</val>`);
     * ```
     *
     * @example Formatação Customizada
     * ```ts
     * const custom = res.toCustomOutput((ctx) => {
     *   return "Resultado: " + ctx.methods.toMonetary({ currency: "USD" });
     * });
     * ```
     *
     * @example Cenário Real: Exportador de Nota Fiscal (Layout Específico)
     * ```ts
     * const nfe = res.toCustomOutput((ctx) => ({
     *   total: ctx.methods.toStringNumber({ decimalPrecision: 2 }),
     *   hash: generateHash(ctx.audit.unicode)
     * }));
     * ```
     *
     * @example Cenário Real Complexo: Registro em Ledger / Blockchain
     * ```ts
     * // Gera um payload assinado com o rastro matemático para imutabilidade.
     * const ledgerEntry = res.toCustomOutput((ctx) => {
     *   return signData({ formula: ctx.audit.latex, val: ctx.result });
     * });
     * ```
     */
    public toCustomOutput<T>(processor: ICalcAUYCustomOutput<T>): T {
        using _span = startSpan("toCustomOutput", logger, {});

        if (!this.#cachedMethods) {
            this.#cachedMethods = {
                toStringNumber: this.toStringNumber.bind(this),
                toFloatNumber: this.toFloatNumber.bind(this),
                toScaledBigInt: this.toScaledBigInt.bind(this),
                toRawInternalNumber: this.toRawInternalNumber.bind(this),
                toASTObject: this.toASTObject.bind(this),
                toMonetary: this.toMonetary.bind(this),
                toLaTeX: this.toLaTeX.bind(this),
                toUnicode: this.toUnicode.bind(this),
                toHTML: this.toHTML.bind(this),
                toImageBuffer: this.toImageBuffer.bind(this),
                toVerbalA11y: this.toVerbalA11y.bind(this),
                toSlice: this.toSlice.bind(this),
                toSliceByRatio: this.toSliceByRatio.bind(this),
                toAuditTrace: this.toAuditTrace.bind(this),
                toJSON: this.toJSON.bind(this),
            };
        }

        const context: ICalcAUYCustomOutputContext = {
            result: this.#result,
            ast: this.#ast,
            roundStrategy: this.#roundStrategy,
            audit: {
                latex: this.toLaTeXInternal(),
                unicode: this.toUnicodeInternal(),
                verbal: this.toVerbalA11yInternal(),
            },
            options: {},
            methods: this.#cachedMethods,
        };
        return processor.call(this, context);
    }

    /**
     * Lógica interna para renderização de HTML, permitindo o reaproveitamento de LaTeX já calculado.
     * @private
     */
    private renderHTMLInternal(
        katex: IKatex,
        fullLatex: string,
        options?: OutputOptions,
        customLocale?: CalcAUYLocaleA11y,
        skipA11y = false,
    ): string {
        const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
        const cacheKey = `toHTML:${p}:${!!customLocale}:${skipA11y}`;
        if (this.#outputCache.has(cacheKey)) { return this.#outputCache.get(cacheKey) as string; }

        if (!katex || typeof katex.renderToString !== "function") {
            throw new CalcAUYError("invalid-syntax", "O módulo 'katex' é obrigatório para toHTML.");
        }

        const verbal: string = skipA11y ? "" : this.toVerbalA11yInternal(options, customLocale);
        const rendered: string = katex.renderToString(fullLatex, { displayMode: true, throwOnError: false });

        if (!CalcAUYOutput.#cachedKaTeXCSS) { CalcAUYOutput.#cachedKaTeXCSS = KATEX_CSS_MINIFIED; }

        const ariaAttr = skipA11y ? "" : ` aria-label="${verbal}"`;
        const result =
            `<div class="calc-auy-result"${ariaAttr}><style>${CalcAUYOutput.#cachedKaTeXCSS}.calc-auy-result { margin: 1em 0; overflow-x: auto; }</style>${rendered}</div>`;
        this.#outputCache.set(cacheKey, result);
        return result;
    }
}
