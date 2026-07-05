# Assinatura do Cálculo

## Por que assinar um cálculo?

A CalcAUY trata cada cálculo como um **documento jurídico**. A assinatura digital garante:

- **Integridade forense:** qualquer alteração de 1 bit na AST, no resultado ou na estratégia invalida a assinatura
- **Proveniência:** o `salt` da instância vincula o cálculo à jurisdição que o gerou
- **Verificação por terceiros:** qualquer auditor com o `salt` pode confirmar que o dado não foi adulterado, sem precisar da CalcAUY

---

## O que é assinado?

O payload assinado **não** é o JSON completo armazenado. A assinatura cobre apenas os campos semânticos do cálculo — o campo `signature` em si fica **fora** do payload assinado (seria impossível assinar o próprio hash).

### Payload 1: Hibernação (`hibernate()`)

Assina apenas a estrutura da árvore. Usado para salvar e restaurar o estado de um cálculo em andamento.

```typescript
const payload = { ast }; // ← o que vira entrada do canonicalString
const signature = await generateSignature(payload, salt, encoder);

// O que é armazenado externamente:
// { ast, signature, contextLabel }  ← signature fica FORA do payload
```

**Campos no envelope externo:**

| Campo | No payload assinado? | Descrição |
|-------|---------------------|-----------|
| `ast` | ✅ Sim | Árvore de Sintaxe Abstrata |
| `signature` | ❌ Não | Hash BLAKE3 (adicionado após assinar) |
| `contextLabel` | ❌ Não | Rótulo da jurisdição (não afeta o cálculo) |

### Payload 2: Fechamento (`commit()` / `toAuditTrace()`)

Assina a árvore **mais** o resultado final e a estratégia. Usado para selar o cálculo completo.

```typescript
const payload = { ast, finalResult, roundStrategy }; // ← entrada do canonicalString
const signature = await generateSignature(payload, salt, encoder);

// O que é armazenado:
// { ast, finalResult, roundStrategy, signature, contextLabel }
```

**Por que `finalResult` e `roundStrategy` estão no payload assinado?**
Um auditor precisa ter certeza de que o resultado armazenado corresponde exatamente à árvore que o gerou. Se alguém alterar o `finalResult` de `60000` para `70000`, a assinatura quebra.

**Por que estão ausentes no `hibernate()`?**
Hibernação é um snapshot intermediário. O cálculo ainda não foi fechado — não há resultado final para assinar.

---

## Como a assinatura é gerada?

```
                      ┌──────────────────┐
                      │   Payload bruto   │
                      │ { ast, result,   │
                      │   roundStrategy } │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ canonicalString() │ ← RFC 8785 (JCS)
                      │ ""{"ast":{...},   │
                      │   "finalResult":  │
                      │   {"n":"6","d":"1"}}  │
                      └────────┬─────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
           ┌──────────────┐     ┌──────────────┐
           │  cString     │     │    salt      │
           │  (string)    │     │  (string)    │
           └────────┬─────┘     └──────┬───────┘
                    │                  │
                    └──────┬───────────┘
                           │ concatenação
                           ▼
                    ┌──────────────┐
                    │ cString +    │
                    │ salt         │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ BLAKE3       │ ← @std/crypto
                    │ 256 bits     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ encode(hex   │
                    │ / base64 /   │
                    │ base58 /     │
                    │ base32)      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  signature   │
                    │  (string)    │
                    └──────────────┘
```

### Passo a passo

1. **Canonicalização** — `canonicalString(payload)` serializa o payload em string JSON determinística (RFC 8785): chaves ordenadas, números sem expoente, sem espaços
2. **Salt binding** — o salt secreto da instância é concatenado ao final da string canônica: `cString + salt`
3. **Hash** — `crypto.subtle.digest("BLAKE3", encoder(cString + salt))` produz 256 bits
4. **Codificação** — o hash bruto é codificado em HEX (padrão), BASE64, BASE58 ou BASE32

```typescript
async function generateSignature(
  data: unknown,
  salt: string,
  encoder: SignatureEncoder
): Promise<string> {
  const cString = canonicalString(data);               // passo 1
  const payload = new TextEncoder().encode(cString + salt); // passo 2
  const hash = await crypto.subtle.digest("BLAKE3", payload); // passo 3
  return encodeHash(hash, encoder);                    // passo 4
}
```

