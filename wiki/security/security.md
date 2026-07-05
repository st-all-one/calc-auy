# Segurança e Auditoria Forense

## Modelo de Ameaças

| Vetor de Ataque | Mecanismo de Defesa | Implementação Técnica |
| :--- | :--- | :--- |
| **BigInt Memory Exhaustion (DoS)** | Bit-Limit Guard | `MAX_BI_BITS = 1.000.000`. Bloqueia alocação de inteiros gigantescos que esgotariam a RAM. |
| **Vazamento de PII em Logs** | Redação por Padrão | `CalcAUY.create({ sensitive: true })`. Valores substituídos por `[PII]` em logs técnicos. |
| **Manipulação de Rastro (Tampering)** | Lacre BLAKE3 | Assinatura digital do estado final (AST + Resultado). Qualquer alteração de 1 bit invalida o rastro. |
| **Injeção de Código (XSS/RCE)** | Lexer Estrito | `parseExpression()` usa Parser de Descida Recursiva puro, sem `eval()`. |
| **Hydration Poisoning** | Signature Confrontation | `hydrate()` exige o `salt` correto para validar a assinatura antes de reconstruir a árvore. |
| **Cross-Context Contamination** | Instance Isolation | `Symbol` identidade única por instância; runtime barra operandos de jurisdições diferentes. |

---

## Isolamento por Jurisdição

A CalcAUY abandona estado global em favor de um modelo baseado em instâncias isoladas via `CalcAUY.create()`:

```typescript
const jurisA = CalcAUY.create({ contextLabel: "logistic", salt: "S1" });
const jurisB = CalcAUY.create({ contextLabel: "finance", salt: "S2" });
```

### Mecanismo de Identidade Dual

**Camada de Runtime (Identity Symbols):** Cada instância possui um `unique symbol` gerado internamente. Todos os métodos (`add`, `mult`, etc.) verificam igualdade referencial do Symbol antes de aceitar operandos. Symbols divergentes lançam `instance-mismatch`.

**Camada de IDE (Branding Types):** `Const Type Parameters` capturam a literalidade da configuração. O TypeScript enxerga instâncias com configurações diferentes como tipos incompatíveis.

### Portal de Integração Cross-Context

O método `addFromExternalInstance` é o único portal legítimo para união de jurisdições:

1. A instância externa é imediatamente assinada via `hibernate()`
2. O rastro externo é validado contra o segredo daquela jurisdição
3. A árvore externa é envolvida em um nó `control`
4. A união é protegida por um `GroupNode` automático

### Matriz de Segurança de Jurisdição

| Cenário | Resultado IDE | Resultado Runtime | Mecanismo |
| :--- | :--- | :--- | :--- |
| Mesma Instância | ✅ Sucesso | ✅ Sucesso | Identidade Referencial |
| Labels Iguais / Instâncias Diferentes | ✅ Sucesso | ❌ `instance-mismatch` | Symbols Divergentes |
| Configurações Diferentes (Salt/Sensitive) | ❌ Type Error | ❌ `instance-mismatch` | Literal Branding |
| Integração via Portal | ✅ Sucesso | ✅ Sucesso | Nó `control` |

---

## Assinatura Digital (BLAKE3 + JCS)

### Canonical String (RFC 8785)

Para que o hash de um objeto seja determinístico (mesmo hash para o mesmo conteúdo, independente da ordem das chaves), a biblioteca implementa o **JSON Canonicalization Scheme (JCS)**, definido pela **RFC 8785**.

Diferente de abordagens ad-hoc ("k-sort"), JCS é um padrão formal com implementações em Python, Go, Rust e Java, permitindo que um auditor externo verifique assinaturas sem reimplementar a canonização.

**Regras de Transformação:**

- **Ordenação de Chaves:** Todas as chaves de um objeto são ordenadas por código Unicode (UTF-8 code point order)
- **Recursividade Profunda:** Aplicado a todos os níveis de objetos aninhados (AST, metadados, carimbos)
- **Números — Formatação Canônica (JCS §3.2.2.2):**
  - Sem expoente: `1e+21` → `1000000000000000000000`
  - Sem zeros à esquerda
  - Sem zeros à direita após ponto decimal
  - Sem ponto decimal para inteiros: `1.0` → `1`
  - `-0` → `0`
- **Strings:** Escapadas conforme JSON (`\"`, `\\`, `\n`, `\t`, etc.)
- **Arrays:** Processados sequencialmente mantendo ordem original, com canonização em cada item
- **`undefined` em valor de objeto:** Chave omitida

**Type Guards:**

