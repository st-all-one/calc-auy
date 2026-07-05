# 09 — Interface Pública de Saída (CalcAUYOutput)

```mermaid
flowchart TD
    Commit[commit()] --> Output[CalcAUYOutput]
    Output --> N[toStringNumber: string]
    Output --> BI[toScaledBigInt: bigint]
    Output --> RAW[toRawInternalNumber: {n,d}]
    Output --> LT[toLiveTrace: SerializedCalculation]
    Output --> MON[toMonetary: string]
    Output --> SL[toSlice: string[]]
    Output --> SR[toSliceByRatio: string[]]
    Output --> L[toLaTeX: string]
    Output --> U[toUnicode: string]
    Output --> MG[toMermaidGraph: string]
    Output --> VA[toVerbalA11y: string]
    Output --> AT[toAuditTrace: string]
    Output --> J[toJSON: string]
    Output --> CO[toCustomOutput: T]
```

## Container Imutável

`CalcAUYOutput` é instanciado exclusivamente por `CalcAUYLogic.commit()`. Seus campos privados definem o estado imutável do resultado:

```typescript
// src/output.ts:52-61
export class CalcAUYOutput {
    readonly #result: RationalNumber;     // Resultado racional bruto
    readonly #ast: CalculationNode;       // AST completa do cálculo
    readonly #roundStrategy: RoundingStrategy; // Estratégia definida em create()
    readonly #signature: string;          // Hash BLAKE3 do resultado
    readonly #config: Required<InstanceConfig>; // Config completa da instância
    readonly #cache: Map<number, RationalNumber> = new Map(); // Resultados arredondados por precisão
    readonly #outputCache: Map<string, string | Uint8Array> = new Map(); // Cache de saídas
    #cachedLiveTrace: SerializedCalculation | null = null;
    #cachedMethods: CalcAUYCustomOutputContext["methods"] | null = null;
    #cachedResultJSON: RationalValue | null = null;
}
```

### `getRounded(precision)`

Aplica `applyRounding()` ao `#result` com a estratégia configurada. O resultado arredondado é cacheados em `#cache` (chave = precisão) para evitar recálculo em múltiplas saídas com a mesma precisão.

```typescript
// src/output.ts:77-84
private getRounded(precision: number): RationalNumber {
    if (!this.#cache.has(precision)) {
        const rounded = applyRounding(this.#result, this.#roundStrategy, precision);
        this.#cache.set(precision, rounded);
    }
    return this.#cache.get(precision)!;
}
```

### `getEffectivePrecision(options)`

Retorna a precisão efetiva baseada nas opções fornecidas ou no default da estratégia:

```typescript
// src/output.ts:86-89
private getEffectivePrecision(options?: OutputOptions): number {
    if (options?.decimalPrecision !== undefined) return options.decimalPrecision;
    return this.#roundStrategy === "NONE" ? 50 : DEFAULT_DECIMAL_PRECISION;
}
```

| Cenário | Precisão |
|---------|----------|
| `options.decimalPrecision` definido | O valor passado |
| `NONE` sem opção | `50` (máxima para visualização) |
| Qualquer outra estratégia sem opção | `DEFAULT_DECIMAL_PRECISION = 2` |

## Métodos Públicos

### `toStringNumber(options?) → string`

Retorna o resultado como string decimal formatada com a precisão especificada.

```typescript
// src/output.ts:116-134
public toStringNumber(options?: OutputOptions): string;
```

Para estratégia `NONE`, remove zeros à direita para exibir o valor "limpo":

```typescript
// src/output.ts:130
const finalResult = isNone ? result.replace(/\.?0+$/, "").replace(/\.$/, "") || "0" : result;
```

**Exemplo:** `output.toStringNumber()` → `"10250.00"`

### `toScaledBigInt(options?) → bigint`

Multiplica o valor por `10^precision` e retorna como BigInt. Útil para armazenamento em bancos de dados com ponto fixo.

```typescript
// src/output.ts:152-162
public toScaledBigInt(options?: OutputOptions): bigint;

private toScaledBigIntInternal(options?: OutputOptions): bigint {
    const p = this.getEffectivePrecision(options);
    const pScale = 10n ** BigInt(p);
    const rounded = this.getRounded(p);
    return (rounded.n * pScale) / rounded.d;
}
```

**Exemplo:** `output.toScaledBigInt({ decimalPrecision: 2 })` → `1050n` (para `10.50`)

### `toRawInternalNumber() → { n: bigint; d: bigint }`

Retorna o numerador e denominador **sem qualquer arredondamento**. Garantia de acesso ao racional puro.

```typescript
// src/output.ts:179-186
public toRawInternalNumber(): { n: bigint; d: bigint };

private toRawInternalNumberInternal(): { n: bigint; d: bigint } {
    return { n: this.#result.n, d: this.#result.d };
}
```

