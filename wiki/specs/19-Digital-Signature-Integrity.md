# 19 - Assinaturas Digitais e Integridade Forense (BLAKE3 + JCS)

```mermaid
flowchart LR
    subgraph Sign[Geração]
        D[Data: {ast, finalResult, roundStrategy}] --> JCS[canonicalString]
        JCS --> T[TextEncoder: cString + salt]
        T --> B[crypto.subtle.digest BLAKE3]
        B --> H[256-bit hash]
        H --> E[Encoder: HEX/BASE64/BASE58/BASE32]
        E --> SIG[signature]
    end
    subgraph Verify[Verificação]
        TR[trace] --> PARSE[Extrair signature]
        TR --> PAY[Extrair data]
        PAY --> JCS2[canonicalString]
        JCS2 --> T2[TextEncoder: cString + salt]
        T2 --> B2[BLAKE3 digest]
        B2 --> H2[hash recalculado]
        H2 --> CMP{=== signature?}
        CMP -->|SIM| OK[✅ checkIntegrity → true]
        CMP -->|NÃO| FAIL[❌ integrity-critical-violation]
    end
```

## Objetivo

Definir o sistema de assinatura digital da CalcAUY, que combina o algoritmo **BLAKE3** (via `@std/crypto`) com o esquema de canonicalização **RFC 8785 (JCS — JSON Canonicalization Scheme)** para garantir que qualquer alteração no payload — seja na AST, no resultado ou na estratégia de arredondamento — seja detectada bit a bit.

## RFC 8785 — JSON Canonicalization Scheme (JCS)

A escolha de JCS em vez de uma simples ordenação lexicográfica (k-sort) se deve a:

| Critério | JCS (RFC 8785) | k-sort ad-hoc |
| :--- | :--- | :--- |
| Padrão formal | Sim (IETF) | Não |
| Portabilidade | Python `jcs`, Go `go-jcs`, Rust `jcs` | Inconsistente |
| Formato numérico | Define regras exatas | Não padronizado |
| Escapamento de strings | JSON strict | Variável |

### Regras de Serialização Numérica (JCS §3.2.2.2)

A função `serializeNumber()` em `src/utils/security.ts:82` implementa:

1. **Sem expoente**: notação científica é expandida via `expandScientificNotation()`
2. **Sem zeros à esquerda**: `0123` → `123`
3. **Sem zeros à direita**: `1.500` → `1.5`
4. **Inteiros sem ponto decimal**: `1.0` → `1`
5. **`-0` → `0`**: tratado via `Object.is(n, -0)`
6. **Infinity e NaN**: rejeitados com `TypeError`

#### Algoritmo `expandScientificNotation()`

`src/utils/security.ts:44`:

```typescript
function expandScientificNotation(s: string): string {
    const match = s.match(/^(-?)(\d)(?:\.(\d*))?[eE]([+-]?\d+)$/);
    if (!match) {
        throw new TypeError(`Cannot expand scientific notation: ${s}`);
    }
    const [, sign, intDigit, fracPart, expStr] = match;
    const exp = parseInt(expStr, 10);
    const digits = intDigit + (fracPart ?? "");
    const decimalShift = exp - (fracPart?.length ?? 0);

    if (decimalShift >= 0) {
        return sign + digits + "0".repeat(decimalShift);
    }
    // ... trata shift negativo (números < 1)
}
```

Exemplos de expansão:

| Entrada (`toString()`) | Regex | `decimalShift` | Saída JCS |
| :--- | :--- | :--- | :--- |
| `1.5e2` | `1`, `5`, `2` | `2 - 1 = 1` | `150` |
| `1.23e-2` | `1`, `23`, `-2` | `-2 - 2 = -4` | `0.0123` |
| `1e+21` | `1`, `""`, `21` | `21 - 0 = 21` | `1000000000000000000000` |
| `1.0e5` | `1`, `0`, `5` | `5 - 1 = 4` | `100000` |

### String Escaping

Usa `JSON.stringify()` nativo do JavaScript para strings (`security.ts:115`):

```typescript
} else if (typeof data === "string") {
    parts.push(JSON.stringify(data));
}
```

