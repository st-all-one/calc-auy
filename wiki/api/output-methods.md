# API de Saída (CalcAUYOutput)

Os métodos abaixo estão disponíveis no objeto retornado por `.commit()`.

---

## Métodos de Precisão

### `toStringNumber()`

Converte o resultado racional interno em string decimal plana. O arredondamento respeita a estratégia definida no `commit()`. Nunca passa pelo tipo `number` JS — imune a IEEE 754.

```typescript
toStringNumber(options?: { decimalPrecision?: number; locale?: string }): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from(10).add(5).commit();
res.toStringNumber(); // "15"
```

```typescript
res.toStringNumber({ decimalPrecision: 4 }); // "15.0000"
```

```typescript
// Use toStringNumber() para payloads de API
res.json({ total: output.toStringNumber({ decimalPrecision: 2 }) });
```

### `toScaledBigInt()`

Retorna o valor como `bigint` escalado por `10^decimalPrecision`. Ideal para colunas `BIGINT` em bancos de dados ou envio para blockchains (Wei, Satoshis).

```typescript
toScaledBigInt(options?: { decimalPrecision?: number }): bigint
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from("15.50").commit();
res.toScaledBigInt({ decimalPrecision: 2 }); // 1550n
```

```typescript
// 18 casas para Ethereum
res.toScaledBigInt({ decimalPrecision: 18 });
```

### `toRawInternalNumber()`

Retorna a fração irredutível `{ n: bigint, d: bigint }` sem qualquer arredondamento. É a representação mais pura do resultado da engine.

```typescript
toRawInternalNumber(): { n: bigint; d: bigint }
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const raw = (await calc.from(10).div(3).commit()).toRawInternalNumber();
// { n: 10n, d: 3n }
```

```typescript
// Persistência de frações puras
const { n, d } = output.toRawInternalNumber();
await db.raw_values.create({ data: { num: n.toString(), den: d.toString() } });
```

---

## Métodos Financeiros

### `toMonetary()`

Formata o valor como moeda localizada usando `Intl.NumberFormat`. Suporta 9 locales.

```typescript
toMonetary(options?: { locale?: Locale; currency?: string; decimalPrecision?: number }): string
```

