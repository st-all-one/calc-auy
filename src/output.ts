import type { CalculationNode } from "./ast/types.ts";
import type { RationalNumber } from "./core/rational.ts";
import {
    DEFAULT_DECIMAL_PRECISION,
    KATEX_CSS_MINIFIED,
    ROUNDING_IDS,
    type RoundingStrategy,
} from "./core/constants.ts";
import { applyRounding } from "./rounding/rounding.ts";
import { getLocale } from "./i18n/i18n.ts";
import { CalcAUYError } from "./core/errors.ts";
import { toSubscript } from "./utils/unicode.ts";
import { renderAST } from "./output_internal/renderer.ts";
import { performSlice, performSliceByRatio } from "./output_internal/slicer.ts";
import { generateSVG } from "./output_internal/image_utils.ts";
import type { IKatex, OutputOptions } from "./core/types.ts";
import { getSubLogger, measureTime } from "./utils/logger.ts";
import { setGlobalLoggingPolicy } from "./utils/sanitizer.ts";

const logger = getSubLogger("output");

/**
 * Assinatura para processadores de saída customizados.
 *
 * Permite estender a CalcAUY com novos formatos (XML, CSV, Protobuf, etc)
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
    strategy: RoundingStrategy;
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
        | "toRawInternalBigInt"
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
 * CalcAUYOutput - Container imutável para resultados de cálculo e múltiplos formatos de exportação.
 *
 * Esta classe é gerada pelo método `CalcAUY.commit()`. Ela encapsula o resultado final
 * (como um `RationalNumber`) e a AST original, permitindo que o desenvolvedor extraia
 * a informação no formato mais adequado para cada canal (UI, Relatórios, Logs, A11y).
 *
 * @class
 */
export class CalcAUYOutput {
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #strategy: RoundingStrategy;
    readonly #cache: Map<number, RationalNumber> = new Map<number, RationalNumber>();
    private static cachedKaTeXCSS: string | null = null;

    public constructor(result: RationalNumber, ast: CalculationNode, strategy: RoundingStrategy) {
        this.#result = result;
        this.#ast = ast;
        this.#strategy = strategy;
    }

    /**
     * Define a política global de logging para a liberação de PII (versão fluente no output).
     */
    public setLoggingPolicy(policy: { sensitive: boolean }): CalcAUYOutput {
        setGlobalLoggingPolicy(policy);
        return this;
    }

    private getRounded(precision: number): RationalNumber {
        if (!this.#cache.has(precision)) {
            const rounded: RationalNumber = applyRounding(this.#result, this.#strategy, precision);
            this.#cache.set(precision, rounded);
        }
        return this.#cache.get(precision) as RationalNumber;
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
        return this.instrument("toStringNumber", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            return this.getRounded(p).toDecimalString(p);
        });
    }

