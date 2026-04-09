<div align="center">

# CalcAUY

**Infraestrutura de Cálculo AST para Engenharia Financeira e Acessibilidade Digital**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-2b3a42?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0)
[![JSR](https://img.shields.io/badge/JSR-F7DF1E?style=for-the-badge&logo=jsr&logoColor=000)](https://jsr.io/@seu-escopo/seu-pacote)
[![Made in Brazil](https://img.shields.io/badge/Made_in-Brazil-009739?style=for-the-badge)](https://github.com/topics/brazil)

</div>

A **CalcAUY** é uma infraestrutura em **TypeScript** projetada para neutralizar a imprecisão do padrão IEEE 754. Através de **imutabilidade estrita e Abstract Syntax Tree (AST)**, ela assegura a integridade atuária, transformando cada operação em uma evidência matemática transparente, acessível e auditável

---

## 📖 Documentação

- [Entendendo a CalcAUY](./docs/start.md)
- [Exemplos de uso](./docs/examples.md)
- [Especificações](./docs/specs.md)
- [Segurança e Auditabilidade](./docs/audit.md)

## 🚀 Quick-start

### Instalação:
```bash
deno    add jsr:@st-all-one/calc-auy
pnpm      i jsr:@st-all-one/calc-auy
yarn    add jsr:@st-all-one/calc-auy
vlt install jsr:@st-all-one/calc-auy
npx     jsr add @st-all-one/calc-auy
bunx    jsr add @st-all-one/calc-auy
```

### Execução:
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
const scaledBigInt = resultado.toScaledBigInt({ decimalPrecision: 2 });
const unicode = resultado.toUnicode();
const latex = resultado.toLaTeX();
const verbalA11y = resultado.toVerbalA11y({ locale: "fr-FR" });
const auditTrace = resultado.toAuditTrace();

console.log(monetario);     // "R$ 1.331,0000"
console.log(scaledBigInt); // 133100n

console.log(unicode);       // "roundₙᵦᵣ₋₅₈₉₁(1000.00 × ((1 + (0.10))³), 4) = 1331.0000"
console.log(latex);         // "\text{round}_{\text{NBR-5891}}(1000.00 \times \left( \left( 1 + \left( 0.10 \right) \right)^{3} \right), 4) = 1331.0000"

console.log(verbalA11y);    // "1000.00 multiplié par ouvrir la parenthèse ouvrir la parenthèse 1 plus ouvrir la parenthèse 0.10 fermer la parenthèse fermer la parenthèse puissance 3 fermer la parenthèse est égal à 1331 virgule 0000 (Arrondi: NBR-5891 pour 4 décimales)."

console.log(auditTrace);
/*
{"ast":{"kind":"operation","type":"mul","operands":[{"kind":"literal","value":{"n":"1000","d":"1"},"originalInput":"1000.00"},{"kind":"group","child":{"kind":"operation","type":"pow","operands":[{"kind":"group","child":{"kind":"operation","type":"add","operands":[{"kind":"literal","value":{"n":"1","d":"1"},"originalInput":"1"},{"kind":"group","child":{"kind":"literal","value":{"n":"1","d":"10"},"originalInput":"0.10"}}]}},{"kind":"literal","value":{"n":"3","d":"1"},"originalInput":"3"}]}}]},"finalResult":{"n":"1331","d":"1"},"strategy":"NBR5891"}
*/
```

### Showcase

Veja em execução no [Showcase Interativo](https://google.com)

## 🎯 Por que essa lib existe?

No desenvolvimento de software financeiro moderno, o uso de `number` (float) é um risco. Erros de arredondamento inerentes ao padrão IEEE 754 (ex: `0.1 + 0.2 !== 0.3`) podem causar prejuízos acumulados e falhas em auditorias fiscais.

### Para Desenvolvedores

- **Precisão de Escala**: Processamento em escala interna de **10⁵⁰** utilizando `BigInt`, eliminando as limitações de precisão do tipo `number`.

- **Arquitetura AST**: As operações não são apenas executadas; elas são estruturadas em uma árvore lógica que separa a **intenção do cálculo** de sua **realização**.

- **Imutável por padrão**: Cada operação gera um novo `estado`, garantindo que o fluxo de dados seja livre de efeitos colaterais.

- **Multi-Runtime**: Distribuída via `JSR`, garantindo suporte nativo e otimizado para Deno, Node.js, Cloudflare Workers e Bun.

### Para Negócios, Compliance e Auditoria

- **Rastreabilidade Forense**: Cada resultado mantém sua "memória de cálculo" original, permitindo **reconstruir o histórico** de qualquer transação.

- **Padrão NBR 5891**: Implemento por padrão o arredondamento estatístico (**Banker's Rounding**), neutralizando vieses financeiros em processamentos de massa.

- **Evidências Matemáticas**: Exportação instantânea para `LaTeX` e `Unicode`, permitindo que a fórmula exata utilizada no código seja espelhada em relatórios oficiais e contratos jurídicos.

### Para Acessibilidade e Universalidade (A11y)

- **Matemática Semântica**: Diferente de strings estáticas, a `CalcAUY` compreende a hierarquia das operações, gerando descrições narrativas inteligentes para leitores de tela.

- **Suporte Multilíngue (i18n)**: Tradução automática da lógica de cálculo para 8 idiomas, garantindo que usuários globais compreendam a composição de seus custos.

- **Inclusão Cognitiva**: Representações visuais e auditivas que diferenciam claremente a precedência de operações, tornando o complexo compreensível para todos.

---

<div align="center">

**CalcAUY** é um projeto de código aberto sob a licença **MPL-2.0**

</div>
