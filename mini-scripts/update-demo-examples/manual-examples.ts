import { CalcAUY } from "@calc-auy";
import katex from "katex";

/**
 * Interface simplificada para exemplos pré-calculados.
 */
export interface RawExample {
    group: "operations" | "outputs";
    key: string;
    title: string;
    context: string;
    code: string;
    result: unknown; // O resultado final JÁ calculado (pode ser HTML, texto ou Base64)
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
        result: CalcAUY.from(100).add(CalcAUY.from(3).add(5).add(CalcAUY.from(50))).commit().toStringNumber(),
    },
    {
        group: "operations",
        key: "add/sub",
        title: "Subtração em cadeia",
        context: "Agrupamento de valores para desconto do valor principal.",
        code:
            "CalcAUY.from(1_000_000).sub(CalcAUY.from('50_000').add(CalcAUY.from(5e4).mult('0.12'))).commit().toHTML(katex)",
        result: CalcAUY.from(1_000_000).sub(CalcAUY.from("50_000").add(CalcAUY.from(5e4).mult("0.12"))).commit().toHTML(
            katex,
        ),
    },

    // Multiplicações e Divisões
    {
        group: "operations",
        key: "mult/div",
        title: "Multiplicação em juros simples",
        context: "Cálculo de rendimento simples.",
        code:
            "CalcAUY.from(1000).mult(CalcAUY.from(1).add(CalcAUY.from('0.05').mult(12))).commit({ roundStrategy: 'TRUNCATE' }).toMonetary()",
        result: CalcAUY.from(1000).mult(CalcAUY.from(1).add(CalcAUY.from("0.05").mult(12))).commit({
            roundStrategy: "TRUNCATE",
        }).toMonetary(),
    },
    {
        group: "operations",
        key: "div",
        title: "Divisão exata",
        context: "Cálculo exato sem resíduos do IEEE 754",
        code: "CalcAUY.from(10).div(3).mult(3).commit().toScaledBigInt({ decimalPrecision: 20 })",
        result: CalcAUY.from(10).div(3).mult(3).commit().toScaledBigInt({ decimalPrecision: 20 }),
    },

    // Potênciação
    {
        group: "operations",
        key: "pow",
        title: "Cálculo de juros compostos",
        context: "Cálculo de rendimento simples.",
        code:
            "CalcAUY.from(1000).mult(CalcAUY.from(1).add('0.05').group().pow(12)).commit({ roundStrategy: 'NBR5891' }).toHTML(katex)",
        result: CalcAUY.from(1000).mult(CalcAUY.from(1).add("0.05").group().pow(12)).commit({
            roundStrategy: "NBR5891",
        }).toUnicode(),
    },
    {
        group: "operations",
        key: "pow",
        title: "Cálculo financeiro de alta precisão em Euros",
        context: "Capital de 5000, taxa anual de 26%, convertendo para mensal (1/12)",
        code:
            "CalcAUY.from('5e3').mult(CalcAUY.from(1).add('0.26').group().pow('1/12')).sub('5e3').commit().toMonetary({locale: 'en-EU'})",
        result: CalcAUY.from("5e3").mult(CalcAUY.from(1).add("0.26").group().pow("1/12")).sub("5e3").commit()
            .toMonetary({ locale: "en-EU" }),
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
            viagens: CalcAUY.from(15750.5).divInt(3000).commit().toStringNumber({ decimalPrecision: 0 }),
            sobra: CalcAUY.from(15750.5).mod(3000).commit().toMonetary({ decimalPrecision: 2 }),
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
            CalcAUY.from(1000).divInt(3).commit().toScaledBigInt({ decimalPrecision: 0 }),
            CalcAUY.from(1000).mod(3).commit().toScaledBigInt({ decimalPrecision: 0 }),
        ],
    },

    // Agrupamento
    {
        group: "operations",
        key: "group",
        title: "Rateio de orçamento em viagens",
        context: "Calcula quantas viagens podem ser realizadas com o orçamento disponível e o valor restante.",
        code:
            "{ viagens, sobra } = { viagens: CalcAUY.from(15750.5).divInt(3000).commit().toStringNumber({ decimalPrecision: 0 }), sobra: CalcAUY.from(15750.5).mod(3000).commit().toMonetary({ decimalPrecision: 2 }) }",
        result: {
            viagens: CalcAUY.from(15750.5).divInt(3000).commit().toStringNumber({ decimalPrecision: 0 }),
            sobra: CalcAUY.from(15750.5).mod(3000).commit().toMonetary({ decimalPrecision: 2 }),
        },
    },
    {
        group: "operations",
        key: "group",
        title: "Analise do banco",
        context: "Calcula o valor restante após dividir o valor em 3 parcelas iguais",
        code:
            "[valorBase, restoCentavos] = [CalcAUY.from(1000).divInt(3).commit().toScaledBigInt({ decimalPrecision: 0 }), CalcAUY.from(1000).mod(3).commit().toScaledBigInt({ decimalPrecision: 0 })]",
        result: [
            CalcAUY.from(1000).divInt(3).commit().toScaledBigInt({ decimalPrecision: 0 }),
            CalcAUY.from(1000).mod(3).commit().toScaledBigInt({ decimalPrecision: 0 }),
        ],
    },

    {
        group: "operations",
        key: "complex",
        title: "Cálculo Visual",
        context: "Exemplo de renderização HTML.",
        code: "CalcAUY.from(144).pow('1/2').commit().toHTML(katex)",
        // Aqui enviamos o HTML limpo (o CSS será injetado globalmente uma vez)
        result: CalcAUY.from(144).pow("1/2").commit().toHTML(katex).replace(/<style>.*?<\/style>/, ""),
    },

    // --- GRUPO: OUTPUTS ---
    {
        group: "outputs",
        key: "toMonetary",
        title: "Monetário pt-BR",
        context: "Formatação de moeda nacional.",
        code: "CalcAUY.from(1250.50).commit().toMonetary()",
        result: CalcAUY.from(1250.50).commit().toMonetary(),
    },
];