| Tipo | Comportamento |
|------|---------------|
| `BigInt` | `TypeError` — converta para string primeiro |
| `Date` | `TypeError` — converta para ISO string primeiro |
| `RegExp` | `TypeError` |
| `function` | `TypeError` |
| `symbol` | `TypeError` |
| `undefined` (raiz) | `TypeError` |
| `Infinity` / `NaN` | `TypeError` — não são finitos |

> Rejeitar em vez de converter evita assinaturas impossíveis de verificar em linguagens sem esses tipos.

### Geração da Assinatura

```typescript
const cString = canonicalString(data);   // RFC 8785
const payload = new TextEncoder().encode(cString + salt);  // salt binding
const hash = await crypto.subtle.digest("BLAKE3", payload); // 256 bits
```

**Codificações suportadas:**

| Encoder | Uso recomendado |
|---------|-----------------|
| `"HEX"` (padrão) | Interoperabilidade com bancos de dados |
| `"BASE64"` | Transporte web compacto |
| `"BASE58"` | Auditoria manual (evita 0/O, l/I ambíguos) |
| `"BASE32"` | Sistemas com restrição de case-sensitivity |

**Payloads assinados:**

- **`hibernate()`** — assina `{ ast }` (apenas estrutura da árvore)
- **`commit()` / `toAuditTrace()`** — assina `{ ast, finalResult, roundStrategy }`

### Validação (checkIntegrity / hydrate)

```typescript
// Verificação estática sem reconstruir a árvore
await CalcAUY.checkIntegrity(jsonRecebido, { salt: "meu_segredo" });

// Validação durante re-hidratação
const instance = CalcAUY.create({ contextLabel: "audit", salt: "meu_segredo" });
const calc = await instance.hydrate(jsonProtegido);
```

O sistema recalcula o hash local usando o segredo da jurisdição. Divergência de um único bit bloqueia o processamento via erro `integrity-critical-violation` (Status 500).

---

## Proteção de PII

### 3 Camadas

**Camada 1 — Política por Instância:**

A política de sensibilidade é definida na criação da jurisdição:

```typescript
const secureCalc = CalcAUY.create({
  contextLabel: "bank",
  sensitive: true,
  salt: "S1",
});
```

Quando `sensitive: true`:
- Numerador (`n`) e denominador (`d`) substituídos por `[PII]`
- `originalInput` ofuscado
- Metadados de negócio redigidos

**Exceções técnicas:** Metadados do nó `control` (timestamp, `previousContextLabel`, `previousSignature`) **nunca** são redigidos — a linhagem do dado permanece rastreável mesmo em modo restrito.

**Camada 2 — Controle Granular via Metadata:**

O desenvolvedor pode marcar nós individuais:

- `.setMetadata("pii", true)` — ocultação forçada
- `.setMetadata("pii", false)` — libera visibilidade de constantes públicas (ex: alíquota de 18%)

**Camada 3 — Propagação em Cascata (PII Propagation):**

1. Nós `literal` sem override explícito de `pii` herdam o estado do nó pai
2. Marcar uma operação complexa como sensível protege todos os sub-nós recursivamente
3. O nó `control` em integrações cross-context mantém a sensibilidade da jurisdição de origem

---

## Rastreamento Forense

### UUID v7 Forense

Cada erro (`CalcAUYError`) recebe um UUID v7 como identificador único:

1. **Ordenação temporal:** Timestamp embutido permite ordenar erros de servidores diferentes sem depender do relógio do sistema de log
2. **Eficiência em banco de dados:** Sequenciais no tempo, amigáveis a índices B-Tree
3. **Correlação:** O mesmo `urn:uuid:...` aparece na resposta da API (RFC 7807) e nos logs de telemetria

### Rastro de Auditoria

O método `toAuditTrace()` revela toda a história do dado:

```json
{
  "kind": "operation",
  "type": "crossContextAdd",
  "operands": [
    { "kind": "literal", "value": "100" },
    {
      "kind": "group",
      "child": {
        "kind": "control",
        "metadata": {
          "previousContextLabel": "logistic",
          "previousSignature": "blake3_hash_..."
        },
        "child": { "kind": "literal", "value": "50" }
      }
    }
  ]
}
```

O nó `control` armazena obrigatoriamente:
- `previousContextLabel` — nome da jurisdição de origem
- `previousSignature` — assinatura original do dado antes da integração
- `previousRoundStrategy` — estratégia de arredondamento do contexto anterior
- `timestamp` — carimbo do momento da integração

Isso garante que um auditor saiba exatamente que o valor `50` não foi gerado pela jurisdição atual, mas importado de um rastro assinado pela jurisdição "Logística".

---

[↑ Voltar ao índice](../index.md)