Onde `Locale` é `"pt-BR" | "en-US" | "en-EU" | "es-ES" | "fr-FR" | "de-DE" | "ru-RU" | "zh-CN" | "ja-JP"`.

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from("1250.50").commit();
res.toMonetary(); // "R$ 1.250,50" (pt-BR padrão)
```

```typescript
res.toMonetary({ locale: "en-US", currency: "USD" }); // "$1,250.50"
```

```typescript
res.toMonetary({ locale: "de-DE", currency: "EUR" }); // "1.250,50 €"
```

### `toSlice()`

Divide o valor em N partes iguais usando o Algoritmo de Maior Resto. Garante que a soma das fatias seja exatamente igual ao total original.

```typescript
toSlice(parts: number, options?: { decimalPrecision?: number }): string[]
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from(100).commit();
res.toSlice(3); // ["33.34", "33.33", "33.33"]
```

```typescript
// Parcelamento dinâmico
output.toSlice(numInstallments, { decimalPrecision: 2 });
```

### `toSliceByRatio()`

Divide o valor proporcionalmente a um array de pesos. Normaliza automaticamente os pesos (não precisa somar 100%). Distribui centavos residuais com justiça estatística.

```typescript
toSliceByRatio(ratios: (string | number)[], options?: { decimalPrecision?: number }): string[]
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from(1000).commit();
res.toSliceByRatio(["80%", "15%", "5%"]); // ["800.00", "150.00", "50.00"]
```

```typescript
// Pesos numéricos (normalizados automaticamente)
output.toSliceByRatio([8, 9, 10, 5]);
```

---

## Métodos de Auditoria

### `toLiveTrace()`

Retorna o rastro completo da execução como um objeto JavaScript tipado (não serializado). Acesso programático direto à AST, assinatura e metadados.

```typescript
toLiveTrace(): SerializedCalculation
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const live = (await calc.from(10).add(5).commit()).toLiveTrace();
console.log(live.signature); // hash BLAKE3
console.log(live.ast.kind);  // "operation"
```

Ver também: [Assinatura do Cálculo](../security/calculation-signature.md)

### `toAuditTrace()`

Gera um snapshot JSON completo da AST com resultado racional, metadados e assinatura. Peça central para conformidade regulatória.

```typescript
toAuditTrace(): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const trace = (await calc.from(5000).mult(1.2).commit()).toAuditTrace();
await db.query("INSERT INTO history (trace) VALUES ($1)", [trace]);
```

```typescript
// Envio para endpoint regulatório
await axios.post("https://regulator.gov/audit", { payload: output.toAuditTrace() });
```

Ver também: [Audit Traces](../features/audit-traces.md)

### `toJSON()`

Agrega múltiplos formatos de saída em um único objeto JSON. Aceita um array de chaves para selecionar quais representações incluir.

```typescript
toJSON(outputs?: OutputKey[], options?: OutputOptions): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const payload = (await calc.from(100).commit()).toJSON(["toMonetary", "toLaTeX"]);
// { "toMonetary": "R$ 100,00", "toLaTeX": "100" }
```

```typescript
// Padrão: retorna 7 campos de auditoria
output.toJSON();
```

### `toMermaidGraph()`

Gera um diagrama de sequência Mermaid representando a jornada cronológica do cálculo entre jurisdições. Ideal para auditoria visual de supply chain matemática.

```typescript
toMermaidGraph(): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const graph = (await calc.from(50000).add(1250).commit()).toMermaidGraph();
// String DSL Mermaid pronta para renderização
```

Ver também: [Segurança](../security/security.md)

---

## Métodos de Acessibilidade

### `toLaTeX()`

Reconstrói a expressão matemática em sintaxe LaTeX. Respeita `GroupNodes` e inclui encapsulamento de arredondamento. Renderizável por KaTeX/MathJax.

```typescript
toLaTeX(options?: { decimalPrecision?: number }): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const latex = (await calc.from(100).add(20).group().mult(2).commit()).toLaTeX();
// `\left( 100 + 20 \right) \cdot 2`
```

```typescript
// Em documentos jurídicos
const memo = `A fórmula aplicada foi: $${output.toLaTeX()}$`;
```

### `toUnicode()`

Gera representação matemática com glifos Unicode (sobrescritos, `√`, `·`). Funciona em terminais, logs, Slack, Discord e SMS.

```typescript
toUnicode(options?: { decimalPrecision?: number }): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const uni = (await calc.from(10).div(3).commit()).toUnicode();
// "10 ÷ 3 = 3.333333..."
```

```typescript
// Log de produção
logger.info(`Fórmula processada: ${output.toUnicode()}`);
```

### `toVerbalA11y()`

Traduz a árvore de cálculo para frases fonéticas naturais em múltiplos idiomas. Essencial para leitores de tela (NVDA, JAWS), Alexa, e sistemas de URA.

```typescript
toVerbalA11y(options?: { decimalPrecision?: number; locale?: Locale }): string
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const verbal = (await calc.from(100).add(20).commit()).toVerbalA11y();
// "100 mais 20 igual a 120"
```

```typescript
// Em inglês para assistente de voz
output.toVerbalA11y({ locale: "en-US" }); // "100 plus 20 equals 120"
```

---

## Métodos de Extensibilidade

### `toCustomOutput()`

Ponto de extensão para formatos proprietários. Recebe uma função processadora com acesso ao resultado bruto (`result.n`, `result.d`), AST e métodos de saída internos.

```typescript
toCustomOutput(processor: CalcAUYCustomOutput, options?: object): unknown
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const res = await calc.from(100).add(20).commit();

// XML de Nota Fiscal
const nfe = res.toCustomOutput((ctx) =>
  `<vUnCom>${ctx.methods.toStringNumber({ decimalPrecision: 10 })}</vUnCom>`
);
```

```typescript
// Payload para smart contract
const payload = res.toCustomOutput((ctx) => ({
  val: ctx.result.n.toString(),
  hash: sha256(ctx.audit.latex),
}));
```

```typescript
// HTML via processador importado
import { htmlProcessor } from "@st-all-one/calc-auy/processor/html";
const html = res.toCustomOutput(htmlProcessor, { useKatex: true, theme: "dark" });
```

Ver também: [Processadores Oficiais](../features/processor-packages.md)

---

[↑ Voltar ao índice](../index.md)