### `toLiveTrace() → SerializedCalculation`

Retorna o objeto de rastro completo: AST com metadados achatados (`flattenASTMetadata`), resultado final, estratégia, assinatura e label de contexto.

```typescript
// src/output.ts:204-220
public toLiveTrace(): SerializedCalculation;

private toLiveTraceInternal(): SerializedCalculation {
    if (!this.#cachedLiveTrace) {
        this.#cachedLiveTrace = {
            ast: flattenASTMetadata(this.#ast),
            finalResult: this.getResultJSON(),
            roundStrategy: this.#roundStrategy,
            signature: this.#signature,
            contextLabel: this.#config.contextLabel,
        };
    }
    return { ...this.#cachedLiveTrace };
}
```

Retorna uma cópia rasa (`{ ... }`) para evitar mutação externa do cache interno.

### `toMonetary(options?) → string`

Formata o resultado como moeda localizada. Usa a tabela de formatos de moeda:

```typescript
// src/output.ts:276-283
static readonly #currencyFormats: Record<string, { symbol: string; prefix: boolean; space: boolean }> = {
    BRL: { symbol: "R$",   prefix: true,  space: true  },
    USD: { symbol: "$",    prefix: true,  space: false },
    EUR: { symbol: "€",    prefix: false, space: true  },
    RUB: { symbol: "\u20BD", prefix: false, space: true },
    CNY: { symbol: "\u00A5", prefix: true,  space: false },
    JPY: { symbol: "\u00A5", prefix: true,  space: false },
};
```

A formatação numérica (separadores de milhar e decimal) é obtida do locale via `getLocale()` (`src/output_internal/i18n.ts`).

```typescript
// src/output.ts:249-274
private toMonetaryInternal(options?: OutputOptions): string {
    const p = this.getEffectivePrecision(options);
    const loc = getLocale(options?.locale);
    const currency = options?.currency ?? loc.currency;
    const val = this.toStringNumberInternal(options);
    const dot = val.indexOf(".");
    const intPart = dot === -1 ? val : val.slice(0, dot);
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, loc.thousandSeparator);
    const numberStr = fracPart ? grouped + loc.decimalSeparator + fracPart : grouped;
    const fmt = CalcAUYOutput.#getCurrencyFormat(currency);
    // ...
}
```

**Exemplos:**

| Locale | Moeda | Saída |
|--------|-------|-------|
| `pt-BR` | BRL | `R$ 1.225.000,00` |
| `en-US` | USD | `$1,225,000.00` |
| `fr-FR` | EUR | `1 225 000,00 €` |

### `toSlice(parts, options?) → string[]`

Divide o valor em `parts` iguais usando o **Método do Maior Resto** (Largest Remainder) para distribuir centavos residuais exatos. Delega a `performSlice()` em `src/output_internal/slicer.ts`.

```typescript
// src/output.ts:473-482
public toSlice(parts: number, options?: OutputOptions): string[];

private toSliceInternal(parts: number, options?: OutputOptions): string[] {
    const p = this.getEffectivePrecision(options);
    const totalCents = this.toScaledBigIntInternal(options);
    return performSlice(totalCents, parts, p);
}
```

**Exemplo:** `10.00` dividido em 3 partes → `["3.34", "3.33", "3.33"]`

### `toSliceByRatio(ratios, options?) → string[]`

Divide proporcionalmente com base em um array de razões (strings percentuais ou números). Delega a `performSliceByRatio()` em `src/output_internal/slicer.ts`.

```typescript
// src/output.ts:502-511
public toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[];

private toSliceByRatioInternal(ratios: (number | string)[], options?: OutputOptions): string[] {
    const p = this.getEffectivePrecision(options);
    const totalCents = this.toScaledBigIntInternal(options);
    return performSliceByRatio(totalCents, ratios, p);
}
```

**Exemplo:** `1000.00` com razões `["5%", "70%", "3.64%", "21.36%"]` → `["50.19", "702.53", "36.53", "210.75"]`

### `toJSON<T extends OutputKey>(outputs?, options?) → string`

Serializa múltiplos formatos de saída em um único objeto JSON. Aceita um array opcional de chaves `OutputKey` para selecionar quais formatos incluir. O padrão inclui: `toStringNumber`, `toScaledBigInt`, `toMonetary`, `toLaTeX`, `toUnicode`, `toVerbalA11y`, `toAuditTrace`.

```typescript
// src/output.ts:561-602
public toJSON<T extends OutputKey>(outputs?: T[], options?: OutputOptions): string;
```

Usa reflexão para chamar os métodos `*Internal` correspondentes, garantindo que não haja duplicação de spans de telemetria. `signature` e `contextLabel` são adicionados automaticamente ao resultado.