Garantindo que caracteres de controle (U+0000–U+001F) e escapes padrão (`\"`, `\\`, `\n`, `\t`) sejam representados conforme JSON RFC.

### Ordenação de Chaves de Objeto

`security.ts:131`:

```typescript
const keys = Object.keys(data as Record<string, unknown>).sort();
```

Ordenação por código UTF-8 (code point). Não há normalização Unicode — os bytes devem corresponder exatamente entre implementações.

### Tratamento de `undefined` em Objetos

`security.ts:135`:

```typescript
if (val === undefined) { continue; }
```

Chaves com valor `undefined` são omitidas do JSON canônico. Chaves com `null` são mantidas.

### Proteção contra Profundidade Excessiva

`security.ts:37,103`:

```typescript
const MAX_SERIALIZE_DEPTH = 1000;

function serialize(parts: string[], data: unknown, depth: number): void {
    if (depth > MAX_SERIALIZE_DEPTH) {
        throw new TypeError("Excessive depth in canonicalString");
    }
}
```

Medida de segurança contra ataques de `stack overflow` via objetos profundamente aninhados.

## Type Guards

A função `serialize()` em `security.ts:124-149` rejeita tipos não-JSON que causariam assinaturas silenciosamente divergentes entre runtimes:

| Tipo | Comportamento | Razão |
| :--- | :--- | :--- |
| `BigInt` | `TypeError` | Não serializável em JSON padrão |
| `Date` | `TypeError` | `Date.toString()` varia entre locale |
| `RegExp` | `TypeError` | `RegExp.toString()` varia |
| `function` | `TypeError` | Não serializável |
| `symbol` | `TypeError` | Não serializável |
| `undefined` (raiz) | `TypeError` | JSON inválido |
| `Infinity` / `NaN` | `TypeError` | IEEE 754 não canônico |
| `undefined` (valor de objeto) | Chave omitida | JCS §2 |
| `null` | `null` literal | Permitido |

## Geração de Assinatura (`generateSignature()`)

`src/utils/security.ts:160-183`:

```typescript
export async function generateSignature(
    data: unknown,
    salt: string,
    encoderType: SignatureEncoder,
): Promise<string> {
    const cString = canonicalString(data);
    const encoder = new TextEncoder();
    const payload = encoder.encode(cString + salt);

    const hashBuffer = await crypto.subtle.digest("BLAKE3", payload);
    const uint8 = new Uint8Array(hashBuffer);

    switch (encoderType) {
        case "BASE64":  return encodeBase64(uint8);
        case "BASE32":  return encodeBase32(uint8);
        case "BASE58":  return encodeBase58(uint8);
        case "HEX":
        default:        return encodeHex(uint8);
    }
}
```

### Etapas

1. **Canonicalização**: `canonicalString(data)` → string JSON sem whitespace, números sem expoente, chaves ordenadas
2. **Salt binding**: `cString + salt` — concatena o salt da instância ao final da string canônica. Impede que hashes sejam reutilizados entre instâncias com salts diferentes
3. **Digest BLAKE3**: `crypto.subtle.digest("BLAKE3", payload)` — hash de 256 bits (32 bytes)
4. **Encoding**: converte o `Uint8Array` para string legível

### Codificadores Suportados

Definido via tipo `SignatureEncoder` em `src/utils/sanitizer.ts:23` e implementado via `@std/encoding`:

| Encoder | Saída (32 bytes = 256 bits) | Uso típico |
| :--- | :--- | :--- |
| `"HEX"` (padrão) | 64 chars | Armazenamento, logs |
| `"BASE64"` | 44 chars | HTTP headers, compacto |
| `"BASE58"` | ~44 chars | Chaves públicas, URLs amigáveis |
| `"BASE32"` | 52 chars | Sistemas case-insensitive |

## Dois Esquemas de Payload

A CalcAUY utiliza dois esquemas distintos de payload assinado, dependendo da operação:

### 1. Hibernação (`hibernate()`)

`src/builder.ts:402-424`:

```typescript
const payload = { ast };   // ← apenas a árvore
const signature = await generateSignature(ast, this.#config.salt, this.#config.encoder);
```

