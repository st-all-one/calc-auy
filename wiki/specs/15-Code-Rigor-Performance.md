# 15 - Rigor de Código e Performance

```mermaid
flowchart LR
    P1[Instance Caching] --- P2[GCD Híbrido]
    P2 --- P3[Hard Privacy]
```

## 1. Rigor de Tipagem (TypeScript Strict)

O projeto opera em modo **Strict Máximo**. As opções do compilador estão em `deno.jsonc:35-43`:

```jsonc
"compilerOptions": {
    "lib": ["dom", "dom.iterable", "dom.asynciterable", "deno.ns"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
}
```

Regras obrigatórias:
- **`strict: true`**: Habilita todo o pacote strict do TypeScript (inclui `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, etc.).
- **`noImplicitAny: true`**: Proibido o uso de tipos implícitos `any`. Cada valor deve ter uma definição clara.
- **`strictNullChecks: true`**: Garantia de que `null` e `undefined` sejam tratados explicitamente, eliminando erros de "null pointer".
- **`noUnusedLocals: true`** e **`noUnusedParameters: true`**: Previnem variáveis e parâmetros não utilizados que poderiam indicar bugs lógicos.
- **`exactOptionalPropertyTypes: true`**: Propriedades opcionais só aceitam `undefined` como ausência de valor, prevenindo atribuições acidentais de tipos incompatíveis.

### Tipos Explícitos em Toda Função

As regras de lint em `deno.jsonc:73-102` incluem:

```jsonc
"include": [
    "explicit-function-return-type",
    "explicit-module-boundary-types",
    "verbatim-module-syntax",
    ...
]
```

- **`explicit-function-return-type`**: Todas as funções (especialmente as públicas) **devem** declarar seu tipo de retorno explicitamente. Exemplo em `src/core/rational.ts:284`:
```ts
public add(other: RationalNumber): RationalNumber { ... }
```

- **`explicit-module-boundary-types`**: Exportações de módulos devem ter tipos claros para facilitar o consumo por terceiros e a geração de documentação.

- **`verbatim-module-syntax`**: Garante que os imports/exports sejam compatíveis com sistemas de módulos modernos e ESM puro. Exige `import type` para tipos:
```ts
import type { CalculationNode, RationalValue, SerializedCalculation } from "./ast/types.ts";
import { RationalNumber } from "./core/rational.ts";
```

## 2. Padrões de Qualidade e Segurança (Lint)

O linter está configurado para prevenir padrões de código perigosos ou ambíguos. Regras completas em `deno.jsonc:75-102`:

| Regra | Propósito | Exemplo de Violação |
| :--- | :--- | :--- |
| `no-eval` | Proibição de `eval()` | `eval("...")` |
| `no-console` | Proibição de `console.log` | `console.log(...)` |
| `eqeqeq` | Igualdade estrita obrigatória | `x == y` (deve ser `x === y`) |
| `no-throw-literal` | Proibido lançar literais | `throw "erro"` (deve ser `throw new Error(...)`) |
| `no-non-null-assertion` | Proibido `!` pós-fixo | `x!.foo` |
| `no-non-null-asserted-optional-chain` | Proibido `!` em optional chain | `x?.y!.z` |
| `no-boolean-literal-for-arguments` | Proibido boolean literal como argumento | `fn(true)` (deve ser nomeado) |
| `no-await-in-loop` | Proibido `await` dentro de loops | `for (...) { await ... }` |
| `no-sync-fn-in-async-fn` | Proibido sync dentro de async | `async fn() { Deno.readFileSync(...) }` |
| `no-inferrable-types` | Proibido tipos inferíveis redundantes | `const x: number = 5` |
| `single-var-declarator` | Uma declaração por `const`/`let` | `const a = 1, b = 2` |
| `default-param-last` | Parâmetros com default por último | `fn(a = 1, b)` |

**Importante sobre logs:** A regra `no-console` proíbe `console.log` — o rastro de execução deve ser feito via **LogTape 2.0** (`src/utils/logger.ts`), que oferece níveis estruturados (debug, info, error) e sanitização automática de PII.

## 3. Performance e Compatibilidade de Runtime

### Portabilidade Browser/Front-end
- **Libs Disponíveis:** O projeto inclui `dom`, `dom.iterable` e `dom.asynciterable` nas `compilerOptions`. Isso garante que a CalcAUY possa manipular estruturas necessárias para renderização de imagem/HTML e funcionar perfeitamente em navegadores modernos.
- **Agnosticismo de IO:** O core da biblioteca não deve depender de APIs específicas de sistema operacional (como `Deno.readFile` ou `fs.readFileSync`) para manter sua natureza "run-anywhere".

### Otimização de Performance Extrema

#### 1. Sistema de Cache em Dois Níveis

Implementado tanto para `RationalNumber` (`src/core/rational.ts:29-38`) quanto para `LiteralNode` (`src/builder.ts:46-55`):

```ts
// Hot Cache (src/builder.ts)
const hotLiteralNodeCache = new Map<string, LiteralNode>();
const HOT_CACHE_LIMIT = 512;

// Cold Cache com WeakRef (src/builder.ts)
const globalLiteralNodeCache = new Map<string, WeakRef<LiteralNode>>();
const astCacheRegistry = new FinalizationRegistry<string>((key) => {
    globalLiteralNodeCache.delete(key);
});
```

- **Hot Cache:** Referências fortes garantem acesso O(1) sem overhead para valores de alta frequência (limite de 512 itens, constante `HOT_CACHE_LIMIT` em `src/core/constants.ts:41`).
- **Global WeakRef Cache:** Utiliza `WeakRef` para permitir que o GC limpe objetos órfãos e `FinalizationRegistry` para remover chaves do cache global automaticamente quando o `RationalNumber` ou `LiteralNode` é coletado.

Fluxo de acesso no `RationalNumber.from()` (`src/core/rational.ts:170-188`):

```ts
// Prioridade 1: Hot Cache (Strong References)
const hotCached = hotLiteralCache.get(strVal);
if (hotCached) { return hotCached; }

// Prioridade 2: Cold Cache (WeakRef)
const globalRef = globalLiteralCache.get(strVal);
const globalCached = globalRef?.deref();
if (globalCached) {
    if (hotLiteralCache.size < HOT_CACHE_LIMIT) { hotLiteralCache.set(strVal, globalCached); }
    return globalCached;  // Promove para hot cache
}
```

#### 2. Hierarchical Flattening (O(log N))

O método `attachOp` em `src/ast/builder_utils.ts` reorganiza automaticamente a AST quando um nó de operação atinge **100 operandos** (`MAX_OPERANDS` em `src/core/constants.ts:60`), criando uma nova camada. Isso evita o custo O(N²) de cópias de arrays massivos e previne `Stack Overflow`:

```ts
export const MAX_OPERANDS = 100;
```

#### 3. Otimização de Clonagem (Shallow Copy)

Em operações que exigem o retorno ou modificação da raiz da árvore (ex: `hibernate`, `commit`, `toLiveTrace`), a biblioteca utiliza *shallow copy* do nó raiz em vez de `structuredClone`.
Como os nós são imutáveis por contrato, o reuso das referências dos sub-nós é seguro e elimina a latência recursiva em árvores profundas.

#### 4. GCD Híbrido

Substituição do algoritmo de Euclides puro por uma abordagem híbrida em `src/core/rational.ts:53-79` que utiliza o operador `%` nativo do V8 (C++) e fast-paths para números pequenos:

```ts
function gcd(a: bigint, b: bigint): bigint {
    let u = a < 0n ? -a : a;
    let v = b < 0n ? -b : b;

    // 1. Fast-paths de Unidade e Zero (O(1))
    if (u === 0n) { return v; }
    if (v === 0n) { return u; }
    if (u === 1n || v === 1n) { return 1n; }
    if (u === v) { return u; }

    // 2. Atalho para números pares pequenos (comum em dízimas)
    if (u === 2n && (v & 1n) === 0n) { return 2n; }
    if (v === 2n && (u & 1n) === 0n) { return 2n; }

    // 3. Algoritmo de Euclides com operador nativo % (O(log n))
    while (v !== 0n) {
        u %= v;
        const t = u;
        u = v;
        v = t;
    }
    return u;
}
```

Fast-paths específicos:
- `u === 0n || v === 0n` → retorna o outro
- `u === 1n || v === 1n` → GCD = 1
- `u === v` → GCD = u
- `u === 2n` e `v` par → GCD = 2 (comum em dízimas periódicas)

#### 5. Late Rounding (Arredondamento Tardio)

A precisão interna é de 50 casas decimais (`PRECISION_BIGINT = 50n` em `src/core/constants.ts:12`):

```ts
export const PRECISION_BIGINT = 50n;
export const SCALE_BIGINT = 10n ** PRECISION_BIGINT;
```

O arredondamento só ocorre **no momento da saída** (`CalcAUYOutput.getRounded()`), nunca durante o `commit()`. Isso garante:
- Máxima fidelidade durante cadeias de cálculo complexas
- Possibilidade de aplicar diferentes estratégias de arredondamento ao mesmo resultado
- Cache dos valores arredondados por precisão (`src/output.ts:57`)

#### 6. Hard Privacy (#)

Uso de campos privados nativos (`#`) reduz a superfície de ataque e melhora a performance de acesso interno em relação a fechamentos (closures):

```ts
// src/core/rational.ts:99-100
readonly #n: bigint;
readonly #d: bigint;

// src/builder.ts:72-76
readonly #ast: CalculationNode | null;
readonly #instanceId: symbol;
readonly #config: Required<InstanceConfig>;
```

Benefícios:
- Verdadeira privacidade em tempo de compilação e runtime (não acessível via `Object.keys()` ou `Proxy`)
- Sem overhead de closure (cada método compartilha o mesmo prototype)
- Melhor otimização do V8 (hidden classes mais previsíveis)

#### 7. Safety Ceiling de 1M Bits

Para prevenir ataques de DoS por estouro de memória, toda operação matemática passa por `checkSafety()` (`src/core/rational.ts:136-147`):

```ts
const MAX_BI_BITS = 1_000_000n;
const MAX_BI_LIMIT = 1n << MAX_BI_BITS;

private static checkSafety(n: bigint, d: bigint): void {
    const absN = n < 0n ? -n : n;
    const absD = d < 0n ? -d : d;
    if (absN > MAX_BI_LIMIT || absD > MAX_BI_LIMIT) {
        throw new CalcAUYError("math-overflow",
            `O resultado da operação excede o limite de segurança de ${MAX_BI_BITS} bits.`);
    }
}
```

A comparação é feita com operador `>` nativo de BigInt (milhares de vezes mais rápido que `toString(2).length`).

## 4. Governança de Testes e Cobertura

- **Padrão BDD:** Uso obrigatório de `@std/testing` e `@std/assert`.
- **Cobertura (Coverage):** O objetivo é manter a cobertura de código o mais próximo possível de 100%. Testes de mutação ou casos de borda (edge cases) matemáticos são prioridade.
- **Relatórios:** Cobertura deve ser gerada via `deno task coverage` para auditoria de CI/CD.

### Comandos do Projeto

Definidos em `deno.jsonc:25-32`:

```jsonc
"tasks": {
    "fmt": "deno fmt --config=deno.jsonc ./src ./tests ./deno.jsonc",
    "lint": "deno lint --config=deno.jsonc ./src",
    "test": "deno test --allow-all tests/",
    "test:stress": "deno test --allow-all tests/stress/",
    "coverage": "deno task test --reporter=dot --coverage=./coverage"
}
```

## 5. Formatação Identitária

O código deve seguir rigorosamente o `deno fmt` configurado em `deno.jsonc:57-72`:

```jsonc
"fmt": {
    "bracePosition": "sameLine",
    "nextControlFlowPosition": "sameLine",
    "operatorPosition": "nextLine",
    "lineWidth": 120,
    "indentWidth": 4,
    "useTabs": false,
    "semiColons": true,
    "singleQuote": false,
    "proseWrap": "preserve",
    "newLineKind": "lf"
}
```

- **Largura de Linha:** 120 caracteres.
- **Indentação:** 4 espaços (não tabs).
- **Semicolons:** Obrigatórios (`"semiColons": true`).
- **Braces:** Sempre na mesma linha (`sameLine`).
- **Operadores:** Na próxima linha (`nextLine`).
- **Quebra de linha:** LF (Unix).

---

[↑ Voltar ao índice](../index.md)
