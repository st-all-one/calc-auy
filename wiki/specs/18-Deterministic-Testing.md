# 18 - Testes Determinísticos e Snapshot de Assinaturas

```mermaid
flowchart LR
    A[Teste] --> B[CalcAUY.create]
    B --> C[contextLabel + salt fixo]
    B --> D[BIRTH_TICKET_MOCK: ISO]
    D --> E[#generateBirthTime]
    E --> F[timestamp determinístico]
    F --> G[commit/hibernate]
    G --> H[BLAKE3 assina {ast, timestamp}]
    H --> I[Assinatura IDÊNTICA sempre]
    I --> J[Snapshot toAuditTrace no CI]
    J --> K[Hash quebrado = comportamento alterado]
```

## Objetivo

Garantir que assinaturas BLAKE3 geradas por `commit()` e `hibernate()` sejam reproduzíveis em suítes de teste, permitindo snapshot de audit traces e detecção de mudanças de comportamento por comparação de hash.

## Problema

Toda instância CalcAUY gera um `birthTime` no momento da criação, que é injetado como `timestamp` nos metadados da AST durante o fechamento (`commit()` / `hibernate()`). Esse timestamp é parte do payload assinado pelo BLAKE3.

```typescript
// src/builder.ts:753 — método privado #generateBirthTime()
#generateBirthTime(): string {
    return (this.#config[BIRTH_TICKET_MOCK] as string) || new Date().toISOString();
}
```

Sem controle sobre `Date.now()`, cada execução do mesmo cálculo produz:
- Timestamps diferentes
- Payloads BLAKE3 diferentes
- Assinaturas diferentes
- Impossibilidade de snapshot deterministico

## Solução: `BIRTH_TICKET_MOCK`

### Definição

Em `src/core/constants.ts:35`:

```typescript
/**
 * Chave privada para injeção de timestamp de nascimento em ambientes de teste.
 * Permite garantir assinaturas determinísticas em suítes de teste.
 * @internal
 */
export const BIRTH_TICKET_MOCK: unique symbol = Symbol("BIRTH_TICKET_MOCK");
```

### Características

- `unique symbol` — impossível de ser criado fora do módulo; só pode ser importado
- `@internal` — documentado como uso exclusivo para testes, nunca em produção
- Tipo registrado em `InstanceConfig` (`src/core/types.ts:41`):
  ```typescript
  [BIRTH_TICKET_MOCK]?: string;
  ```

### Uso em Testes

```typescript
import { BIRTH_TICKET_MOCK } from "@src/core/constants.ts";
import { CalcAUY } from "@calcauy";

// Config com timestamp fixo + salt fixo = assinatura determinística
const calc = CalcAUY.create({
    contextLabel: "test",
    salt: "test-salt",
    [BIRTH_TICKET_MOCK]: "2026-01-01T00:00:00Z",
});

// Toda execução produz a MESMA assinatura
const r1 = await calc.from("100").add("50").commit();
const r2 = await calc.from("100").add("50").commit();

r1.toAuditTrace() === r2.toAuditTrace(); // true — deterministico!
```

## Fluxo do `birthTime` no Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│ create(config)                                                    │
│   src/main.ts:41                                                  │
│   │                                                               │
│   ├── fullConfig = { ...DEFAULT_INSTANCE_CONFIG, ...config }      │
│   ├── fullConfig[BIRTH_TICKET_MOCK] = config[BIRTH_TICKET_MOCK]   │
│   │   (pode ser undefined — propagado como está)                  │
│   └── new CalcAUYLogic(null, id, fullConfig, null)                │
│       └── #birthTime = null (gerado sob demanda)                  │
│                                                                   │
│ .from(value)                                                      │
│   src/builder.ts:146                                              │
│   │                                                               │
│   ├── Chama #generateBirthTime() → retorna string ISO             │
│   └── new CalcAUYLogic(ast, id, config, birthTime)                │
│       └── #birthTime agora é uma string ISO                       │
│                                                                   │
│ #generateBirthTime()                                              │
│   src/builder.ts:753                                              │
│   │                                                               │
│   └── config[BIRTH_TICKET_MOCK] ?? new Date().toISOString()       │
│       ├── Se BIRTH_TICKET_MOCK presente → usa o valor ISO         │
│       └── Se não → gera timestamp real com Date.now()             │
│                                                                   │
│ commit()                                                          │
│   src/builder.ts:821                                              │
│   │                                                               │
│   ├── flattenASTMetadata(root)                                    │
│   ├── Injeta #birthTime como timestamp no metadata da raiz        │
│   ├── payload = { ast, finalResult, roundStrategy }               │
│   ├── signature = generateSignature(payload, salt, encoder)       │
│   └── timestamp FAZ PARTE do payload assinado                     │
│                                                                   │
│ hibernate()                                                       │
│   src/builder.ts:402                                              │
│   │                                                               │
│   ├── flattenASTMetadata(root)                                    │
│   ├── Injeta #birthTime como timestamp no metadata da raiz        │
│   ├── signature = generateSignature(ast, salt, encoder)           │
│   └── timestamp FAZ PARTE do payload assinado                     │
│                                                                   │
│ hydrate()                                                         │
│   src/builder.ts:307                                              │
│   │                                                               │
│   ├── Extrai originalBirthTime do payload.ast.metadata.timestamp  │
│   └── new CalcAUYLogic(group, id, config, originalBirthTime)      │
│       └── birthTime preservado da origem → assinatura continua    │
│       válida                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Padrão de Teste com Snapshot

