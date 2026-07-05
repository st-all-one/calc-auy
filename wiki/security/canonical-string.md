# Canonical String — RFC 8785 (JCS)

## Por que JCS?

A CalcAUY adota o **JSON Canonicalization Scheme (RFC 8785)** como seu protocolo de serialização determinística para assinaturas digitais.

Alternativas como "k-sort" recursivo ou SJCL (Symas JSON Canonicalization) são soluções ad-hoc sem padronização formal. JCS é:

- **Padrão IETF formal** — especificação rigorosa sem ambiguidades
- **Multi-linguagem** — implementações maduras em Python (`jcs`, `rfc8785`), Go (`go-jcs`), Rust (`jcs`), Java (`json-canonicalization`), e TypeScript
- **Verificável por terceiros** — um auditor pode reimplementar a canonização em qualquer linguagem e obter hashes idênticos
- **Testado por conformidade** — conjunto de testes de borda cobrindo IEEE 754 corner cases

> A escolha por JCS elimina o risco de divergência silenciosa entre implementações: o mesmo JSON sempre produz a mesma string canônica, em qualquer runtime.

---

## Regras de Formatação

### Números (JCS §3.2.2.2)

Números seguem o formato decimal canônico mais enxuto:

| Valor original | JCS canônico |
|----------------|--------------|
| `1e+21` | `1000000000000000000000` |
| `1.0` | `1` |
| `-0` | `0` |
| `3.14000` | `3.14` |
| `0.00100` | `0.001` |
| `1.23e-4` | `0.000123` |
| `100000.0` | `100000` |

**Implementação** (`src/utils/security.ts:serializeNumber`):

```typescript
function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) throw new TypeError(...);

  const s = n.toString();
  if (Object.is(n, -0)) return "0";
  if (s.includes("e") || s.includes("E")) return expandScientificNotation(s);
  return s;
}
```

O algoritmo `expandScientificNotation` desmembra o expoente e desloca o ponto decimal sem arredondamento, preservando exatamente os 53 bits de precisão do IEEE 754 double.

### Strings

Strings são escapadas conforme JSON (RFC 8259):
- `"` → `\"`
- `\` → `\\`
- U+0000–U+001F → `\uXXXX`
- U+0022, U+005C → escapes curtos
- Surrogate pairs preservados

Usa-se `JSON.stringify` nativo do ECMAScript, que segue o mesmo algoritmo.

### Objetos

1. Extrair keys com `Object.keys()` (próprias, enumeráveis)
2. Ordenar por UTF-8 code point (comparação lexicográfica byte-a-byte)
3. Serializar cada par `chave:valor` sem whitespace entre `:`
4. Se o valor é `undefined`, a chave é omitida

```typescript
const keys = Object.keys(obj).sort();
for (const key of keys) {
  if (obj[key] === undefined) continue;
  parts.push(JSON.stringify(key), ":", serialize(obj[key]));
}
```

### Arrays

Processados sequencialmente mantendo a ordem original, com canonização recursiva em cada elemento. Sem whitespace após `,`.

---

## Type Guards

A implementação rejeita ativamente tipos que não fazem parte do universo JSON:

| Tipo | Motivo da Rejeição |
|------|-------------------|
| `BigInt` | Sem equivalente em JSON; `BigInt(1)` viraria `{"1":...}` em Python |
| `Date` | `new Date().toJSON()` retorna ISO string, mas `Date` como wrapper object não é JSON |
| `RegExp` | `RegExp("/foo/")` não tem representação JSON universal |
| `function` | `JSON.stringify` retorna `undefined` silenciosamente |
| `symbol` | Não serializável; `JSON.stringify` retorna `undefined` |
| `undefined` (raiz) | `JSON.stringify` retorna `undefined`, não uma string |
| `Infinity` / `NaN` | `JSON.stringify` retorna `null`, corrompendo o dado |

> **Por que rejeitar?** Converter `Date` para string ou `BigInt` para decimal parece útil, mas mascara o problema quando esses tipos aparecem em metadados inesperados. A assinatura seria consistente no TypeScript, mas impossível de verificar em linguagens sem esses tipos. Quebrar cedo com erro explícito é mais seguro.

---

## Implementação

**Arquivo:** `src/utils/security.ts`

```
canonicalString(data)          → string JCS
  ├─ serialize(parts, data, depth)
  │   ├─ serializeNumber(n)    → string decimal canônico
  │   │   └─ expandScientificNotation(s) → expansão 1e+21 → 1000...
  │   ├─ string → JSON.stringify
  │   ├─ Array → recursive serialize cada elemento
  │   ├─ Object → sort keys → recursive serialize cada valor
  │   └─ type guard → TypeError
  └─ join("") → string canônica

generateSignature(data, salt, encoder)
  ├─ canonicalString(data)
  ├─ TextEncoder(cString + salt)
  ├─ crypto.subtle.digest("BLAKE3", ...)
  └─ encode[Hex|Base64|Base58|Base32](hash)
```

- Profundidade máxima: 1000 níveis (proteção contra stack overflow via objeto profundamente aninhado)
- Complexidade: O(n log k) por objeto (onde k é o número de chaves), linear para arrays

---

## Interoperabilidade

Um perito externo pode verificar a assinatura CalcAUY sem a biblioteca:

```python
# Python — usando jcs + pyblake3
import jcs, blake3

data = {"ast": ..., "finalResult": ..., "roundStrategy": ...}
canonical = jcs.canonicalize(data)
signature = blake3.blake3(canonical.encode() + salt.encode()).hexdigest()
assert signature == stored_signature
```

```go
// Go — usando go-jcs + lukechampine/blake3
import "github.com/gowebpki/jcs"
import "lukechampine.com/blake3"

canonical, _ := jcs.Transform(data)
hash := blake3.Sum256(append(canonical, []byte(salt)...))
```

```rust
// Rust — usando jcs + blake3 crate
use jcs::to_string;
use blake3::hash;

let canonical = to_string(&data)?;
let hash = hash(format!("{}{}", canonical, salt).as_bytes());
```

O mesmo princípio se aplica a qualquer linguagem com implementações JCS e BLAKE3. A chave para a interoperabilidade é:
1. **Salt conhecido** — o auditor precisa do salt usado no momento da assinatura
2. **JCS idêntico** — qualquer implementação conforme RFC 8785 produz a mesma string
3. **BLAKE3 padrão** — o algoritmo é deterministicamente o mesmo em qualquer plataforma

---

[↑ Voltar ao índice](../index.md)
