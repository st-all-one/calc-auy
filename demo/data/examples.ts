/**
 * CalcAUY Demo - Biblioteca de Engenharia (Exemplos Reais)
 * @module
 */

import { CalcAUY } from "@calc-auy";
import { mapAllOutputs } from "../logic/mapper.ts";

export const getCategorizedExamples = async (): Promise<Record<string, Record<string, any>>> => {
    const examples: Record<string, Record<string, any>> = {
        "Finanças e Amortização": {
            juros_compostos: [
                {
                    title: "Juros Compostos (Auditoria Completa)",
                    context: "Cálculo de montante com taxa de 2% a.m. sobre capital de R$ 5.000,00.",
                    code:
                        'CalcAUY.from(5000).mult(CalcAUY.from(1).add("0.02").group().pow(12)).setMetadata("formula", "M = P(1+i)^n").commit({ roundStrategy: "HALF_EVEN" })',
                    outputs: await mapAllOutputs(
                        CalcAUY.from(5000).mult(CalcAUY.from(1).add("0.02").group().pow(12)).setMetadata(
                            "formula",
                            "M = P(1+i)^n",
                        ).commit({ roundStrategy: "HALF_EVEN" }),
                    ),
                },
            ],
            slicing: [
                {
                    title: "Rateio de Centavos (Maior Resto)",
                    context: "Divisão de R$ 10,00 entre 3 parceiros sem perda de precisão.",
                    code: "CalcAUY.from(10).commit().toSlice(3, { decimalPrecision: 2 })",
                    outputs: { toStringNumber: '["3.34", "3.33", "3.33"] (Soma exata: 10.00)' },
                },
            ],
        },
        "Engenharia e Ciência": {
            torre_potencia: [
                {
                    title: "Torre de Potência (Caso Extremo)",
                    context: "Demonstração de associatividade à direita e precisão interna de 50 casas.",
                    code: "CalcAUY.from(2).pow(3).pow(2).commit()",
                    outputs: await mapAllOutputs(CalcAUY.from(2).pow(3).pow(2).commit()),
                },
            ],
            raizes: [
                {
                    title: "Raiz Enésima Complexa",
                    context: "Cálculo de raiz 6-ésima de 12 elevado ao cubo.",
                    code: 'CalcAUY.from(12).pow("3/6").commit()',
                    outputs: await mapAllOutputs(CalcAUY.from(12).pow("3/6").commit()),
                },
            ],
        },
        "Compliance e Metadados": {
            impostos: [
                {
                    title: "ICMS com Rastro de Lei",
                    context: "Aplicação de alíquota com metadados vinculados a artigos jurídicos.",
                    code:
                        'CalcAUY.from(1250.45).mult("0.18").setMetadata("lei", "Art. 155 CF/88").setMetadata("aliq_tipo", "interestadual").commit()',
                    outputs: await mapAllOutputs(
                        CalcAUY.from(1250.45).mult("0.18").setMetadata("lei", "Art. 155 CF/88").setMetadata(
                            "aliq_tipo",
                            "interestadual",
                        ).commit(),
                    ),
                },
            ],
        },
    };

    return examples;
};
