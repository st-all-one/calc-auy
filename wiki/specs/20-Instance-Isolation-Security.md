# 20 - Controle e Segurança de Instâncias (Jurisdição)

## Factory Pattern: `CalcAUY.create()`

A entrada única para o sistema é o método estático `CalcAUY.create()` em `src/main.ts:41-59`. Toda instância nasce com:

1. **Validação do `contextLabel`**: lança `CalcAUYError("invalid-syntax")` se vazio ou não-string.
2. **Merge com defaults**: `DEFAULT_INSTANCE_CONFIG` (`src/utils/sanitizer.ts:26-33`) sobreposto pelo config fornecido.
3. **Identidade simbólica**: `Symbol(fullConfig.contextLabel)` — único por invocação.
4. **Retorno**: `new CalcAUYLogic<Context, Config>(null, instanceId, fullConfig, null)`.

```typescript
// src/main.ts:41-59
public static create<const T extends InstanceConfig & { contextLabel: string }>(
    config: T,
): CalcAUYLogic<T["contextLabel"], T> {
    if (!config || typeof config.contextLabel !== "string" || config.contextLabel.trim() === "") {
        throw new CalcAUYError(
            "invalid-syntax",
            "The 'contextLabel' parameter is required and must be a non-empty string to create an instance.",
        );
    }
    const fullConfig: Required<InstanceConfig> = {
        ...DEFAULT_INSTANCE_CONFIG,
        ...config,
    };
    const instanceId = Symbol(fullConfig.contextLabel);
    return new CalcAUYLogic<T["contextLabel"], T>(null, instanceId, fullConfig, null);
}
```

### `DEFAULT_INSTANCE_CONFIG` (`src/utils/sanitizer.ts`)

```typescript
export const DEFAULT_INSTANCE_CONFIG: Required<InstanceConfig> = {
    sensitive: true,
    salt: "",
    encoder: "HEX",
    contextLabel: "",
    roundStrategy: "NBR5891",
    [BIRTH_TICKET_MOCK]: "",
};
```

### `InstanceConfig` (`src/core/types.ts:16-42`)

```typescript
export type InstanceConfig = {
    sensitive?: boolean;
    salt?: string;
    encoder?: SignatureEncoder;
    contextLabel?: string;
    roundStrategy?: RoundingStrategy;
    [BIRTH_TICKET_MOCK]?: string;
};
```

O campo `[BIRTH_TICKET_MOCK]` é um símbolo `unique symbol` definido em `src/core/constants.ts:35`, usado exclusivamente para injeção de timestamps determinísticos em testes.

## Camada Dupla de Identidade

### Runtime: `#instanceId: Symbol`

Cada `CalcAUYLogic` carrega um campo privado `#instanceId: symbol` (`src/builder.ts:73`). Todo método aritmético (`op()`, `add()`, `sub()`, `mult()`, etc.) chama `validateInstance(other)`:

```typescript
// src/builder.ts:736-747
private validateInstance(other: CalcAUYLogic<string, InstanceConfig>): void {
    if (other.#instanceId !== this.#instanceId) {
        throw new CalcAUYError(
            "instance-mismatch",
            `Attempted to mix instances from different contexts. Use 'fromExternalInstance' for cross-context integration.`,
            {
                currentContext: this.#config.contextLabel,
                otherContext: other.#config.contextLabel,
            },
        );
    }
}
```

A comparação é por referência do `Symbol` — dois `Symbol("foo")` são **sempre diferentes**. Isso significa que mesmo duas chamadas `CalcAUY.create({ contextLabel: "foo" })` produzem instâncias isoladas.

### Compile-Time: Tipos Genéricos Branded

```typescript
// src/builder.ts:71-82
export class CalcAUYLogic<Context extends string, Config extends InstanceConfig = InstanceConfig> {
    readonly #__context!: Context;    // @ts-ignore: Branding field
    readonly #__config_brand!: Config; // @ts-ignore: Branding field
```

Os campos `#__context` e `#__config_brand` são **fantasmas** (nunca atribuídos). Eles existem apenas para o sistema de tipos: o TypeScript os usa para rastrear o `Context` literal e o `Config` exato, impedindo que operandos de `contextLabel` ou `salt` diferentes sejam combinados em tempo de compilação.

## Barreira Cross-Context

### Bloqueio: Operações Diretas

Qualquer tentativa de `instanciaA.add(instanciaB)` onde `instanciaB` tem `Symbol` diferente dispara:

