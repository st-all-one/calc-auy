# 01 — RationalNumber: A Unidade Básica de Precisão

```mermaid
flowchart LR
    In[Input: string | bigint | number | RationalNumber] --> Factory[from()]
    Factory --> CacheCheck{Cache Hit?}
    CacheCheck -->|Hot| HIT[Return cached (Map, strong ref)]
    CacheCheck -->|Cold| WEAK[WeakRef.deref()]
    WEAK -->|Alive| HIT
    WEAK -->|GC'd| NEW[new RationalNumber(n, d)]
    NEW --> Cache[Hot + Cold store]
```

## Representação Interna

`RationalNumber` armazena um par `BigInt(n) / BigInt(d)` sempre na forma irredutível. O MDC (GCD) é aplicado no construtor privado, garantindo que `n` e `d` sejam coprimos e que o denominador seja sempre positivo (normalização de sinal).

```typescript
// src/core/rational.ts:98-120
export class RationalNumber {
    readonly #n: bigint;
    readonly #d: bigint;

    private constructor(n: bigint, d: bigint) {
        if (d === 0n) {
            throw new CalcAUYError("division-by-zero",
                "O denominador não pode ser zero.");
        }
        let num = n, den = d;
        if (den < 0n) { num = -num; den = -den; }
        const common = gcd(num, den);
        this.#n = num / common;
        this.#d = den / common;
    }
}
```

## Factory `from()` com Cache Inteligente

O método `from()` (sobrecarregado: `from(n, d)` para BigInt explícito, `from(value)` para `RationalInput`) é o único ponto de criação. Ele orquestra a validação, normalização e o cache.

### Arquitetura de Cache (2 Níveis)

| Nível | Estrutura | Limite | Coleta |
|-------|-----------|--------|--------|
| **Hot Cache** | `Map<string \| bigint, RationalNumber>` | `HOT_CACHE_LIMIT = 512` | Referência forte; nunca GC'd |
| **Cold Cache** | `Map<string \| bigint, WeakRef<RationalNumber>>` | Ilimitado | `FinalizationRegistry` remove a chave quando o objeto é coletado |

```typescript
// src/core/rational.ts:19-38
const cacheRegistry = new FinalizationRegistry<string | bigint>((key) => {
    globalLiteralCache.delete(key);
});
const hotLiteralCache = new Map<string | bigint, RationalNumber>();
const globalLiteralCache = new Map<string | bigint, WeakRef<RationalNumber>>();
```

**Fluxo de cache para BigInt `value`:**

1. Se `\|value\| > 9999`: bypass total do cache — cria `new RationalNumber(value, 1n)` diretamente.
2. Hot cache: `hotLiteralCache.get(strVal)` — retorno O(1) se presente.
3. Cold cache: `globalLiteralCache.get(strVal)?.deref()` — se o WeakRef ainda estiver vivo, promove para hot cache (se hot < 512) e retorna.
4. Miss total: cria nova instância, registra em ambos os caches e no `FinalizationRegistry`.

```typescript
// src/core/rational.ts:163-189
if (typeof value === "bigint") {
    if (value > 9999n || value < -9999n) {
        return new RationalNumber(value, 1n);
    }
    const strVal = value.toString();
    const hotCached = hotLiteralCache.get(strVal);
    if (hotCached) { return hotCached; }
    const globalRef = globalLiteralCache.get(strVal);
    const globalCached = globalRef?.deref();
    if (globalCached) {
        if (hotLiteralCache.size < HOT_CACHE_LIMIT) { hotLiteralCache.set(strVal, globalCached); }
        return globalCached;
    }
    const res = new RationalNumber(value, 1n);
    if (hotLiteralCache.size < HOT_CACHE_LIMIT) { hotLiteralCache.set(strVal, res); }
    globalLiteralCache.set(strVal, new WeakRef(res));
    cacheRegistry.register(res, strVal);
    return res;
}
```