    /**
     * Converte o resultado para o tipo `number` nativo do JavaScript.
     *
     * **Aviso de Engenharia:** Este método deve ser usado apenas para fins de exibição
     * em gráficos ou bibliotecas que não aceitam BigInt/Strings. Para cálculos
     * subsequentes, prefira manter a fluidez da CalcAUY para evitar os erros
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
        return this.instrument("toFloatNumber", options, () => {
            return parseFloat(this.toStringNumber(options));
        });
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
        return this.instrument("toScaledBigInt", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const pScale: bigint = 10n ** BigInt(p);
            const rounded: RationalNumber = this.getRounded(p);
            return (rounded.n * pScale) / rounded.d;
        });
    }
    public toRawInternalBigInt(): bigint {
        return this.#result.n;
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
        return this.instrument("toMonetary", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const loc = getLocale(options?.locale);
            const currency: string = options?.currency ?? loc.currency;
            const val: string = this.toStringNumber(options);

            const numberValue = parseFloat(val);
            if (Number.isNaN(numberValue)) { return val; }

            return new Intl.NumberFormat(loc.locale, {
                style: "currency",
                currency,
                minimumFractionDigits: p,
                maximumFractionDigits: p,
            }).format(numberValue);
        });
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
        return this.instrument("toLaTeX", options, () => {
            const base: string = renderAST(this.#ast, "latex");
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const roundedStr: string = this.toStringNumber(options);
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            return `\\text{round}_{\\text{${strategyName}}}(${base}, ${p}) = ${roundedStr}`;
        });
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
        return this.instrument("toUnicode", options, () => {
            const base: string = renderAST(this.#ast, "unicode");
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            const subStrategy: string = toSubscript(strategyName);
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            return `round${subStrategy}(${base}, ${p}) = ${this.toStringNumber(options)}`;
        });
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
    public toHTML(katex: IKatex, options?: OutputOptions): string {
        return this.instrument("toHTML", options, () => {
            if (!katex || typeof katex.renderToString !== "function") {
                throw new CalcAUYError("invalid-syntax", "O módulo 'katex' é obrigatório para toHTML.");
            }

            const fullLatex: string = this.toLaTeX(options);
            const verbal: string = this.toVerbalA11y(options);

            const rendered: string = katex.renderToString(fullLatex, { displayMode: true, throwOnError: false });

            if (!CalcAUYOutput.cachedKaTeXCSS) { CalcAUYOutput.cachedKaTeXCSS = KATEX_CSS_MINIFIED; }

            return `<div class="calc-auy-result" aria-label="${verbal}"><style>${CalcAUYOutput.cachedKaTeXCSS}.calc-auy-result { margin: 1em 0; overflow-x: auto; }</style>${rendered}</div>`;
        });
    }

    public toImageBuffer(katex: IKatex, options?: OutputOptions): Uint8Array {
        return this.instrument("toImageBuffer", options, () => {
            const html: string = this.toHTML(katex, options);
            const latex: string = this.toLaTeX(options);
            const verbal: string = this.toVerbalA11y(options);

            const svg: string = generateSVG(html, latex, verbal);
            return new TextEncoder().encode(svg);
        });
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
    public toVerbalA11y(options?: OutputOptions): string {
        return this.instrument("toVerbalA11y", options, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const loc = getLocale(options?.locale);
            const base: string = renderAST(this.#ast, "verbal", loc);
            const strategyName: string = ROUNDING_IDS[this.#strategy];
            const finalValueStr: string = this.toStringNumber(options).replace(".", loc.voicedSeparator);
            const { phrases } = loc;
            return `${base}${phrases.isEqual}${finalValueStr} (${phrases.rounding}: ${strategyName} ${phrases.for} ${p} ${phrases.decimalPlaces}).`;
        });
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
        return this.instrument("toSlice", { ...options, parts }, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const totalCents: bigint = this.toScaledBigInt(options);
            return performSlice(totalCents, parts, p);
        });
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
        return this.instrument("toSliceByRatio", { ...options, ratios }, () => {
            const p: number = options?.decimalPrecision ?? DEFAULT_DECIMAL_PRECISION;
            const totalCents: bigint = this.toScaledBigInt(options);
            return performSliceByRatio(totalCents, ratios, p);
        });
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
        return this.instrument("toAuditTrace", {}, () => {
            return JSON.stringify({
                ast: this.#ast,
                finalResult: this.#result.toJSON(),
                strategy: this.#strategy,
            });
        });
    }

    /**
     * Consolida múltiplos formatos de saída em uma única string JSON pronta para consumo.
     *
     * **Engenharia:** Executa os métodos de exportação solicitados, aplica as
     * `options` globais e organiza tudo em um dicionário. Útil para APIs que
     * precisam entregar várias representações do mesmo dado em uma única resposta.
     *
     * @param outputs - Lista de nomes dos métodos (ex: ["toMonetary", "toLaTeX"]).
     * @param options - Opções de precisão e localidade aplicadas a todos os campos.
     * @returns String JSON consolidada.
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
    public toJSON(outputs?: string[], options?: OutputOptions): string {
        return this.instrument("toJSON", { outputs, options }, () => {
            const keys: string[] = outputs
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
            for (const key of keys) {
                if (key === "toJSON" || key === "toCustomOutput" || key === "toHTML" || key === "toImageBuffer") {
                    continue;
                }
                const method = (this as Record<string, unknown>)[key];
                if (typeof method === "function") {
                    const val = method.call(this, options);
                    res[key] = typeof val === "bigint" ? val.toString() : val;
                }
            }
            return JSON.stringify(res);
        });
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
        return this.instrument("toCustomOutput", {}, () => {
            const context: ICalcAUYCustomOutputContext = {
                result: this.#result,
                ast: this.#ast,
                strategy: this.#strategy,
                audit: {
                    latex: this.toLaTeX(),
                    unicode: this.toUnicode(),
                    verbal: this.toVerbalA11y(),
                },
                options: {},
                methods: {
                    toStringNumber: this.toStringNumber.bind(this),
                    toFloatNumber: this.toFloatNumber.bind(this),
                    toScaledBigInt: this.toScaledBigInt.bind(this),
                    toRawInternalBigInt: this.toRawInternalBigInt.bind(this),
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
                },
            };
            return processor.call(this, context);
        });
    }

    private instrument<T>(method: string, options: unknown, fn: () => T): T {
        const [result, duration] = measureTime(fn);
        logger.info("Output generated", {
            output_method: method,
            duration,
            options,
        });
        return result;
    }
}
