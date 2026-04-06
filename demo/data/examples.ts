/**
 * CalcAUY Demo - Categorized Examples
 * @module
 */

import { CalcAUY } from "@calc-auy";
import { mapAllOutputs } from "../logic/mapper.ts";

export const getCategorizedExamples = async () => {
    const examples: Record<string, Record<string, any>> = {
        operations: {
            add: [
                {
                    title: "Soma Simples",
                    context: "Adição de valores decimais.",
                    code: 'CalcAUY.from("10.50").add(5).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from("10.50").add(5).commit())
                },
                {
                    title: "Folha de Pagamento",
                    context: "Salário + Bônus - Descontos.",
                    code: 'CalcAUY.from(3000).add(500).sub(100).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from(3000).add(500).sub(100).commit())
                }
            ],
            mult: [
                {
                    title: "Juros Simples",
                    context: "Principal * Taxa * Tempo.",
                    code: 'CalcAUY.from(1000).mult("0.05").mult(12).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from(1000).mult("0.05").mult(12).commit())
                }
            ],
            pow: [
                {
                    title: "Juros Compostos",
                    context: "P * (1 + i)^n",
                    code: 'CalcAUY.from(1000).mult(CalcAUY.from(1).add("0.05").group().pow(12)).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from(1000).mult(CalcAUY.from(1).add("0.05").group().pow(12)).commit())
                },
                {
                    title: "Raiz Quadrada",
                    context: "Elevado a 1/2.",
                    code: 'CalcAUY.from(81).pow("1/2").commit()',
                    outputs: await mapAllOutputs(CalcAUY.from(81).pow("1/2").commit())
                }
            ],
            divInt: [
                {
                    title: "Divisão Inteira Euclidiana",
                    context: "-10 // 3 = -4 (sempre arredonda para baixo)",
                    code: 'CalcAUY.from("-10").divInt(3).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from("-10").divInt(3).commit())
                }
            ],
            mod: [
                {
                    title: "Módulo Euclidiano",
                    context: "-10 % 3 = 2 (sempre positivo)",
                    code: 'CalcAUY.from("-10").mod(3).commit()',
                    outputs: await mapAllOutputs(CalcAUY.from("-10").mod(3).commit())
                }
            ]
        },
        outputs: {
            locales: [
                {
                    title: "Internacionalização (pt-BR)",
                    context: "Formatação brasileira.",
                    code: 'CalcAUY.from("1234.56").commit()',
                    outputs: await mapAllOutputs(CalcAUY.from("1234.56").commit())
                },
                {
                    title: "Internacionalização (en-US)",
                    context: "Formatação americana.",
                    code: 'CalcAUY.from("1234.56").commit()',
                    outputs: await mapAllOutputs(CalcAUY.from("1234.56").commit()) // Locale change handled in mapper/output call if needed
                }
            ],
            rounding: [
                {
                    title: "Arredondamento NBR-5891",
                    context: "Critério de desempate ao par.",
                    code: 'CalcAUY.from("1.225").commit({ roundStrategy: "NBR5891" })',
                    outputs: await mapAllOutputs(CalcAUY.from("1.225").commit({ roundStrategy: "NBR5891" }))
                }
            ]
        }
    };

    return examples;
};