- Assina **apenas a AST** (com timestamp injetado)
- Usado para salvar estado intermediário
- Não contém resultado nem estratégia

### 2. Commit / Audit Trace (`commit()` / `toAuditTrace()`)

`src/builder.ts:841-848`:

```typescript
const payload = {
    ast,
    finalResult: result.toJSON(),
    roundStrategy,
};
const signature = await generateSignature(payload, this.#config.salt, this.#config.encoder);
```

- Assina **AST + resultado + estratégia**
- O `CalcAUYOutput` armazena a signature e a expõe via `toAuditTrace()`:
  ```typescript
  // src/output.ts:210-217
  this.#cachedLiveTrace = {
      ast: flattenASTMetadata(this.#ast),
      finalResult: this.getResultJSON(),
      roundStrategy: this.#roundStrategy,
      signature: this.#signature,
      contextLabel: this.#config.contextLabel,
  };
  ```

### O Campo `signature` Nunca Faz Parte do Payload

A assinatura é auto-referencial — não pode incluir a si mesma. Em `checkIntegrity()` (`src/main.ts:90-101`):

```typescript
if (!payload || typeof payload !== "object" || !payload.signature) {
    throw new CalcAUYError("integrity-critical-violation", ...);
}
const dataToVerify = payload.data || {
    ast: payload.ast,
    finalResult: payload.finalResult,
    roundStrategy: payload.roundStrategy,
};
```

O campo `signature` é extraído do envelope e **excluído** de `dataToVerify` antes do recálculo.

## Verificação de Integridade

### `checkIntegrity()` — Validação Estática

`src/main.ts:74-119`:

```typescript
public static async checkIntegrity(
    ast: CalculationNode | string | object,
    config: { salt: string; encoder?: SignatureEncoder },
): Promise<true | CalcAUYError> {
    // 1. Parse se string
    // 2. Extrai signature do envelope
    // 3. Reconstrói payload (data ou {ast, finalResult, roundStrategy})
    // 4. Recalcula hash com BLAKE3 + salt
    // 5. Compara com signature armazenada
    // 6. Se mismatch → CalcAUYError("integrity-critical-violation")
}
```

### `hydrate()` — Reidratação com Validação

`src/builder.ts:307-365`:

```typescript
public async hydrate(ast, config = {}): Promise<CalcAUYLogic> {
    // 1. Extrai signature
    if (!signature) throw CalcAUYError("integrity-critical-violation");
    // 2. Decide payload: audit trace (ast+result+strategy) ou hibernação (só ast)
    const isAuditTrace = payload.finalResult !== undefined && payload.roundStrategy !== undefined;
    const dataToVerify = isAuditTrace
        ? { ast, finalResult, roundStrategy }
        : payload.ast;
    // 3. Recalcula e compara
    const expectedHash = await generateSignature(dataToVerify, verificationSalt, verificationEncoder);
    if (signature !== expectedHash) {
        throw CalcAUYError("integrity-critical-violation");
    }
    // 4. Se válido → wrappa em ControlNode + Group
    const controlNode: ControlNode = {
        kind: "control",
        type: "reanimation_event",
        metadata: {
            previousContextLabel: payload.contextLabel || "",
            previousSignature: signature,
            previousRoundStrategy: payload.roundStrategy || "",
        },
        child: node,
    };
    return new CalcAUYLogic(group, ...);
}
```

### Erro em Caso de Violação

`integrity-critical-violation` é uma categoria de `CalcAUYError` (`src/core/errors.ts:23`):

```typescript
"integrity-critical-violation": 500  // HTTP status
```

Com contexto adicional:

```typescript
throw new CalcAUYError("integrity-critical-violation",
    "Integrity violation detected: signature does not match content.",
    { expected: expectedHash, received: payload.signature as string },
);
```

### Exemplo de Verificação

```typescript
const calc = CalcAUY.create({ contextLabel: "audit", salt: "secret" });
const result = await calc.from(1000).mult("1.05").commit();
const trace = result.toAuditTrace();

// Verificação bem-sucedida
await CalcAUY.checkIntegrity(trace, { salt: "secret" }); // → true

// Verificação com salt errado → falha
try {
    await CalcAUY.checkIntegrity(trace, { salt: "wrong-salt" });
} catch (err) {
    console.log(err.title); // "integrity-critical-violation"
}
```