### Tratamento de `number` IEEE 754

`number` é convertido via `value.toString()` e delegado a `fromString()`. Valores não-finitos (`NaN`, `Infinity`) disparam `CalcAUYError("unsupported-type")`.

## Validação de Strings com Regex

```typescript
// src/core/rational.ts:41-43
const BIGINT_RE  = /^[+-]?\d+(?:_\d+)*n?$/;
const FRACTION_RE = /^[+-]?\d+(?:_\d+)*\/[+-]?\d+(?:_\d+)*$/;
const DECIMAL_RE  = /^[+-]?(?:\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?|\.\d+(?:_\d+)*)(?:[eE][+-]?\d+(?:_\d+)*)?$/;
```

| Regex | Exemplos válidos |
|-------|------------------|
| `BIGINT_RE` | `100`, `-50`, `1_000_000`, `100n` |
| `FRACTION_RE` | `3/4`, `-22/7`, `1_000/3` |
| `DECIMAL_RE` | `1.5`, `.5`, `-0.0001`, `1e-3`, `6.022e23` |

### `fromString()` — Decodificador Universal

```typescript
// src/core/rational.ts:205-282
private static fromString(input: string): RationalNumber {
    const trimmed = input.trim();
    // ...cache check...
    const isBigInt   = BIGINT_RE.test(trimmed);
    const isFraction = FRACTION_RE.test(trimmed);
    const isPercent  = trimmed.endsWith("%");
    const valToTest  = isPercent ? trimmed.slice(0, -1) : trimmed;
    const isDecimal  = DECIMAL_RE.test(valToTest);
    if (!isBigInt && !isFraction && !isDecimal) {
        throw new CalcAUYError("invalid-syntax", ...);
    }
    const clean = valToTest.replaceAll("_", "");
    let result: RationalNumber;
    if (isFraction) {
        const [nStr, dStr] = clean.split("/");
        result = new RationalNumber(BigInt(nStr), BigInt(dStr));
    } else if (isBigInt) {
        const val = clean.endsWith("n") ? clean.slice(0, -1) : clean;
        result = new RationalNumber(BigInt(val), 1n);
    } else {
        // Decimal / Scientific
        const lower = clean.toLowerCase();
        const parts = lower.split("e");
        const baseStr = parts[0];
        const scientificExp = parts.length > 1 ? Number.parseInt(parts[1]) : 0;
        const dotIndex = baseStr.indexOf(".");
        let n: bigint, d: bigint;
        if (dotIndex === -1) { n = BigInt(baseStr); d = 1n; }
        else {
            n = BigInt(baseStr.replace(".", ""));
            d = 10n ** BigInt(baseStr.length - dotIndex - 1);
        }
        if (scientificExp >= 0) n *= 10n ** BigInt(scientificExp);
        else d *= 10n ** BigInt(-scientificExp);
        result = new RationalNumber(n, d);
    }
    if (isPercent) result = result.div(RationalNumber.from(100n));
    // ...cache store...
    return result;
}
```

Percentuais (`10%`, `1.5%`) primeiro convertem o valor numérico e depois dividem por 100 via `result.div(RationalNumber.from(100n))`.

## Operações Aritméticas

Todas as operações seguem o padrão de **imutabilidade**: cada método retorna um novo `RationalNumber`. A simplificação via GCD ocorre no construtor.

| Operação | Fórmula | Código |
|----------|---------|--------|
| `add` | `a/b + c/d = (ad + bc) / bd` | `this.#n * other.#d + other.#n * this.#d` |
| `sub` | `a/b - c/d = (ad - bc) / bd` | `this.#n * other.#d - other.#n * this.#d` |
| `mul` | `a/b × c/d = ac / bd` | `this.#n * other.#n / this.#d * other.#d` |
| `div` | `a/b ÷ c/d = ad / bc` | `this.#n * other.#d / this.#d * other.#n` |
| `mod` | `(a*d) % (b*c) / (b*d)` | `(this.#n * other.#d) % (this.#d * other.#n)` |
| `divInt` | `((a*d) - ((a*d) % (b*c))) / (b*d)` | Quociente inteiro da divisão |

