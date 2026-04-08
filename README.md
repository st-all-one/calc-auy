<div align="center">

# CalcAUY

**Motor de Cálculo baseado em AST para Engenharia Financeira e Acessibilidade Digital**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-2b3a42?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
[![JSR](https://img.shields.io/badge/JSR-F7DF1E?style=for-the-badge&logo=jsr&logoColor=000)](https://jsr.io/@seu-escopo/seu-pacote)
[![Made in Brazil](https://img.shields.io/badge/Made_in-Brazil-009739?style=for-the-badge)](https://github.com/topics/brazil)

</div>

A **CalcAUY** é uma solução de infraestrutura em **TypeScript**, concebida para neutralizar a imprecisão do padrão IEEE 754 de maneira transparente, acessível e auditável. É baseada em um paradigma de **imutabilidade estrita** e **AST**, assegurando a integridade atuaria e transformando cada operação em uma evidência matemática transparente e auditável.

---

### Documentação

Veja a documentação completa no [Guia de Bolso](./docs/_docs.md)

### Showcase

Veja em execução no [Showcase Interativo](https://google.com)

### Quick-start

#### Instalação:
```bash
deno    add jsr:@st-all-one/calc-auy
pnpm      i jsr:@st-all-one/calc-auy
yarn    add jsr:@st-all-one/calc-auy
vlt install jsr:@st-all-one/calc-auy
npx     jsr add @st-all-one/calc-auy
bunx    jsr add @st-all-one/calc-auy
```

#### Execução:
```ts
import { CalcAUY } from "@st-all-one/calc-auy";

// ==== Cálculo de Juros Compostos M = C * (1 + i)^t ====
// Parâmetros
const capital = CalcAUY.from("1000.00");
const taxaAnual = CalcAUY.from("0.10"); // 10% a.a.
const anosDecorridos = 3;

// Cálculo matemático M = C * (1 + i)^t
const calcMontante = capital.mult(
    CalcAUY.from(1)
        .add(taxaAnual)
        .group()
        .pow(anosDecorridos),
);

// Colapso da AST ==> realização do cálculo
const resultado = calcMontante.commit({ roundStrategy: "NBR5891" });

// Diferentes visualizaçõe do resultado
const monetario = resultado.toMonetary();
const centsInBigInt = resultado.toCentsInBigInt({ decimalPrecision: 2 });
const unicode = resultado.toUnicode();
const latex = resultado.toLaTeX();
const verbalA11y = resultado.toVerbalA11y({ locale: "fr-FR" });
const auditTrace = resultado.toAuditTrace();

console.log(monetario);     // "R$ 1.331,0000"
console.log(centsInBigInt); // 133100n

console.log(unicode);       // "roundₙᵦᵣ₋₅₈₉₁(1000.00 × ((1 + (0.10))³), 4) = 1331.0000"
console.log(latex);         // "\text{round}_{\text{NBR-5891}}(1000.00 \times \left( \left( 1 + \left( 0.10 \right) \right)^{3} \right), 4) = 1331.0000"

console.log(verbalA11y);    // "1000.00 multiplié par ouvrir la parenthèse ouvrir la parenthèse 1 plus ouvrir la parenthèse 0.10 fermer la parenthèse fermer la parenthèse puissance 3 fermer la parenthèse est égal à 1331 virgule 0000 (Arrondi: NBR-5891 pour 4 décimales)."

console.log(auditTrace);
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"1000","d":"1"},"originalInput":"1000.00"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"group","child":{"kind":"literal","value":{"n":"1","d":"10"},"originalInput":"0.10"}}]}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}]},"finalResult":{"n":"1331","d":"1"},"strategy":"NBR5891"}
*/

```

<div align="center">

**CalcAUY** é um projeto de código aberto sob licença **MPL-2.0**

</div>