### Exemplo de Detecção de Adulteração

```typescript
const Vault = CalcAUY.create({ contextLabel: "security", salt: "vault-salt" });
const signedData = JSON.parse(await Vault.from(100).hibernate());

// Adulteração maliciosa
signedData.ast.value.n = "999999";

try {
    await Vault.hydrate(signedData); // → lança erro
} catch (err) {
    if (err instanceof CalcAUYError && err.title === "integrity-critical-violation") {
        console.error("⚠️ Dados adulterados detectados!");
    }
}
```

## Integração Cross-Context

Em `fromExternalInstance()` (`src/builder.ts:489-555`):

1. O método recebe uma instância externa ou trace assinado
2. **Valida a assinatura original** da instância externa
3. Preserva a assinatura original no `ControlNode.metadata.previousSignature`
4. A assinatura original nunca é sobrescrita — a cadeia de custódia é mantida
5. Quando o novo contexto chama `commit()`, uma **nova assinatura** é gerada para o contexto atual

```typescript
const controlNode: ControlNode = {
    kind: "control",
    type: "reanimation_event",
    metadata: {
        previousContextLabel: externalContextLabel,   // jurisdição de origem
        previousSignature: externalSignature,         // assinatura original
        previousRoundStrategy: externalStrategy,
    },
    child: externalAST,
};
```

Isto permite auditoria multi-jurisdição: cada contexto mantém sua própria assinatura, e a assinatura original de cada nó importado é preservada como evidência forense.

## Constantes de Segurança

| Constante | Valor | Local | Finalidade |
| :--- | :--- | :--- | :--- |
| `MAX_SERIALIZE_DEPTH` | `1000` | `security.ts:37` | Previne stack overflow na canonicalização |
| `MAX_HYDRATE_DEPTH` | `500` | `constants.ts:51` | Previne recursão excessiva na hidratação |
| `MAX_HYDRATE_NODES` | `1000` | `constants.ts:52` | Prevene DoS por árvore gigante |
| `MAX_METADATA_BYTES` | `16384` | `constants.ts:53` | Limita payload de metadados por nó |

## Referências

| Arquivo | Linha | Elemento |
| :--- | :--- | :--- |
| `src/utils/security.ts` | 31-35 | `canonicalString()` — serialização JCS |
| `src/utils/security.ts` | 37 | `MAX_SERIALIZE_DEPTH = 1000` |
| `src/utils/security.ts` | 44-72 | `expandScientificNotation()` — expansão de expoente |
| `src/utils/security.ts` | 82-100 | `serializeNumber()` — formato canônico de números |
| `src/utils/security.ts` | 102-150 | `serialize()` — serialização recursiva com type guards |
| `src/utils/security.ts` | 124-128 | Type guards para Date, RegExp, BigInt, function, symbol |
| `src/utils/security.ts` | 131 | `Object.keys().sort()` — ordenação UTF-8 |
| `src/utils/security.ts` | 160-183 | `generateSignature()` — BLAKE3 + salt + encoder |
| `src/utils/sanitizer.ts` | 23 | `SignatureEncoder` — type alias |
| `src/main.ts` | 74-119 | `checkIntegrity()` — verificação estática |
| `src/builder.ts` | 307-365 | `hydrate()` — reidratação com validação |
| `src/builder.ts` | 402-424 | `hibernate()` — assinatura de AST |
| `src/builder.ts` | 821-849 | `commit()` — assinatura de AST + resultado + estratégia |
| `src/builder.ts` | 489-555 | `fromExternalInstance()` — cadeia de custódia cross-context |
| `src/core/errors.ts` | 23,81 | `integrity-critical-violation` — categoria e status |
| `src/core/constants.ts` | 51-53 | Limites de profundidade/nós/metadados |
| `src/ast/types.ts` | 71-80 | `ControlNode` — metadados de jurisdição |
| `RFC 8785` | — | JSON Canonicalization Scheme (ietf.org/rfc/rfc8785) |

---

[↑ Voltar ao índice](../../index.md)