```typescript
// src/core/rational.ts:284-309
public add(other: RationalNumber): RationalNumber {
    const n = this.#n * other.#d + other.#n * this.#d;
    const d = this.#d * other.#d;
    RationalNumber.checkSafety(n, d);
    return new RationalNumber(n, d);
}
```

### `pow()` — Potenciação com Expoente Racional

Três regimes:

1. **Expoente inteiro positivo** (`d === 1n, n > 0`): `BigInt ** BigInt` direto. Antes estima bits via hexadecimal para prevenção de overflow.

2. **Expoente inteiro negativo** (`d === 1n, n < 0`): inverte a base e aplica `**` com `-exponent.#n`.

3. **Expoente fracionário** (`d > 1n`): decompõe em parte inteira `I` e resto fracionário `m/d`. Aplica Newton nth root (`bigIntNthRoot`) para `d ≤ 1000` ou `bigIntPowFractional` (bit-by-bit com 256 iterações de bissecção) para `d > 1000`.

```typescript
// src/core/rational.ts:312-377
public pow(exponent: RationalNumber): RationalNumber {
    if (this.#n === 0n) { /* zero base cases */ }
    if (exponent.#d === 1n) { /* integer exponent */ }
    // Fractional: I + m/d
    const I = exponent.#n / exponent.#d;
    const remainderN = exponent.#n % exponent.#d;
    let result = RationalNumber.from(1n);
    if (I !== 0n) result = this.pow(RationalNumber.from(I));
    if (remainderN === 0n) return result;
    if (d <= 1000n) {
        const p = PRECISION_BIGINT;
        const rootN = RationalNumber.bigIntNthRoot(base.#n ** m * scale, d);
        const rootD = RationalNumber.bigIntNthRoot(base.#d ** m * scale, d);
    } else {
        fractionalResult = RationalNumber.bigIntPowFractional(base, m, d, PRECISION_BIGINT);
    }
    return result.mul(fractionalResult);
}
```

#### `bigIntNthRoot` — Método de Newton Adaptativo

```typescript
// src/core/rational.ts:437-461
private static bigIntNthRoot(value: bigint, n: bigint): bigint {
    // ...fast-paths: 0, 1, n === 1...
    let x = 1n << (BigInt(value.toString(2).length) / n + 1n);
    let prevX = 0n;
    const nm1 = n - 1n;
    while (x !== prevX && x !== prevX + 1n && x !== prevX - 1n) {
        prevX = x;
        x = (nm1 * x + value / (x ** nm1)) / n;
    }
    // Correção monotônica
    while (x ** n > value) x -= 1n;
    while ((x + 1n) ** n <= value) x += 1n;
    return x;
}
```

## Segurança: `checkSafety()`

Toda operação aritmética chama `checkSafety(n, d)` antes de construir o resultado. O limite de 1 milhão de bits (`MAX_BI_BITS = 1_000_000n`) é verificado comparando `absN > MAX_BI_LIMIT` (onde `MAX_BI_LIMIT = 1n << MAX_BI_BITS`).

```typescript
// src/core/rational.ts:136-147
private static checkSafety(n: bigint, d: bigint): void {
    const absN = n < 0n ? -n : n;
    const absD = d < 0n ? -d : d;
    if (absN > MAX_BI_LIMIT || absD > MAX_BI_LIMIT) {
        throw new CalcAUYError("math-overflow",
            `O resultado excede o limite de ${MAX_BI_BITS} bits.`);
    }
}
```

## Comparação

```typescript
// src/core/rational.ts:406-414
public equals(other: RationalNumber): boolean {
    return this.#n === other.#n && this.#d === other.#d;
}

public compare(other: RationalNumber): number {
    const diff = this.sub(other);
    if (diff.#n === 0n) return 0;
    return diff.#n > 0n ? 1 : -1;
}
```