```
CalcAUYError: instance-mismatch (HTTP 403)
Detail: "Attempted to mix instances from different contexts."
```

### Portão Legítimo: `fromExternalInstance()`

Em `src/builder.ts:489-555`, o método `fromExternalInstance()` implementa a única via oficial para integração entre jurisdições:

1. Se o argumento for `CalcAUYLogic` vivo, chama `hibernate()` nele primeiro — produz um snapshot assinado.
2. Valida a assinatura BLAKE3 contra o salt da instância de origem (se for objeto serializado).
3. Envolve o AST externo em um `ControlNode` com `type: "reanimation_event"`.
4. Envolve o `ControlNode` em um `GroupNode`.
5. Retorna o grupo como operando no contexto atual.

```typescript
// src/builder.ts:531-548
const controlNode: ControlNode = {
    kind: "control",
    type: "reanimation_event",
    metadata: {
        previousContextLabel: externalContextLabel,
        previousSignature: externalSignature,
        previousRoundStrategy: externalStrategy,
    },
    child: externalAST,
};
const group: GroupNode = { kind: "group", child: controlNode };
return new CalcAUYLogic<Context, Config>(group, this.#instanceId, this.#config, birth);
```

### Metadados de `ControlNode`

Todo `ControlNode` carrega no `metadata`:

| Campo | Origem | Finalidade |
|-------|--------|------------|
| `previousContextLabel` | Config da origem | Rastreio de jurisdição |
| `previousSignature` | BLAKE3 da hibernação | Prova de integridade |
| `previousRoundStrategy` | Config da origem | Garantia de consistência |
| `timestamp` (herdado) | `birthTime` da origem | Timeline forense |

O `timestamp` é extraído do `ast.metadata.timestamp` original do nó raiz da origem durante a hibernação (`src/builder.ts:342`). Isso permite reconstruir a linha do tempo mesmo após múltiplas reanimações.

### Hidratação com `hydrate()`

O método `hydrate()` (`src/builder.ts:307-365`) segue a mesma lógica: valida assinatura → cria `ControlNode` com `type: "reanimation_event"` → agrupa em `GroupNode`. A diferença é que `hydrate()` opera no **mesmo** contexto (mesmo `#instanceId`), enquanto `fromExternalInstance()` pode receber de outro contexto.

## Matriz de Segurança

| Cenário | Runtime | Compile-time |
|---------|---------|--------------|
| Mesma instância (`instA.add(instA)`) | ✅ | ✅ |
| Mesmo `label`, instâncias diferentes | ❌ `instance-mismatch` | ✅ (mesmo `Context`) |
| Labels diferentes | ❌ `instance-mismatch` | ❌ type error |
| Configs diferentes (`salt`/`roundStrategy`) | ❌ | ❌ type error |
| Via `fromExternalInstance()` | ✅ `ControlNode` anexado | ✅ |
| Via `hydrate()` | ✅ `ControlNode` anexado | ✅ |

## Encadeamento completo (exemplo real)

```typescript
// src/builder.ts docstring:489-555 (adaptado)
const Branch = CalcAUY.create({ contextLabel: "branch-ny", salt: "branch-secret" });
const branchSubtotal = Branch.from(1000000).sub(250000);

const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master-salt" });
const consolidation = await HQ.fromExternalInstance(branchSubtotal);
const finalLedger = await consolidation
    .mult(HQ.from(1).add("2.5%"))
    .commit();
// O audit trail mostra:
//   branch-ny: 1000000 - 250000
//   → reanimation_event (assinado)
//   corporate-hq: resultado × 1.025
```

## Referência de Código

- `src/main.ts:41-59` — Factory `CalcAUY.create()`
- `src/main.ts:74-119` — Verificador `CalcAUY.checkIntegrity()`
- `src/builder.ts:71-82` — Definição da classe com branding genérico
- `src/builder.ts:736-747` — `validateInstance()` com barreira por Symbol
- `src/builder.ts:489-555` — `fromExternalInstance()` com validação e wrapping
- `src/builder.ts:307-365` — `hydrate()` com reanimation
- `src/core/types.ts:16-42` — Tipo `InstanceConfig`
- `src/utils/sanitizer.ts:26-33` — `DEFAULT_INSTANCE_CONFIG`
- `src/core/constants.ts:35` — `BIRTH_TICKET_MOCK` symbol

[↑ Voltar ao índice](../../index.md)
