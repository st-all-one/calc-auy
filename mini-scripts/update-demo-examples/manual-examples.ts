import { CalcAUY as CalcAUYFactory } from "@calc-auy";
import { v7 as uuidv7 } from "@std/uuid";
import katex from "katex";
import { htmlProcessor } from "../../processor/html/processor.html.ts";
import { imageBufferProcessor } from "../../processor/image-buffer/processor.imagebuffer.ts";
import { BIRTH_TICKET_MOCK } from "../../src/core/constants.ts";

/**
 * Instância de demonstração com timestamp fixo para garantir assinaturas determinísticas.
 */
const CalcAUY = CalcAUYFactory.create({
    contextLabel: "demo",
    salt: "demo-salt",
    [BIRTH_TICKET_MOCK]: "2026-04-14T00:17:35.163Z",
} as any);

/**
 * Interface simplificada para exemplos pré-calculados.
 */
export interface RawExample {
    group: "operations" | "audit" | "outputs";
    key: string;
    title: string;
    context: string;
    code: string;
    result: unknown; // O resultado final JÁ calculado (pode ser HTML, texto ou Base64)
    customProcessor?: string;
}

export const manualExamples: RawExample[] = [
    // --- GRUPO: OPERAÇÕES ---
    // Adições e subtrações
    {
        group: "operations",
        key: "add/sub",
        title: "Soma em cadeia",
        context: "Agrupamento de valores para soma.",
        code: "CalcAUY.from(100).add(CalcAUY.from(3).add(5).add(CalcAUY.from(50))).commit().toStringNumber()",
        result: await CalcAUY.from(100).add(CalcAUY.from(3).add(5).add(CalcAUY.from(50))).commit()
            .then((o) => o.toStringNumber()),
    },
    {
        group: "operations",
        key: "add/sub",
        title: "Subtração em cadeia",
        context: "Agrupamento de valores para desconto do valor principal.",
        code:
            "CalcAUY.from(100_000).sub(CalcAUY.from('50000').add(CalcAUY.from(5e4).mult('0.12'))).commit().toMonetary({ decimalPrecision: 2 })",
        result: await CalcAUY.from(100_000).sub(
            CalcAUY.from("50000").add(CalcAUY.from(5e4).mult("0.12")),
        ).commit()
            .then((o) => o.toMonetary({ decimalPrecision: 2 })),
    },

    // Multiplicações e Divisões
    {
        group: "operations",
        key: "mult/div",
        title: "Multiplicação em juros simples",
        context: "Cálculo de rendimento simples.",
        code:
            "CalcAUY.from(1000).mult(CalcAUY.from(1).add(CalcAUY.from('0.05').mult(12))).commit({ roundStrategy: 'TRUNCATE' }).toMonetary()",
        result: await CalcAUY.from(1000).mult(CalcAUY.from(1).add(CalcAUY.from("0.05").mult(12)))
            .commit({
                roundStrategy: "TRUNCATE",
            }).then((o) => o.toMonetary()),
    },
    {
        group: "operations",
        key: "mult/div",
        title: "Divisão exata",
        context: "Cálculo exato em 20 casas decimais sem resíduos do IEEE 754",
        code: "CalcAUY.from(10).div(3).mult(3).commit().toStringNumber({ decimalPrecision: 20 })",
        result: await CalcAUY.from(10).div(3).mult(3).commit().then((o) =>
            o.toStringNumber({ decimalPrecision: 20 })
        ),
    },

    // Potênciação
    {
        group: "operations",
        key: "pow",
        title: "Cálculo de juros compostos",
        context: "Cálculo de rendimento simples.",
        code:
            "CalcAUY.from(1000).mult(CalcAUY.from(1).add('0.05').group().pow(12)).commit({ roundStrategy: 'NBR5891' }).toUnicode()",
        result: await CalcAUY.from(1000).mult(CalcAUY.from(1).add("0.05").group().pow(12)).commit({
            roundStrategy: "NBR5891",
        }).then((o) => o.toUnicode()),
    },
    {
        group: "operations",
        key: "pow",
        title: "Cálculo financeiro de alta precisão em Euros",
        context: "Capital de 5000, taxa anual de 26%, convertendo para mensal (1/12)",
        code:
            "CalcAUY.from('5e3').mult(CalcAUY.from(1).add('0.26').group().pow('1/12')).sub('5e3').commit().toMonetary({locale: 'en-EU'})",
        result: await CalcAUY.from("5e3").mult(CalcAUY.from(1).add("0.26").group().pow("1/12")).sub("5e3")
            .commit()
            .then((o) => o.toMonetary({ locale: "en-EU" })),
    },

    // Modulo e divisão inteira
    {
        group: "operations",
        key: "mod/divInt",
        title: "Rateio de orçamento em viagens",
        context: "Calcula quantas viagens podem ser realizadas com o orçamento disponível e o valor restante.",
        code:
            "{ viagens, sobra } = { viagens: CalcAUY.from(15750.5).divInt(3000).commit().toStringNumber({ decimalPrecision: 0 }), sobra: CalcAUY.from(15750.5).mod(3000).commit().toMonetary({ decimalPrecision: 2 }) }",
        result: {
            viagens: await CalcAUY.from(15750.5).divInt(3000).commit().then((o) =>
                o.toStringNumber({ decimalPrecision: 0 })
            ),
            sobra: await CalcAUY.from(15750.5).mod(3000).commit().then((o) =>
                o.toMonetary({ decimalPrecision: 2 })
            ),
        },
    },
    {
        group: "operations",
        key: "mod/divInt",
        title: "Analise do banco",
        context: "Calcula o valor restante após dividir o valor em 3 parcelas iguais",
        code:
            "[valorBase, restoCentavos] = [CalcAUY.from(1000).divInt(3).commit().toScaledBigInt({ decimalPrecision: 0 }), CalcAUY.from(1000).mod(3).commit().toScaledBigInt({ decimalPrecision: 0 })]",
        result: [
            await CalcAUY.from(1000).divInt(3).commit().then((o) => o.toScaledBigInt({ decimalPrecision: 0 })),
            await CalcAUY.from(1000).mod(3).commit().then((o) => o.toScaledBigInt({ decimalPrecision: 0 })),
        ],
    },

    // Agrupamento
    {
        group: "operations",
        key: "group",
        title: "Margem de lucro liquida",
        context:
            "Margem de lucro líquida calculada a partir do valor de venda, custo e tributação (ISS + PIS + COFINS).",
        code:
            "CalcAUY.from(5000).sub(2000).sub(CalcAUY.from(5_000).mult(CalcAUY.parseExpression('0.05 + 0.076 + 0.0165'))).group().div(5000).commit().toUnicode()",
        result: await CalcAUY.from(5000).sub(2000).sub(
            CalcAUY.from(5_000).mult(CalcAUY.parseExpression("0.05 + 0.076 + 0.0165")),
        ).group().div(5000).commit().then((o) => o.toUnicode()),
    },
    {
        group: "operations",
        key: "group",
        title: "Reajuste contratual",
        context: "Reajuste contratual aplicado a um valor base.",
        code: "CalcAUY.from(1200).mult(CalcAUY.from(1).add('0.085')).commit().toUnicode()",
        result: await CalcAUY.from(1200).mult(CalcAUY.from(1).add("0.085")).commit().then((o) =>
            o.toUnicode()
        ),
    },

    // Parser
    {
        group: "operations",
        key: "parser",
        title: "Criação de um CalcAUYLogic a partir de uma string",
        context: "String de uma fórmula matemática simples parseada",
        code: "CalcAUY.parseExpression('5 + 10 * (2 / 4)').commit().toLaTeX()",
        result: await CalcAUY.parseExpression("5 + 10 * (2 / 4)").commit().then((o) => o.toLaTeX()),
    },
    {
        group: "operations",
        key: "parser",
        title: "Parsear uma string e continuar o cálculo",
        context: "String de uma fórmula matemática simples parseada e continuada com operações",
        code: "CalcAUY.parseExpression('5 + 10 * (2 / 4)').mult(3).commit().toUnicode()",
        result: await CalcAUY.parseExpression("5 + 10 * (2 / 4)").mult(3).commit().then((o) => o.toUnicode()),
    },

    // --- GRUPO: Auditoria, metadados, hibernação e hidratação ---
    // Metadata
    {
        group: "audit",
        key: "metadata",
        title: "Inclusão de metadados para rastreio",
        context: "Cenário onde um cálculo foi feito na operação e carrega os metadados do operador",
        code:
            "CalcAUY.from(5432).mult('1/3').setMetadata('operational_trace', {id: uuidv7.generate(), operator_name: 'José da Silva', date: new Date().toISOString()}).commit().toAuditTrace()",
        result: await CalcAUY.from(5432).mult("1/3").setMetadata("operational_trace", {
            id: uuidv7.generate(),
            operator_name: "José da Silva",
            date: "2026-04-14T00:17:35.163Z",
        }).commit().then((o) => o.toAuditTrace()),
    },
    {
        group: "audit",
        key: "metadata",
        title: "Inclusão de metadados de negócio em cada etapa do cálculo",
        context: "Adição da justificativa de cada valor da composição de faturamento do cliente",
        code:
            "CalcAUY.from(1000).setMetadata('taxa_base', 'Servico padrão').add(150).setMetadata('taxa_extra', 'Diária extra').add(45).setMetadata('taxa_axtra', 'Custo ADM').setMetadata('datas_de_execucao', [ '10/03/26','11/03/26', '15/04/26' ]).commit().toAuditTrace()",
        result: await CalcAUY.from(1000).setMetadata("taxa_base", "Servico padrão").add(150).setMetadata(
            "taxa_extra",
            "Diária extra",
        ).add(45).setMetadata("taxa_axtra", "Custo ADM").setMetadata("datas_de_execucao", [
            "10/03/26",
            "11/03/26",
            "15/04/26",
        ]).commit().then((o) => o.toAuditTrace()),
    },

    // Hibernação e Hidratação
    {
        group: "audit",
        key: "hibernate/hydrate",
        title: "Hibernação do cálculo para persistência",
        context: "O usuário está montando um rascunho de precificação, e quer salvá-lo para posterior consulta.",
        code:
            "CalcAUY.from(100).setMetadata('nota', 'Custo médio diário').mult(CalcAUY.from(3).setMetadata('nota', 'Semanas operacionais').mult(5).setMetadata('nota', 'Dias alocados')).setMetadata('observacoes', 'Verificar alimentação').hibernate()",
        result: await CalcAUY.from(100).setMetadata("nota", "Custo médio diário").mult(
            CalcAUY.from(3).setMetadata("nota", "Semanas operacionais").mult(5).setMetadata("nota", "Dias alocados"),
        ).setMetadata("observacoes", "Verificar alimentação").hibernate(),
    },
    {
        group: "audit",
        key: "hibernate/hydrate",
        title: "Hidratação de cálculo hibernado",
        context: "Usuário recupera o cálculo salvo e finaliza ele",
        code:
            "CalcAUY.hydrate(calc_#1).add(CalcAUY.parseExpression('150 * 3 * 5').setMetadata('nota', 'Total alimentação')).commit().toMonetary()",
        result: await (await CalcAUY.hydrate(
            await CalcAUY.from(100).setMetadata("nota", "Custo médio diário").mult(
                CalcAUY.from(3).setMetadata("nota", "Semanas operacionais").mult(5).setMetadata(
                    "nota",
                    "Dias alocados",
                ),
            ).setMetadata("observacoes", "Verificar alimentação").hibernate(),
        )).add(
            CalcAUY.parseExpression("150 * 3 * 5").setMetadata("nota", "Total alimentação"),
        ).commit().then((o) => o.toMonetary()),
    },

    // --- GRUPO: OUTPUTS ---
    // string/monetary
    {
        group: "outputs",
        key: "string/monetary",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão string)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toStringNumber()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toStringNumber()),
    },
    {
        group: "outputs",
        key: "string/monetary",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão monetary)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toMonetary()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toMonetary()),
    },

    // ScaledBigInt
    {
        group: "outputs",
        key: "scaledBigInt",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toString)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toStringNumber()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toStringNumber()),
    },
    {
        group: "outputs",
        key: "scaledBigInt",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão scaledBigInt)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toScaledBigInt()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toScaledBigInt()),
    },

    // toSlice/toSLiceByRatio
    {
        group: "outputs",
        key: "toSlice/toSliceByRatio",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toSlice(3))",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toSlice(3)",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toSlice(3)),
    },
    {
        group: "outputs",
        key: "toSlice/toSliceByRatio",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toSliceByRatio(['10%', '5%', '25%', '60%']))",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toSliceByRatio(['10%', '5%', '25%', '60%'])",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toSliceByRatio(["10%", "5%", "25%", "60%"])),
    },

    // toUnicode/toHTML
    {
        group: "outputs",
        key: "unicode/html",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toUnicode())",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toUnicode()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toUnicode()),
    },
    {
        group: "outputs",
        key: "unicode/html",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toHTML)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toCustomOutput(htmlProcessor)",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toCustomOutput(htmlProcessor)),
    },

    // toLaTeX/toRawInternalNumber
    {
        group: "outputs",
        key: "LaTeX/rawInternalBigInt",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toLaTeX())",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toLaTeX()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toLaTeX()),
    },
    {
        group: "outputs",
        key: "LaTeX/rawInternalBigInt",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toRawInternalNumber)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toRawInternalNumber()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toRawInternalNumber()),
    },

    // toVerbalA11y
    {
        group: "outputs",
        key: "verbalA11y",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toVerbalA11y (PT/BR))",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toVerbalA11y({ locale: 'pt-BR' })",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toVerbalA11y({ locale: "pt-BR" })),
    },
    {
        group: "outputs",
        key: "verbalA11y",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toVerbalA11y (FR))",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toVerbalA11y({ locale: 'fr-FR' })",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toVerbalA11y({ locale: "fr-FR" })),
    },

    // toCustomOutput
    {
        group: "outputs",
        key: "customOutput",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toCustomOutput)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toCustomOutput(processor)",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) =>
            o.toCustomOutput((ctx) => {
                return `[REPORT] Result: ${ctx.result.n}/${ctx.result.d} | Strategy: ${ctx.roundStrategy}`;
            })
        ),
        customProcessor:
            "(ctx) => { return `[REPORT] Result: ${ctx.result.n}/${ctx.result.d} | Strategy: ${ctx.roundStrategy}`; }",
    },

    // toAuditTrace
    {
        group: "outputs",
        key: "auditTrace",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toAuditTrace)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toAuditTrace()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toAuditTrace()),
    },

    // toJSON
    {
        group: "outputs",
        key: "json",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toJSON)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toJSON()",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toJSON()),
    },

    // toImageBuffer
    {
        group: "outputs",
        key: "imageBuffer",
        title: "Demonstração de output",
        context: "Cálculo de juros compostos (visão toImageBuffer)",
        code:
            "CalcAUY.from(1_000).mult(CalcAUY.from(1).add('14.75%').group().pow(10)).setMetadata('meta', { id: 1, date: new Date().toISOString() }).commit().toCustomOutput(imageBufferProcessor)",
        result: await CalcAUY.from(1_000).mult(CalcAUY.from(1).add("14.75%").group().pow(10)).setMetadata(
            "meta",
            {
                id: 1,
                date: "2026-04-14T00:17:35.163Z",
            },
        ).commit().then((o) => o.toCustomOutput(imageBufferProcessor)),
    },

    // toMermaidGraph
    {
        group: "outputs",
        key: "Visual Audit (Mermaid)",
        title: "Diagrama de rastro de auditoria",
        context: "Representação visual do fluxo de cálculo para relatórios técnicos.",
        code:
            "CalcAUY.from(1500).add('5%').setMetadata('ref', 'Taxa ADM').commit().then(o => o.toMermaidGraph())",
        result: await CalcAUY.from(1500).add("5%").setMetadata("ref", "Taxa ADM").commit().then((o) =>
            o.toMermaidGraph()
        ),
    },

    // Rounding Strategies
    {
        group: "operations",
        key: "Rounding Strategies",
        title: "Estratégia: NBR5891 (Brasileira)",
        context: "Arredondamento padrão seguindo normas técnicas nacionais.",
        code: "CalcAUY.from('1.25').commit({ roundStrategy: 'NBR5891' }).toStringNumber({ decimalPrecision: 1 })",
        result: await CalcAUY.from("1.25").commit({ roundStrategy: "NBR5891" }).then((o) =>
            o.toStringNumber({ decimalPrecision: 1 })
        ),
    },
    {
        group: "operations",
        key: "Rounding Strategies",
        title: "Estratégia: HALF_EVEN (Bancário)",
        context: "Minimiza o viés estatístico em grandes volumes de transações.",
        code: "CalcAUY.from('1.25').commit({ roundStrategy: 'HALF_EVEN' }).toStringNumber({ decimalPrecision: 1 })",
        result: await CalcAUY.from("1.25").commit({ roundStrategy: "HALF_EVEN" }).then((o) =>
            o.toStringNumber({ decimalPrecision: 1 })
        ),
    },
    {
        group: "operations",
        key: "Rounding Strategies",
        title: "Estratégia: TRUNCATE",
        context: "Corta as casas decimais sem arredondar.",
        code: "CalcAUY.from('1.25').commit({ roundStrategy: 'TRUNCATE' }).toStringNumber({ decimalPrecision: 1 })",
        result: await CalcAUY.from("1.25").commit({ roundStrategy: "TRUNCATE" }).then((o) =>
            o.toStringNumber({ decimalPrecision: 1 })
        ),
    },

    // --- GRUPO: AUDITORIA AVANÇADA ---
    {
        group: "audit",
        key: "Cross-Context Audit",
        title: "Integração de instâncias (Filial -> Matriz)",
        context: "Incorpora o rastro de auditoria de uma instância externa mantendo a linhagem.",
        code:
            "Branch = CalcAUYFactory.create({ contextLabel: 'branch-ny' });\nHQ = CalcAUYFactory.create({ contextLabel: 'hq' });\nbranchTrace = await Branch.from(1000).hibernate();\nawait HQ.fromExternalInstance(branchTrace).mult(1.1).commit()",
        result: await (async () => {
            const Branch = CalcAUYFactory.create({ contextLabel: "branch-ny", salt: "b-salt" });
            const HQ = CalcAUYFactory.create({
                contextLabel: "hq-master",
                salt: "hq-salt",
                [BIRTH_TICKET_MOCK]: "2026-04-14T00:17:35.163Z",
            } as any);
            const branchTrace = await Branch.from(1000).setMetadata("dept", "sales").hibernate();
            return await (await HQ.fromExternalInstance(branchTrace)).mult(1.1).commit().then((o) => o.toAuditTrace());
        })(),
    },
    {
        group: "audit",
        key: "Integrity Validation",
        title: "Verificação de assinatura (Anti-Tampering)",
        context: "Valida se o rastro de auditoria foi modificado após a assinatura.",
        code:
            "trace = await CalcAUY.from(100).commit().then(o => o.toAuditTrace());\nisValid = await CalcAUYFactory.checkIntegrity(trace, { salt: 'demo-salt' });",
        result: await (async () => {
            const output = await CalcAUY.from(100).commit();
            const trace = output.toAuditTrace();
            const isValid = await CalcAUYFactory.checkIntegrity(trace, { salt: "demo-salt" });
            return `Rastro íntegro: ${isValid}`;
        })(),
    },
];