---

## Como a assinatura é verificada?

### Verificação estática (`checkIntegrity`)

Para verificar um rastro sem reconstruir a árvore:

```typescript
await CalcAUY.checkIntegrity(traceJson, { salt: "meu_segredo" });
// lança integrity-critical-violation se a assinatura não conferir
```

O método:
1. Extrai o campo `signature` do envelope
2. Reconstrói o payload original (remove a `signature` e `contextLabel`)
3. Recalcula o hash: `canonicalString(payload) + salt` → BLAKE3
4. Compara com o hash armazenado

### Verificação durante hidratação (`hydrate`)

```typescript
const calc = CalcAUY.create({ contextLabel: "audit", salt: "meu_segredo" });
const restaurado = await calc.hydrate(traceJson); // valida antes de montar a AST
```

Além de verificar a assinatura, o `hydrate()` envolve a árvore restaurada em um nó `control` que preserva a linhagem forense.

### Verificação por terceiros (sem CalcAUY)

Um auditor externo pode verificar a assinatura em Python, Go ou Rust:

```python
import hashlib, json

# 1. Extrair payload e assinatura
trace = json.loads(trace_json)
payload = { "ast": trace["ast"], "finalResult": trace["finalResult"], "roundStrategy": trace["roundStrategy"] }
stored_sig = trace["signature"]

# 2. Canonicalizar (usando lib JCS)
from canonicaljson import encode_canonical_json
cstring = encode_canonical_json(payload).decode()

# 3. Recalcular hash
hash = hashlib.blake2b((cstring + salt).encode(), digest_size=32).hexdigest()

# 4. Comparar
assert hash == stored_sig, "⚠️ Assinatura inválida — dado adulterado!"
```

---

## Exemplo completo

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

// 1. Criar jurisdição
const Financas = CalcAUY.create({
  contextLabel: "nf-e",
  salt: "segredo-fiscal-2026",
  roundStrategy: "NBR5891",
});

// 2. Construir e fechar cálculo
const resultado = await Financas
  .from(50000)
  .mult("1.2")
  .commit();

// 3. Obter rastro assinado
const trace = resultado.toAuditTrace();
// trace = {
//   ast: { ... },
//   finalResult: { n: "60000", d: "1" },
//   roundStrategy: "NBR5891",
//   signature: "f796f67a8454eac8b1c...", ← assinatura
//   contextLabel: "nf-e"
// }

// 4. Verificar integridade
await CalcAUY.checkIntegrity(trace, { salt: "segredo-fiscal-2026" });
// ✅ passa: o hash confere

// 5. Simular adulteração
trace.finalResult = { n: "70000", d: "1" };
await CalcAUY.checkIntegrity(trace, { salt: "segredo-fiscal-2026" });
// ❌ integrity-critical-violation: assinatura não corresponde ao payload
```

---

## A assinatura no nó `control`

Quando um cálculo é importado de outra jurisdição via `fromExternalInstance()`, a assinatura original é preservada no nó `control`:

```json
{
  "kind": "control",
  "type": "reanimation_event",
  "metadata": {
    "previousContextLabel": "logistic",
    "previousSignature": "a1b2c3d4...",  // ← assinatura ORIGINAL
    "previousRoundStrategy": "HALF_UP",
    "timestamp": "2026-05-03T13:39:49.029Z"
  },
  "child": { "kind": "literal", "value": { "n": "50", "d": "1" } }
}
```

Isso permite rastrear a cadeia de custódia: o valor `50` veio da jurisdição "logistic", foi assinado com o salt dela, e a assinatura original está disponível para verificação independente.

---

## Diferença entre `signature` e `integrity-critical-violation`

| Termo | O que é |
|-------|---------|
| `signature` | String de 64 caracteres HEX (padrão) ou similar. O hash BLAKE3 codificado. |
| `integrity-critical-violation` | Erro RFC 7807 (Status 500) lançado quando a verificação falha. É o mecanismo que protege a integridade. |

---

[↑ Voltar ao índice](../index.md)