```typescript
import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import { CalcAUY } from "@calcauy";
import { BIRTH_TICKET_MOCK } from "@src/core/constants.ts";

const SALT = "deterministic-test-salt";
const MOCK_TIME = "2026-06-15T12:00:00.000Z";

function createTestInstance() {
    return CalcAUY.create({
        contextLabel: "snapshot-test",
        salt: SALT,
        [BIRTH_TICKET_MOCK]: MOCK_TIME,
    });
}

describe("snapshot de assinatura", () => {
    it("deve produzir audit trace idêntico em múltiplas execuções", async () => {
        const calc = createTestInstance();
        const r1 = await calc.from("100").add("50").commit();
        const r2 = await calc.from("100").add("50").commit();
        assertEquals(r1.toAuditTrace(), r2.toAuditTrace());
    });

    it("deve falhar snapshot se timestamp mudar", async () => {
        const calc1 = CalcAUY.create({
            contextLabel: "snap",
            salt: "fixo",
            [BIRTH_TICKET_MOCK]: "2026-01-01T00:00:00Z",
        });
        const calc2 = CalcAUY.create({
            contextLabel: "snap",
            salt: "fixo",
            [BIRTH_TICKET_MOCK]: "2026-06-15T00:00:00Z",
        });

        const r1 = await calc1.from("100").commit();
        const r2 = await calc2.from("100").commit();
        // Assinaturas DIFERENTES porque timestamp mudou
        const t1 = JSON.parse(r1.toAuditTrace());
        const t2 = JSON.parse(r2.toAuditTrace());
        assertEquals(t1.signature === t2.signature, false);
    });
});
```

### Snapshot em CI

O padrão recomendado para testes de snapshot:

1. **Primeira execução**: `toAuditTrace()` é salvo como string JSON em um arquivo `__snapshots__/`
2. **Execuções subsequentes**: CI compara o hash do audit trace gerado com o hash do snapshot:
   ```bash
   # Comparação de integridade via SHA-256 do audit trace completo
   echo "$GENERATED_TRACE" | sha256sum
   ```
3. **Se o hash mudou**: a pipeline falha, indicando que o comportamento do cálculo foi alterado

## Contrato de Determinismo

Para uma assinatura ser 100% determinística, são necessários:

| Fator | Impacto | Controle |
| :--- | :--- | :--- |
| `salt` | Se muda, assinatura muda | Fixo no teste |
| `BIRTH_TICKET_MOCK` | Se ausente, usa `Date.now()` | String ISO fixa |
| `roundStrategy` | Afeta o payload de `commit()` | Fixo no config |
| `contextLabel` | Não entra no payload assinado | Indiferente |
| Ordem das operações | Se muda, AST muda | Mesma fluent chain |
| `encoder` | Se muda, encoding muda | `"HEX"` (padrão) |

## Aviso de Uso (`@internal`)

O símbolo `BIRTH_TICKET_MOCK` é marcado como `@internal` na documentação TSDoc. Isso significa:

- **Pode** ser importado em arquivos de teste (`import { BIRTH_TICKET_MOCK } from "..."`)
- **Não deve** ser usado em código de produção
- **Não** há garantia de estabilidade da API entre versões

A assinatura TypeScript com `unique symbol` impede que o valor seja criado acidentalmente:

```typescript
// Erro de compilação — não é possível criar outro símbolo único
const fake = Symbol("BIRTH_TICKET_MOCK"); // TypeScript OK (runtime)
const config = { [fake]: "..." }; // Não corresponde ao tipo InstanceConfig
```

## Referências

| Arquivo | Linha | Elemento |
| :--- | :--- | :--- |
| `src/core/constants.ts` | 30-35 | Declaração de `BIRTH_TICKET_MOCK` como `unique symbol` |
| `src/core/types.ts` | 39-41 | `InstanceConfig[BIRTH_TICKET_MOCK]?: string` |
| `src/builder.ts` | 753-755 | `#generateBirthTime()` — lógica de mock vs real |
| `src/builder.ts` | 403-424 | `hibernate()` — injeção de timestamp no payload |
| `src/builder.ts` | 830-846 | `commit()` — injeção de timestamp + assinatura do payload |
| `src/builder.ts` | 341-363 | `hydrate()` — extração e preservação do timestamp original |
| `src/main.ts` | 41-58 | `create()` — propagação da config com BIRTH_TICKET_MOCK |
| `src/utils/security.ts` | 160-183 | `generateSignature()` — BLAKE3 sobre payload canônico |

---

[↑ Voltar ao índice](../../index.md)