`equals()` é uma comparação por referência das frações simplificadas — já que toda operação produz frações irredutíveis, `n1 === n2 && d1 === d2` é suficiente.

## Saída Decimal

```typescript
// src/core/rational.ts:416-431
public toDecimalString(precision: number): string {
    const p = BigInt(precision);
    const scale = 10n ** p;
    const scaled = (this.#n * scale) / this.#d;
    let s = scaled.toString();
    const negative = s.startsWith("-");
    if (negative) s = s.substring(1);
    if (precision === 0) return (negative ? "-" : "") + s;
    s = s.padStart(precision + 1, "0");
    const insertAt = s.length - precision;
    return (negative ? "-" : "") + s.substring(0, insertAt) + "." + s.substring(insertAt);
}
```

## Serialização

```typescript
public toJSON(): { n: string; d: string } {
    return { n: this.#n.toString(), d: this.#d.toString() };
}
```

## Algoritmo GCD Híbrido

Combina fast-paths para números triviais com o algoritmo de Euclides (`%` nativo do V8).

```typescript
// src/core/rational.ts:53-79
function gcd(a: bigint, b: bigint): bigint {
    let u = a < 0n ? -a : a;
    let v = b < 0n ? -b : b;
    if (u === 0n) return v;
    if (v === 0n) return u;
    if (u === 1n || v === 1n) return 1n;
    if (u === v) return u;
    if (u === 2n && (v & 1n) === 0n) return 2n;
    if (v === 2n && (u & 1n) === 0n) return 2n;
    while (v !== 0n) {
        u %= v;
        const t = u; u = v; v = t;
    }
    return u;
}
```

**Fast-paths em ordem:**
1. Zero: retorna o outro operando
2. Unidade (`1n`): GCD é sempre 1
3. Igualdade: retorna o próprio valor
4. Pequenos pares (`2n`): atalho para números pares, comum em dízimas
5. Euclides puro com `%` nativo: O(log n)

## Constantes Relacionadas

Definidas em `src/core/constants.ts`:

| Constante | Valor | Propósito |
|-----------|-------|-----------|
| `PRECISION_BIGINT` | `50n` | Precisão interna para raízes fracionárias |
| `SCALE_BIGINT` | `10n ** 50n` | Escala derivada de `PRECISION_BIGINT` |
| `MAX_BI_BITS` | `1_000_000n` | Teto de segurança (bits) |
| `MAX_BI_LIMIT` | `1n << MAX_BI_BITS` | Limite numérico correspondente |
| `HOT_CACHE_LIMIT` | `512` | Tamanho máximo do hot cache |

## Diagrama de Fluxo Completo

```mermaid
flowchart TD
    A[RationalInput] --> B{typeof}
    B -->|"string"| C["fromString()"]
    B -->|"bigint"| D{> 9999?}
    D -->|Sim| E[new RationalNumber(n,1)]
    D -->|Não| F[Cache Lookup]
    B -->|"number"| G["toString() → fromString()"]
    B -->|"RationalNumber"| H[return as-is]
    C --> I{Regex match?}
    I -->|"bigint"| J[BigInt parse]
    I -->|"fraction"| K["split('/') → BigInt"]
    I -->|"decimal"| L["BigInt + 10^n"]
    I -->|"percent"| M["parse → div(100)"]
    I -->|"scientific"| N["base * 10^exp"]
    J & K & L & M & N --> O[new RationalNumber]
    O --> P[GCD simplification]
    P --> Q[Cache store]
    Q --> R[Return]
```

## Referências

- Implementação: `src/core/rational.ts`
- Constantes e limites: `src/core/constants.ts`
- Sistema de erros: `src/core/errors.ts`

---

[↑ Voltar ao índice](../index.md)
