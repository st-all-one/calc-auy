# Primeiros Passos com CalcAUY

## Instalação

```bash
# Deno
deno add @st-all-one/calc-auy

# Node.js / Bun
npx jsr add @st-all-one/calc-auy
```

## Exemplo Rápido (30 segundos)

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

// 1. Factory → contexto isolado com chave de assinatura
const calc = CalcAUY.create({
    contextLabel: "quickstart",
    salt: "dev",
});

// 2. Builder → AST imutável
// 3. Commit → colapso racional + lacre BLAKE3
const result = await calc.from("(10 + 5) / 3").commit();

console.log(result.toStringNumber({ decimalPrecision: 4 })); // "5.0000"
```

## Por que CalcAUY existe?

| Problema | CalcAUY |
|---|---|
| IEEE 754 (`0.1 + 0.2 !== 0.3`) | Frações racionais `n/d` — erro zero até o output |
| Caixa-preta: "como esse número surgiu?" | AST imutável assinada (BLAKE3) com metadados forenses |
| Acessibilidade ignorada | Verbalização nativa em 9 idiomas |
| Arredondamento cumulativo | **Late Rounding**: arredonda apenas no `commit()` / output |

## Fluxo Básico

```
Factory ──> Builder ──> Commit ──> Output
.create()    .from()    .commit()  .toStringNumber()
             .add()                .toMonetary()
             .mult()               .toAuditTrace()
             .setMetadata()        .toLaTeX()
```

Cada etapa é imutável — o builder sempre retorna uma **nova** instância.

## Exemplo: Cadeia Completa

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const Finance = CalcAUY.create({
    contextLabel: "emprestimo",
    salt: "vault-2026",
    roundStrategy: "NBR5891", // padrão brasileiro
});

const result = await Finance
    .from(10_000)                        // principal
    .add("2.5%")                         // taxa de serviço
    .setMetadata("contrato", "EMP-123")  // justificativa auditável
    .mult(Finance.from(1).add("5.25%").group().pow(12)) // juros compostos
    .commit();

console.log(result.toMonetary());            // R$ 18.270,13
console.log(result.toUnicode());             // roundₙᵦᵣ₋₅₈₉₁(10000+2.5%×(1+5.25%)¹², 2)
console.log(result.toAuditTrace());          // JSON assinado — prova forense
```

## Saídas Disponíveis

| Método | Descrição |
|---|---|
| `toStringNumber()` | Decimal string |
| `toMonetary({ locale })` | Moeda localizada (9 locales) |
| `toLaTeX()` | Prova matemática |
| `toUnicode()` | CLI-friendly |
| `toMermaidGraph()` | Diagrama sequencial |
| `toVerbalA11y({ locale })` | Acessibilidade fonética |
| `toSlice(parts)` | Rateio igual com Largest Remainder |
| `toSliceByRatio(ratios)` | Rateio proporcional |
| `toAuditTrace()` | JSON assinado (BLAKE3) |
| `toScaledBigInt()` | BigInt escalado |
| `toRawInternalNumber()` | `{ n, d }` BigInt |
| `toJSON(keys)` | Multi-formato |
| `toCustomOutput(processor)` | Extensível |

---

[↑ Voltar ao índice](./index.md)
