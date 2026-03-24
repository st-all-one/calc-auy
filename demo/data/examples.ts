import { CurrencyNBR } from "@currency-nbr-a11y";
import { mapAllOutputs } from "../logic/mapper.ts";

export const getCategorizedExamples = () => {
  return {
    outputs: {
      verbalMonetary: [
        {
          title: "Locale PT-BR",
          context: "Valor: 1501.25",
          code:
            "CurrencyNBR.from('1500.50').add(0.75).commit(2, { locale: 'pt-BR' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1500.50").add(0.75).commit(2, {
              locale: "pt-BR",
            }),
          ),
        },
        {
          title: "Locale FR-FR",
          context: "Valor: 1501.25",
          code:
            "CurrencyNBR.from('1500.50').add(0.75).commit(2, { locale: 'fr-FR' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1500.50").add(0.75).commit(2, {
              locale: "fr-FR",
            }),
          ),
        },
        {
          title: "Locale JA-JP",
          context: "Valor: 1501.25",
          code:
            "CurrencyNBR.from('1500.50').add(0.75).commit(2, { locale: 'ja-JP' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1500.50").add(0.75).commit(2, {
              locale: "ja-JP",
            }),
          ),
        },
        {
          title: "Locale ru-RU",
          context: "Soma de BRL convertida (Simulada)",
          code:
            "CurrencyNBR.from(100).add(50).mult(5.5).commit(2, { locale: 'ru-RU' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1500.50").add(0.75).commit(2, {
              locale: "ru-RU",
            }),
          ),
        },
      ],
      roundingShowcase: [
        {
          title: "NBR-5891 (Padrão)",
          context: "Arredonda 2.5 para Par (2)",
          code:
            "CurrencyNBR.from(2.5).commit(0, { roundingMethod: 'NBR-5891' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2.5).commit(0, { roundingMethod: "NBR-5891" }),
          ),
        },
        {
          title: "HALF-UP",
          context: "Arredonda 2.5 para Cima (3)",
          code:
            "CurrencyNBR.from(2.5).commit(0, { roundingMethod: 'HALF-UP' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2.5).commit(0, { roundingMethod: "HALF-UP" }),
          ),
        },
        {
          title: "TRUNCATE",
          context: "Trunca 2.9 para 2",
          code:
            "CurrencyNBR.from(2.9).commit(0, { roundingMethod: 'TRUNCATE' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2.9).commit(0, { roundingMethod: "TRUNCATE" }),
          ),
        },
        {
          title: "CEIL",
          context: "Arredondamento para cima 2.9 para 2",
          code:
            "CurrencyNBR.from('5.12345').mult(1000).div(3).commit(2, { roundingMethod: 'CEIL' })",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2.1).commit(0, { roundingMethod: "CEIL" }),
          ),
        },
      ],
      toString: [
        {
          title: "Arredondamento ABNT (Par)",
          context: "Valor: 1.225",
          code: "CurrencyNBR.from('1.225').commit(2).toString()",
          outputs: mapAllOutputs(CurrencyNBR.from("1.225").commit(2)),
        },
        {
          title: "Grande Escala",
          context: "Valor: 999.999.999,99",
          code: "CurrencyNBR.from('999999999.99').commit(2).toString()",
          outputs: mapAllOutputs(CurrencyNBR.from("999999999.99").commit(2)),
        },
        {
          title: "Cadeia de Soma",
          context: "Valores: 0.1, 0.2, 0.3",
          code:
            "CurrencyNBR.from('0.1').add('0.2').add('0.3').commit(2).toString()",
          outputs: mapAllOutputs(
            CurrencyNBR.from("0.1").add("0.2").add("0.3").commit(2),
          ),
        },
        {
          title: "Expressão Algébrica",
          context: "Resultado de (A + B) * C",
          code:
            "CurrencyNBR.from(10).add(20).group().mult(5.5).commit(3).toString()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(10).add(20).group().mult(5.5).commit(3),
          ),
        },
      ],
      toFloatNumber: [
        {
          title: "Precisão Decimal",
          context: "Valor: 1/3",
          code: "CurrencyNBR.from(1).div(3).commit(10).toFloatNumber()",
          outputs: mapAllOutputs(CurrencyNBR.from(1).div(3).commit(10)),
        },
        {
          title: "Valor Inteiro",
          context: "Valor: 1000",
          code: "CurrencyNBR.from(1000).commit().toFloatNumber()",
          outputs: mapAllOutputs(CurrencyNBR.from(1000).commit()),
        },
        {
          title: "Pequeno Negativo",
          context: "Valor: -0.005",
          code: "CurrencyNBR.from('-0.005').commit(3).toFloatNumber()",
          outputs: mapAllOutputs(CurrencyNBR.from("-0.005").commit(3)),
        },
        {
          title: "Fluxo de Caixa Descontado",
          context: "VP = VF / (1+i)^n",
          code:
            "CurrencyNBR.from(1000).div(CurrencyNBR.from(1.1).pow(5)).commit(2).toFloatNumber()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000).div(CurrencyNBR.from(1.1).pow(5)).commit(2),
          ),
        },
      ],
      toBigInt: [
        {
          title: "Escala Interna (10^12)",
          context: "Valor: 1.00",
          code: "CurrencyNBR.from(1).commit().toBigInt()",
          outputs: mapAllOutputs(CurrencyNBR.from(1).commit()),
        },
        {
          title: "Precisão de 12 casas",
          context: "Valor: 0.000000000001",
          code: "CurrencyNBR.from('0.000000000001').commit().toBigInt()",
          outputs: mapAllOutputs(CurrencyNBR.from("0.000000000001").commit()),
        },
        {
          title: "Limite Seguro",
          context: "Valor: 2^53 - 1",
          code: "CurrencyNBR.from(Number.MAX_SAFE_INTEGER).commit().toBigInt()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(Number.MAX_SAFE_INTEGER).commit(),
          ),
        },
        {
          title: "Volume de Transações",
          context: "Soma de grandes volumes",
          code: "CurrencyNBR.from(1e9).mult(1e5).add(0.01).commit().toBigInt()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1e9).mult(1e5).add(0.01).commit(),
          ),
        },
      ],
      toMonetary: [
        {
          title: "Real Brasileiro (Padrão)",
          context: "Valor: 1234.56",
          code:
            "CurrencyNBR.from('1234.56').commit(2, { locale: 'pt-BR' }).toMonetary()",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1234.56").commit(2, { locale: "pt-BR" }),
          ),
        },
        {
          title: "Dólar Americano",
          context: "Valor: 1234.56",
          code:
            "CurrencyNBR.from('1234.56').commit(2, { locale: 'en-US' }).toMonetary()",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1234.56").commit(2, { locale: "en-US" }),
          ),
        },
        {
          title: "Euro com 4 casas",
          context: "Valor: 1.2345",
          code:
            "CurrencyNBR.from('1.2345').commit(4, { locale: 'fr-FR' }).toMonetary()",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1.2345").commit(4, { locale: "fr-FR" }),
          ),
        },
        {
          title: "IOF em Cadeia",
          context: "Principal + IOF (0.38% + 0.0082% dia)",
          code:
            "CurrencyNBR.from(1000).mult(1.0038).add(CurrencyNBR.from(1000).mult(0.000082).mult(30)).commit(2).toMonetary()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000).mult(1.0038).add(
              CurrencyNBR.from(1000).mult(0.000082).mult(30),
            ).commit(
              2,
            ),
          ),
        },
      ],
      toLaTeX: [
        {
          title: "Fração Simples",
          context: "Valores: 100 / 3",
          code: "CurrencyNBR.from(100).div(3).commit(0).toLaTeX()",
          outputs: mapAllOutputs(CurrencyNBR.from(100).div(3).commit(0)),
        },
        {
          title: "Raiz Quadrada",
          context: "Valores: √81",
          code: "CurrencyNBR.from(81).pow('1/2').commit(0).toLaTeX()",
          outputs: mapAllOutputs(CurrencyNBR.from(81).pow("1/2").commit(0)),
        },
        {
          title: "Potência e Grupo",
          context: "Valores: (2 + 3)^2",
          code: "CurrencyNBR.from(2).add(3).group().pow(2).commit(0).toLaTeX()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2).add(3).group().pow(2).commit(0),
          ),
        },
        {
          title: "Desvio Padrão (Amostra)",
          context: "Raiz da Variância",
          code: "CurrencyNBR.from(2500).div(50).pow('1/2').commit(0).toLaTeX()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(2500).div(50).pow("1/2").commit(0),
          ),
        },
      ],
      toHTML: [
        {
          title: "Renderização SSR KaTeX",
          context: "Valor: 10.50 * 2",
          code: "CurrencyNBR.from('10.5').mult(2).commit(0).toHTML()",
          outputs: mapAllOutputs(CurrencyNBR.from("10.5").mult(2).commit(0)),
        },
        {
          title: "Baskhara (Fragmento)",
          context: "delta = (-5)^2 - 4*1*6",
          code:
            "CurrencyNBR.from('-5').pow(2).sub(CurrencyNBR.from(4).mult(1).mult(6)).commit(0).toHTML()",
          outputs: mapAllOutputs(
            CurrencyNBR.from("-5").pow(2).sub(
              CurrencyNBR.from(4).mult(1).mult(6),
            ).commit(0),
          ),
        },
        {
          title: "Divisões Aninhadas",
          context: "100 / (10 / 2)",
          code:
            "CurrencyNBR.from(100).div(CurrencyNBR.from(10).div(2).group()).commit(0).toHTML()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(100).div(CurrencyNBR.from(10).div(2).group())
              .commit(0),
          ),
        },
        {
          title: "Série de Pagamentos",
          context: "PMT = PV * i / (1 - (1+i)^-n)",
          code:
            "CurrencyNBR.from(10000).mult(0.02).div(CurrencyNBR.from(1).sub(CurrencyNBR.from(1.02).pow(-12))).commit(2).toHTML()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(10000).mult(0.02).div(
              CurrencyNBR.from(1).sub(CurrencyNBR.from(1.02).pow(-12)),
            )
              .commit(2),
          ),
        },
      ],
      toUnicode: [
        {
          title: "CLI Simples",
          context: "10 + 5 * 2",
          code: "CurrencyNBR.from(10).add(5).mult(2).commit(0).toUnicode()",
          outputs: mapAllOutputs(CurrencyNBR.from(10).add(5).mult(2).commit(0)),
        },
        {
          title: "Sobrescrito e Raiz",
          context: "√(81) + 2³",
          code:
            "CurrencyNBR.from(81).pow('1/2').add(CurrencyNBR.from(2).pow(3)).commit(0).toUnicode()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(81).pow("1/2").add(CurrencyNBR.from(2).pow(3))
              .commit(0),
          ),
        },
        {
          title: "Divisão Unicode",
          context: "100 ÷ 4",
          code: "CurrencyNBR.from(100).div(4).commit(0).toUnicode()",
          outputs: mapAllOutputs(CurrencyNBR.from(100).div(4).commit(0)),
        },
        {
          title: "Fórmula de Bhaskara Completa",
          context: "(-b + √Δ) / 2a",
          code:
            "CurrencyNBR.from(-10).add(CurrencyNBR.from(100).sub(4).group().pow('1/2')).div(2).commit(0).toUnicode()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(-10).add(
              CurrencyNBR.from(100).sub(4).group().pow("1/2"),
            ).div(2).commit(0),
          ),
        },
      ],
      toVerbalA11y: [
        {
          title: "Narração de Grupo",
          context: "(10 + 20) * 2",
          code:
            "CurrencyNBR.from(10).add(20).group().mult(2).commit(0).toVerbalA11y()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(10).add(20).group().mult(2).commit(0),
          ),
        },
        {
          title: "Narração de Raiz Cúbica",
          context: "³√8",
          code: "CurrencyNBR.from(8).pow('1/3').commit(0).toVerbalA11y()",
          outputs: mapAllOutputs(CurrencyNBR.from(8).pow("1/3").commit(0)),
        },
        {
          title: "Cenário de Desconto",
          context: "1000 - 15%",
          code:
            "CurrencyNBR.from(1000).sub(CurrencyNBR.from(1000).mult('0.15').group()).commit(0).toVerbalA11y()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000).sub(
              CurrencyNBR.from(1000).mult("0.15").group(),
            ).commit(0),
          ),
        },
        {
          title: "Fatura Complexa",
          context: "Serviço + Imposto - Retenção",
          code:
            "CurrencyNBR.from(5000).add(CurrencyNBR.from(5000).mult(0.05)).sub(CurrencyNBR.from(5000).mult(0.11)).commit(2).toVerbalA11y()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(5000).add(CurrencyNBR.from(5000).mult(0.05)).sub(
              CurrencyNBR.from(5000).mult(0.11),
            ).commit(2),
          ),
        },
      ],
      toImageBuffer: [
        {
          title: "Snapshot Visual",
          context: "Fórmula SAC",
          code: "CurrencyNBR.from(200000).div(100).commit(0).toImageBuffer()",
          outputs: mapAllOutputs(CurrencyNBR.from(200000).div(100).commit(0)),
        },
        {
          title: "Auditabilidade em Imagem",
          context: "Juros Compostos",
          code:
            "CurrencyNBR.from(1000).mult(CurrencyNBR.from(1).add('0.05').group().pow(12)).commit(0).toImageBuffer()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000).mult(
              CurrencyNBR.from(1).add("0.05").group().pow(12),
            ).commit(0),
          ),
        },
        {
          title: "Raiz Positiva",
          context: "√delta / (2*a)",
          code:
            "CurrencyNBR.from(1).pow('1/2').div(CurrencyNBR.from(2).mult(1).group()).commit(0).toImageBuffer()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1).pow("1/2").div(
              CurrencyNBR.from(2).mult(1).group(),
            ).commit(0),
          ),
        },
        {
          title: "Relatório Consolidado",
          context: "Margem de Lucro: (Venda - Custo) / Venda",
          code:
            "CurrencyNBR.from(150).sub(100).group().div(150).mult(100).commit(2).toImageBuffer()",
          outputs: mapAllOutputs(
            CurrencyNBR.from(150).sub(100).group().div(150).mult(100).commit(2),
          ),
        },
      ],
      toJson: [
        {
          title: "Exportação Completa",
          context: "Resumo de Cálculo",
          code: "CurrencyNBR.from(100).add(50).commit(2).toJson()",
          outputs: mapAllOutputs(CurrencyNBR.from(100).add(50).commit(2)),
        },
        {
          title: "Exportação Seletiva",
          context: "Apenas String e LaTeX",
          code:
            "CurrencyNBR.from(100).add(50).commit(2).toJson(['toString', 'toLaTeX'])",
          outputs: {
            ...mapAllOutputs(CurrencyNBR.from(100).add(50).commit(2)),
            toJson: CurrencyNBR.from(100).add(50).commit(2).toJson([
              "toString",
              "toLaTeX",
            ]),
          },
        },
        {
          title: "Apenas toString",
          context: "Output Mínimo",
          code: "CurrencyNBR.from(123.456).commit(2).toJson(['toString'])",
          outputs: {
            ...mapAllOutputs(CurrencyNBR.from(123.456).commit(2)),
            toJson: CurrencyNBR.from(123.456).commit(2).toJson(["toString"]),
          },
        },
        {
          title: "Auditoria de Empréstimo",
          context: "Parcela Price",
          code:
            "CurrencyNBR.from(1000).mult(0.01).div(CurrencyNBR.from(1).sub(CurrencyNBR.from(1.01).pow(-12))).commit(2).toJson()",
          outputs: {
            ...mapAllOutputs(
              CurrencyNBR.from(1000).mult(0.01).div(
                CurrencyNBR.from(1).sub(CurrencyNBR.from(1.01).pow(-12)),
              ).commit(2),
            ),
            toJson: CurrencyNBR.from(1000).mult(0.01).div(
              CurrencyNBR.from(1).sub(CurrencyNBR.from(1.01).pow(-12)),
            ).commit(2).toJson(),
          },
        },
      ],
    },
    operations: {
      add: [
        {
          title: "Adição Simples",
          context: "Soma básica",
          code: "CurrencyNBR.from(10).add(5).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).add(5).commit(2)),
        },
        {
          title: "Adição Complexa",
          context: "Múltiplos decimais",
          code: "CurrencyNBR.from(123.45).add(678.90).add(10.11).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(123.45).add(678.90).add(10.11).commit(2),
          ),
        },
        {
          title: "Subtotal de NF",
          context: "Soma de itens com impostos embutidos",
          code:
            "CurrencyNBR.from('1540.20').add('120.50').add('45.15').add('10.00').commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from("1540.20").add("120.50").add("45.15").add("10.00")
              .commit(2),
          ),
        },
        {
          title: "Folha de Pagamento",
          context: "Salário Base + Hora Extra + DSR + Bônus",
          code:
            "CurrencyNBR.from(3000).add(500).add(100).add(CurrencyNBR.from(3000).mult(0.1)).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(3000).add(500).add(100).add(
              CurrencyNBR.from(3000).mult(0.1),
            ).commit(2),
          ),
        },
      ],
      sub: [
        {
          title: "Subtração Simples",
          context: "Dedução básica",
          code: "CurrencyNBR.from(100).sub(10).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(100).sub(10).commit(2)),
        },
        {
          title: "Subtração em Cadeia",
          context: "Múltiplas deduções",
          code: "CurrencyNBR.from(5000).sub(1234.56).sub(456.78).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(5000).sub(1234.56).sub(456.78).commit(2),
          ),
        },
        {
          title: "Saldo Líquido",
          context: "Bruto - Descontos - Retenções",
          code:
            "CurrencyNBR.from(10000).sub(1500).sub(2250).sub(380).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(10000).sub(1500).sub(2250).sub(380).commit(2),
          ),
        },
        {
          title: "Apuração de Lucro Real",
          context: "Receita - CMV - Despesas Op. - Impostos",
          code:
            "CurrencyNBR.from(50000).sub(20000).sub(15000).sub(CurrencyNBR.from(50000).sub(20000).sub(15000).group().mult(0.15)).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(50000).sub(20000).sub(15000).sub(
              CurrencyNBR.from(50000).sub(20000).sub(15000).group().mult(0.15),
            ).commit(2),
          ),
        },
      ],
      mult: [
        {
          title: "Multiplicação Simples",
          context: "Fator fixo",
          code: "CurrencyNBR.from(10).mult(2).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).mult(2).commit(2)),
        },
        {
          title: "Multiplicação com Precisão",
          context: "Taxa com 4 decimais",
          code: "CurrencyNBR.from(15.75).mult(4.5).commit(4)",
          outputs: mapAllOutputs(CurrencyNBR.from(15.75).mult(4.5).commit(4)),
        },
        {
          title: "Cálculo de Juros Simples",
          context: "Principal * Taxa * Tempo (P * i * n)",
          code: "CurrencyNBR.from(5000).mult(0.015).mult(12).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(5000).mult(0.015).mult(12).commit(2),
          ),
        },
        {
          title: "Conversão Cambial Cruzada",
          context: "USD -> EUR -> BRL (com spread)",
          code:
            "CurrencyNBR.from(100).mult(0.92).mult(5.50).mult(1.02).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(100).mult(0.92).mult(5.50).mult(1.02).commit(2),
          ),
        },
      ],
      div: [
        {
          title: "Divisão Simples",
          context: "Divisão básica",
          code: "CurrencyNBR.from(10).div(2).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).div(2).commit(2)),
        },
        {
          title: "Divisão com Arredondamento",
          context: "10 / 3 com 4 casas",
          code: "CurrencyNBR.from(10).div(3).commit(4)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).div(3).commit(4)),
        },
        {
          title: "Rateio de Custos",
          context: "Total / Participantes",
          code: "CurrencyNBR.from(1000).div(3).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(1000).div(3).commit(2)),
        },
      ],
      pow: [
        {
          title: "Potência Inteira",
          context: "Exponenciação básica",
          code: "CurrencyNBR.from(10).pow(2).commit(0)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).pow(2).commit(0)),
        },
        {
          title: "Fator de Juros",
          context: "1.05 elevado a 12 meses",
          code: "CurrencyNBR.from(1.05).pow(12).commit(6)",
          outputs: mapAllOutputs(CurrencyNBR.from(1.05).pow(12).commit(6)),
        },
        {
          title: "Juros Compostos",
          context: "Montante final: P * (1 + i)^n",
          code:
            "CurrencyNBR.from(1000).mult(CurrencyNBR.from(1).add(0.005).group().pow(360)).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000).mult(
              CurrencyNBR.from(1).add(0.005).group().pow(360),
            ).commit(2),
          ),
        },
        {
          title: "Valor Futuro de Anuidade",
          context: "Fator (1+i)^n - 1",
          code: "CurrencyNBR.from(1.01).pow(24).sub(1).commit(8)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1.01).pow(24).sub(1).commit(8),
          ),
        },
      ],
      mod: [
        {
          title: "Módulo Simples",
          context: "Resto básico",
          code: "CurrencyNBR.from(10).mod(3).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).mod(3).commit(2)),
        },
        {
          title: "Resto Decimal",
          context: "Resto de valor quebrado",
          code: "CurrencyNBR.from(123.45).mod(10).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(123.45).mod(10).commit(2)),
        },
        {
          title: "Resíduo de Rateio",
          context: "Centavos restantes de 100,00 por 3 pessoas",
          code: "CurrencyNBR.from(100).mod(3).commit(2)",
          outputs: mapAllOutputs(CurrencyNBR.from(100).mod(3).commit(2)),
        },
        {
          title: "Distribuição de Dividendos",
          context: "Resto da divisão de lucro por acionistas",
          code: "CurrencyNBR.from(1000000.55).mod(3500).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1000000.55).mod(3500).commit(2),
          ),
        },
      ],
      divInt: [
        {
          title: "Divisão Inteira",
          context: "Quociente inteiro",
          code: "CurrencyNBR.from(10).divInt(3).commit(0)",
          outputs: mapAllOutputs(CurrencyNBR.from(10).divInt(3).commit(0)),
        },
        {
          title: "Divisão de Grande Valor",
          context: "Itens que cabem no lote",
          code: "CurrencyNBR.from(5000).divInt(12).commit(0)",
          outputs: mapAllOutputs(CurrencyNBR.from(5000).divInt(12).commit(0)),
        },
        {
          title: "Amortização de Parcelas",
          context: "Quantidade de parcelas fixas",
          code:
            "CurrencyNBR.from(CurrencyNBR.from(1000).sub(100).group()).divInt(12).commit(0)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(CurrencyNBR.from(1000).sub(100).group()).divInt(12)
              .commit(0),
          ),
        },
        {
          title: "Lotes de Produção",
          context: "Total MP / Consumo Unitário",
          code: "CurrencyNBR.from(5000.5).divInt(1.25).commit(0)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(5000.5).divInt(1.25).commit(0),
          ),
        },
      ],
      group: [
        {
          title: "Precedência Simples",
          context: "(1 + 2) * 3",
          code: "CurrencyNBR.from(1).add(2).group().mult(3).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1).add(2).group().mult(3).commit(2),
          ),
        },
        {
          title: "Grupos Aninhados",
          context: "(100 - 10) / (2 + 3)",
          code:
            "CurrencyNBR.from(100).sub(10).group().div(CurrencyNBR.from(2).add(3).group()).commit(2)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(100).sub(10).group().div(
              CurrencyNBR.from(2).add(3).group(),
            ).commit(2),
          ),
        },
        {
          title: "Fator de Price",
          context: "Fragmento da fórmula de amortização",
          code:
            "CurrencyNBR.from(1.01).pow(12).div(CurrencyNBR.from(1.01).pow(12).sub(1).group()).commit(10)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(1.01).pow(12).div(
              CurrencyNBR.from(1.01).pow(12).sub(1).group(),
            ).commit(10),
          ),
        },
        {
          title: "Índice de Sharpe",
          context: "(Rp - Rf) / Op",
          code: "CurrencyNBR.from(0.12).sub(0.05).group().div(0.15).commit(4)",
          outputs: mapAllOutputs(
            CurrencyNBR.from(0.12).sub(0.05).group().div(0.15).commit(4),
          ),
        },
      ],
    },
  };
};