```typescript
// src/output.ts:584-594
const internalKey = `${key}Internal`;
const method = self[internalKey] || self[key];
if (typeof method === "function") {
    let val = method.call(this, options);
    res[key] = typeof val === "bigint" ? val.toString() : val;
}
res.signature = this.#signature;
res.contextLabel = this.#config.contextLabel;
```

### `toAuditTrace() → string`

Retorna o rastro de auditoria completo como uma string JSON assinada. Equivalente a `JSON.stringify(this.toLiveTrace())`.

```typescript
// src/output.ts:529-542
public toAuditTrace(): string;

private toAuditTraceInternal(): string {
    const cacheKey = "auditTrace";
    let trace = this.#outputCache.get(cacheKey) as string;
    if (trace === undefined) {
        trace = JSON.stringify(this.toLiveTraceInternal());
        this.#outputCache.set(cacheKey, trace);
    }
    return trace;
}
```

### `toCustomOutput<T>(processor, options?) → T`

Ponto de extensibilidade. Aceita um processador customizado (`CalcAUYCustomOutput`) que recebe um contexto completo e retorna qualquer tipo `T`. As referências dos métodos são pré-bound no `#cachedMethods` para evitar perda de `this`.

```typescript
// src/output.ts:626-663
public toCustomOutput<Toutput, Toptions extends OutputOptions = OutputOptions>(
    processor: CalcAUYCustomOutput<Toutput, Toptions>,
    options: Toptions = {} as Toptions,
): Toutput {
    if (!this.#cachedMethods) {
        this.#cachedMethods = Object.freeze({
            toStringNumber: this.toStringNumber.bind(this),
            toScaledBigInt: this.toScaledBigInt.bind(this),
            // ... todos os métodos públicos ...
        });
    }
    const context: CalcAUYCustomOutputContext<Toptions> = {
        result: this.#result,
        ast: this.#ast,
        roundStrategy: this.#roundStrategy,
        audit: {
            latex: this.toLaTeXInternal(options),
            unicode: this.toUnicodeInternal(options),
            verbal: this.toVerbalA11yInternal(options),
        },
        options,
        methods: this.#cachedMethods,
    };
    return processor.call(this, context);
}
```

## Tipos de Suporte

### `OutputOptions`

```typescript
// src/output_internal/types.ts:19-24
export type OutputOptions = {
    decimalPrecision?: number;
    locale?: CalcAUYLocale;
    currency?: CalcAUYCurrency;
    [key: string]: unknown;
};
```

Campos adicionais via `[key: string]: unknown` permitem que processadores customizados definam suas próprias opções sem modificar o tipo base.

### `OutputKey`

```typescript
// src/output.ts:29-40
export type OutputKey =
    | "toStringNumber"
    | "toScaledBigInt"
    | "toRawInternalNumber"
    | "toMonetary"
    | "toLaTeX"
    | "toUnicode"
    | "toMermaidGraph"
    | "toVerbalA11y"
    | "toSlice"
    | "toSliceByRatio"
    | "toAuditTrace";
```

Usado para restringir as chaves válidas no método `toJSON()`. `"toJSON"` e `"toCustomOutput"` são explicitamente ignorados no loop de reflexão:

```typescript
// src/output.ts:580
if (key === ("toJSON" as OutputKey) || key === ("toCustomOutput" as OutputKey)) continue;
```

## Mapa de Dependências

```mermaid
flowchart LR
    subgraph Métodos
        toString
        toScaled
        toRaw
        toLive
        toMonetary
        toSlice
        toSliceRatio
        toLaTeX
        toUnicode
        toMermaid
        toVerbal
        toAudit
        toJSON
        toCustom
    end

    subgraph Internos
        getRounded
        getEffectivePrecision
        rounding[applyRounding]
        render[renderAST]
        mermaid[renderMermaidSequence]
        slicer[performSlice / performSliceByRatio]
        i18n[getLocale]
    end

    toString --> getRounded --> rounding
    toLaTeX --> render
    toLaTeX --> getRounded
    toUnicode --> render
    toMermaid --> mermaid
    toVerbal --> render
    toVerbal --> i18n
    toMonetary --> i18n
    toMonetary --> getRounded
    toSlice --> slicer
    toSlice --> toScaled
    toSliceRatio --> slicer
```

## Referências

- Classe principal: `src/output.ts` (664 linhas)
- Tipos de saída: `src/output_internal/types.ts`
- Locales e internacionalização: `src/output_internal/i18n.ts`
- Algoritmos de fatiamento: `src/output_internal/slicer.ts`
- Renderizador de AST: `src/output_internal/renderer.ts`
- Renderizador Mermaid: `src/output_internal/mermaid_sequence_renderer.ts`
- Subscritos Unicode: `src/output_internal/unicode.ts`
- Arredondamento: `src/core/rounding.ts`
- Constantes: `src/core/constants.ts`

---

[↑ Voltar ao índice](../index.md)
