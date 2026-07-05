# 06 - Táticas de Implementação e Segurança

```mermaid
flowchart TD
    subgraph InstanceA [Instance 1]
        V1["#ast (Root)"]
    end
    
    InstanceA --> Op["op: .add(5)"]
    Op --> InstanceB [Instance 2]
    
    subgraph InstanceB
        V2["#ast (New Root)"]
    end
    
    style V1 fill:#f8bbd0,stroke:#880e4f
    style V2 fill:#c8e6c9,stroke:#2e7d32
```

## Objetivo
Garantir a integridade da biblioteca através de padrões de codificação rigorosos, aproveitando os recursos modernos do TypeScript e JavaScript para proteger o estado interno e manter o código manutenível na CalcAUY.

## Restrições de Runtime (Hard Privacy)
A CalcAUY utiliza obrigatoriamente campos privados reais do JavaScript (`#`) em substituição ao modificador `private` convencional do TypeScript para todos os membros internos críticos. Diferente do `private` do TS que é apenas uma verificação em tempo de compilação, `#` garante isolamento verdadeiro em runtime (nem mesmo `Object.getOwnPropertyNames()` ou reflexão conseguem acessar).

- **Campos do Motor:** `CalcAUYLogic` (`src/builder.ts:72-76`) declara:
    ```ts
    readonly #ast: CalculationNode | null;
    readonly #instanceId: symbol;
    readonly #config: Required<InstanceConfig>;
    readonly #birthTime: string | null;
    readonly #metadataSize: number;
    ```
- **Campos de Output:** `CalcAUYOutput` (`src/output.ts:52-61`) utiliza:
    ```ts
    readonly #result: RationalNumber;
    readonly #ast: CalculationNode;
    readonly #roundStrategy: RoundingStrategy;
    readonly #signature: string;
    readonly #config: Required<InstanceConfig>;
    readonly #cache: Map<number, RationalNumber>;
    readonly #outputCache: Map<string, string | Uint8Array>;
    ```
- **Membros Estáticos:** Caches globais (como o de formatadores de moeda e CSS do KaTeX) e utilitários como o `TextEncoder` também devem ser privados nativos (`static #`).

## Imutabilidade por Padrão
Nenhuma instância de `CalcAUYLogic` ou `RationalNumber` deve permitir alterações em seu estado após a criação.
- **Factory Methods:** Utilizar o padrão de métodos estáticos de fábrica (`RationalNumber.from()`) para instanciar objetos. O construtor deve ser `private`.
- **Campos `readonly`:** Todos os campos privados são marcados como `readonly` (`src/builder.ts:72-76`, `src/output.ts:52-61`), garantindo imutabilidade em nível de tipo.
- **GCD na Construção:** `RationalNumber` simplifica automaticamente numerador/denominador via MDC (GCD) no momento da construção (`src/core/rational.ts`), garantindo que o estado interno seja sempre a fração irredutível.
- **Clonagem Estrutural:** Ao realizar uma operação (`add`, `mult`, etc.), uma nova instância de `CalcAUYLogic` é retornada contendo a nova AST expandida. As operações em `src/builder.ts` (ex: `add()`, `mult()`, `sub()`) seguem o padrão:
    ```ts
    return new CalcAUYLogic<Context, Config>(newAST, this.#instanceId, this.#config, this.#birthTime);
    ```

## Gerenciamento de Dependências
A biblioteca deve manter-se ultra-leve. As dependências declaradas em `deno.jsonc:47-50` são:

| Dependência | Versão | Finalidade |
|-------------|--------|------------|
| `@logtape/logtape` | `^2.0.5` | Auditoria de telemetria estruturada |
| `@std/crypto` | `^1.0.5` | Assinatura digital BLAKE3 (`src/utils/security.ts:9`) |
| `@std/encoding` | `^1.0.10` | Codificadores HEX, Base64, Base32, Base58 (`src/utils/security.ts:10-13`) |
| `@std/uuid` | `^1.1.1` | Geração de UUID v7 para rastreamento de erros (`src/core/errors.ts:9`) |

**Apenas 4 dependências diretas**, todas da biblioteca padrão do Deno (`@std/`) mais LogTape. Sem dependências de terceiros pesadas.

- **Inversão de Dependência:** O KaTeX e outros renderizadores externos devem ser injetados ou configurados como plugins, evitando que a CalcAUY os tenha em seu `deno.jsonc` como dependências diretas pesadas.

## Rigor de Tipagem
- **Modo Estrito do TypeScript:** O `deno.jsonc:37-42` configura:
    ```jsonc
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true
    }
    ```
- **`verbatim-module-syntax`:** Habilitado nas regras de lint (`deno.jsonc:100`). Todo `import type` deve ser explícito para tipos — nunca usado como value. Exemplo em `src/ast/engine.ts:9`: `import type { CalculationNode, OperationType } from "./types.ts"`.
- **Explicit Return Types:** Regras de lint `explicit-function-return-type` e `explicit-module-boundary-types` (`deno.jsonc:80-81`) exigem anotação explícita de retorno em toda função/método.
- **No Non-Null Assertion:** A regra `no-non-null-assertion` (`deno.jsonc:91`) proíbe `!` — exceções raras documentadas com `deno-lint-ignore` (ex: `src/ast/engine.ts:65`).
- **Branded Types:** Se possível, utilizar "Branded Types" para distinguir entre diferentes unidades de medida ou tipos de números se o projeto crescer (ex: `CurrencyAmount`, `UnitValue`).
- **No Any:** O uso de `any` é terminantemente proibido. Devem ser utilizadas interfaces genéricas ou uniões de tipos literais.
- **Checklists de A11y:** Durante a implementação, seguir as diretrizes de acessibilidade matemática definidas em `.agents/guidelines/`.

## Estratégia de Cache com `FinalizationRegistry`

O cache global de nós literais (`globalLiteralNodeCache`) em `src/builder.ts:55` utiliza `Map<string, WeakRef<LiteralNode>>` para permitir coleta automática pelo GC:

```ts
const globalLiteralNodeCache = new Map<string, WeakRef<LiteralNode>>();
```

Um `FinalizationRegistry` (`src/builder.ts:39-41`) é registrado para cada nó inserido no cache:

```ts
const astCacheRegistry = new FinalizationRegistry<string>((key) => {
    globalLiteralNodeCache.delete(key);
});
```

### Funcionamento
1. **Hot Cache** (`src/builder.ts:46`): `Map<string, LiteralNode>` com limite de 512 entradas mantém referências fortes para itens de alta frequência.
2. **Cold Cache** (`src/builder.ts:55`): `Map<string, WeakRef<LiteralNode>>` armazena referências fracas. Quando o GC coleta um `LiteralNode`, o `FinalizationRegistry` dispara o callback que remove a chave correspondente do cache, evitando vazamento de memória.
3. **Consulta:** O builder busca primeiro no hot cache; se não encontrado, tenta o cold cache (`deref()`) e promove para hot cache se ainda vivo.

---

[↑ Voltar ao índice](../index.md)
