# 17 - Política de Proteção de PII e Integridade

```mermaid
flowchart LR
    subgraph Layer1[Camada 1 — Instância]
        A[sensitive: true] --> B[sanitizeAST]
        B --> C[Literais → {n:'[PII]', d:'[PII]'}]
        B --> D[originalInput → '[PII]']
        B --> E[Metadata via sanitizeObject]
    end
    subgraph Layer2[Camada 2 — Granular]
        F[.setMetadata('pii', true)] --> G[Força redação]
        F --> H[.setMetadata('pii', false)] --> I[Exibe]
    end
    subgraph Layer3[Camada 3 — Propagação]
        J[Parent Group/Op] --> K[parentHide]
        K --> L[Literais filhos herdam]
    end
    M[Nós Control] --> N[NUNCA redigem timestamp/previousContextLabel/previousSignature]
```

## Objetivo

Definir o sistema de proteção de Dados Pessoais (PII — Personally Identifiable Information) da CalcAUY, garantindo que logs, erros e diagramas Mermaid nunca exponham valores sensíveis, sem alterar a AST armazenada ou o resultado final do cálculo.

## Arquitetura de Três Camadas

### Camada 1 — Política de Instância (Padrão)

A configuração `sensitive` no `InstanceConfig` controla o comportamento global. O padrão é `true`, definido em `DEFAULT_INSTANCE_CONFIG` (`src/utils/sanitizer.ts:26`):

```typescript
export const DEFAULT_INSTANCE_CONFIG: Required<InstanceConfig> = {
    sensitive: true,   // ← padrão: todos os dados são sensíveis
    salt: "",
    encoder: "HEX",
    contextLabel: "",
    roundStrategy: "NBR5891",
    [BIRTH_TICKET_MOCK]: "",
};
```

Quando `sensitive: true`, a função `sanitizeAST()` (`src/utils/sanitizer.ts:43`) aplica as seguintes transformações:

| Elemento | Entrada | Saída (log/erro) |
| :--- | :--- | :--- |
| `LiteralNode.value` | `{ n: "12345", d: "1" }` | `{ n: "[PII]", d: "[PII]" }` |
| `LiteralNode.originalInput` | `"15000.75"` | `"[PII]"` |
| Metadados de nó | `{ ref: "invoice-992", value: 5000 }` | `{ ref: "invoice-992", value: "[PII]" }` |
| Strings longas (>50 chars) | `"A" + "B".repeat(100)` | `"[PII]"` |
| Strings numéricas | `"12345.67"`, `"14.5%"` | `"[PII]"` |
| `number`, `bigint` | `42`, `100n` | `"[PII]"` |

A chave de decisão está em `sanitizer.ts:56-64`:

```typescript
const nodeOverride = node.metadata?.pii;
let hide: boolean;
const isSensitive = config.sensitive ?? DEFAULT_INSTANCE_CONFIG.sensitive;

if (typeof nodeOverride === "boolean") {
    hide = nodeOverride;        // Camada 2: override granular
} else if (node.kind === "literal" && parentHide !== undefined) {
    hide = parentHide;          // Camada 3: herança do pai
} else {
    hide = isSensitive;         // Camada 1: política da instância
}
```

### Camada 2 — Granular via Metadado `pii`

O usuário pode forçar ou liberar a exibição de um nó específico usando `.setMetadata("pii", boolean)`:

```typescript
// Força redação mesmo com sensitive: false
calc.from(100).setMetadata("pii", true);

// Libera exibição mesmo com sensitive: true
calc.from(5000).setMetadata("pii", false);
```

O tipo do metadado é booleano estrito. Se `typeof nodeOverride === "boolean"`, ele tem precedência absoluta sobre a política de instância e sobre a herança parental.

### Camada 3 — Propagação em Cascata

Literais dentro de uma operação ou grupo herdam o estado `parentHide` do nó pai:

1. `sanitizeAST(operationNode, config, hide)` é chamada para o nó operação com `hide = isSensitive`
2. Dentro do nó, cada operando recebe `sanitizeAST(op, config, hide)` — o mesmo `hide` é propagado
3. Literais filhos que **não** têm `metadata.pii` definido usam `parentHide` (`sanitizer.ts:58-59`)

#### Controles Técnicos que NUNCA São Redigidos

Nós do tipo `"control"` têm proteção explícita (`sanitizer.ts:79-86`):

```typescript
if (node.kind === "control") {
    sanitized.type = node.type;
    sanitized.metadata = {
        timestamp: node.metadata.timestamp,
        previousContextLabel: node.metadata.previousContextLabel,
        previousSignature: node.metadata.previousSignature,
    };
    sanitized.child = sanitizeAST(node.child, config, hide);
}
```

Mesmo com `sensitive: true`, os campos:
- `timestamp` — carimbo de data/hora do nascimento do cálculo
- `previousContextLabel` — jurisdição de origem (cross-context)
- `previousSignature` — assinatura digital do contexto anterior

Nunca são substituídos por `"[PII]"`. Isso garante a **cadeia de custódia forense** mesmo em logs sanitizados.

## Sanitização de Objetos Genéricos (`sanitizeObject`)

A função `sanitizeObject()` em `src/utils/sanitizer.ts:106` é usada para sanitizar o `ErrorContext` e outros objetos arbitrários.

### Chaves Sensíveis Conhecidas

Definidas em `sanitizer.ts:17`:

```typescript
const SENSITIVE_KEYS = new Set([
    "n", "d", "rawInput", "metadata", "value",
    "originalInput", "secret"
]);
```

Qualquer chave que corresponda exatamente a estas é substituída por `"[PII]"`.

### Proteção contra Referências Circulares

`sanitizer.ts:119-120`:

```typescript
if (seen.has(obj)) { return "[CIRCULAR]"; }
seen.add(obj);
```

Usa um `WeakSet<object>` (`seen`) que é passado recursivamente. Se um objeto já foi visitado, retorna a string literal `"[CIRCULAR]"` em vez de entrar em loop infinito.

### Regras para Valores Primitivos

`sanitizer.ts:143-150`:

```typescript
if (typeof obj === "number" || typeof obj === "bigint" || typeof obj === "string") {
    if (typeof obj === "string") {
        if (obj.length > 50) { return REDACTED; }
        if (obj.length > 0 && NUMERIC_RE.test(obj)) { return REDACTED; }
    } else {
        return REDACTED;
    }
}
```

| Tipo | Condição de Redação | Exemplo Redigido | Exemplo Preservado |
| :--- | :--- | :--- | :--- |
| `string` | Comprimento > 50 chars | `"Lorem ipsum dolor sit amet, consectetur..."` | `"curto"` |
| `string` | Case `NUMERIC_RE` | `"12345"`, `"14.5%"`, `"1e3"`, `"-0.5%"` | `"abc"` |
| `number` | Sempre redigido | `42` → `"[PII]"` | — |
| `bigint` | Sempre redigido | `100000n` → `"[PII]"` | — |
| `boolean` | Nunca redigido | — | `true`, `false` |
| `null` | Nunca redigido | — | `null` |

### Expressão Regular `NUMERIC_RE`

`sanitizer.ts:20`:

```typescript
const NUMERIC_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?%?$/;
```

Casos que correspondem (redigidos):
- `"123"`, `"0.5"`, `".5"`, `"1e3"`, `"1.5e-2"`, `"14.5%"`, `"-0.5%"`, `"+123.45"`

Casos que NÃO correspondem (preservados):
- `"abc"`, `"1.2.3"`, `"12 34"`, `"cpf:123"`, `""` (vazia)

## Onde a Redação se Aplica

| Destino | Função | Efeito |
| :--- | :--- | :--- |
| Logs (debug/info/error) | `sanitizeObject(context)` em `CalcAUYError` | ErrorContext redigido no `logger.error()` |
| Logs de operação | `sanitizeAST(newAST, config)` em `builder.ts:800` | Estrutura do nó logada sem valores |
| Mermaid graph | `sanitizeAST()` via `renderMermaidSequence` | Nós no diagrama exibem `[PII]` |
| `toJSON()` do erro | `this.context` já sanitizado | Payload HTTP seguro |

### Onde a Redação NÃO se Aplica

- **AST armazenada** em `#ast` no `CalcAUYLogic` e `CalcAUYOutput`
- **Resultado final** (`RationalNumber`) — o número computado nunca é alterado
- **Assinatura digital** — BLAKE3 opera sobre a AST real, não a sanitizada
- **Saídas formatadas** como `toStringNumber()`, `toMonetary()`, `toLaTeX()`, `toUnicode()`

## Fluxo de Decisão Completo

```
1. sanitizeAST(node, config, parentHide?) é chamada
   ↓
2. node.metadata.pii existe e é boolean?
   ├── SIM → hide = nodeOverride (Camada 2)
   └── NÃO → node.kind é "literal" E parentHide !== undefined?
             ├── SIM → hide = parentHide (Camada 3)
             └── NÃO → hide = config.sensitive (Camada 1)
   ↓
3. Com hide definido, processa o nó:
   ├── literal → value e originalInput redigidos se hide
   ├── group → child recebe sanitizeAST(child, config, hide)
   ├── operation → type, operands mapeados com hide
   └── control → metadata técnico NUNCA redigido, child com hide
```

## Referências

| Arquivo | Linha | Elemento |
| :--- | :--- | :--- |
| `src/utils/sanitizer.ts` | 14 | `REDACTED = "[PII]"` |
| `src/utils/sanitizer.ts` | 17 | `SENSITIVE_KEYS` — Set de chaves sensíveis |
| `src/utils/sanitizer.ts` | 20 | `NUMERIC_RE` — regex para detecção numérica |
| `src/utils/sanitizer.ts` | 26-33 | `DEFAULT_INSTANCE_CONFIG` — padrão `sensitive: true` |
| `src/utils/sanitizer.ts` | 43-95 | `sanitizeAST()` — sanitização da árvore |
| `src/utils/sanitizer.ts` | 56-64 | Lógica de decisão de 3 camadas |
| `src/utils/sanitizer.ts` | 79-86 | Proteção de nós Control (timestamp, signatures) |
| `src/utils/sanitizer.ts` | 106-153 | `sanitizeObject()` — sanitização genérica |
| `src/utils/sanitizer.ts` | 119-120 | Proteção circular via `WeakSet` |
| `src/core/types.ts` | 16-42 | `InstanceConfig.sensitive` — definição de tipo |
| `src/core/errors.ts` | 92-101 | Uso de `sanitizeObject()` no logger de erro |
| `src/builder.ts` | 800-805 | Log de operação com `sanitizeAST()` |

---

[↑ Voltar ao índice](../../index.md)
