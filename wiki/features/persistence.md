# Persistência e Reidratação

## Hibernação (`hibernate()`)

Serializa a AST atual em uma string JSON assinada, sem resultado final — a árvore é congelada em seu estado intermediário.

**Processo:**

1. Achata a cadeia de metadados via `flattenASTMetadata()`
2. Injeta o `birthTime` (timestamp de nascimento) no metadata raiz
3. Gera assinatura BLAKE3 **apenas da AST** (sem `finalResult`/`roundStrategy`)
4. Produz `SerializedCalculation` com `{ ast, signature, contextLabel }`

> **Diferença crucial:** o payload de `hibernate()` contém **apenas** `ast` + `signature` + `contextLabel`. Os campos `finalResult` e `roundStrategy` estão **ausentes** — eles só aparecem em traces de `commit()`.

**`SerializedCalculation` (hibernate):**
```typescript
{
  ast: CalculationNode,       // Árvore completa com metadata
  signature: string,           // BLAKE3 do ast + salt
  contextLabel: string         // Jurisdição de origem
}
```

**Determinismo:** a mesma AST sempre produz a mesma string de hibernação (útil para hashing e comparação).

## Reidratação (`hydrate()`)

Reconstrói um `CalcAUYLogic` funcional a partir de uma string JSON assinada, validando a integridade bit-a-bit.

**Processo:**

1. Parse do JSON
2. Verificação de assinatura: recalcula o hash BLAKE3 do conteúdo e compara com a assinatura armazenada
3. Se o payload contém `finalResult` e `roundStrategy`, é um *audit trace* (assinado como envelope completo). Caso contrário, é um *hibernate trace* (assinado como AST pura)
4. Valida a estrutura da AST (`validateASTNode()`)
5. Extrai o `birthTime` original (se disponível no metadata)
6. Envolve a árvore restaurada em um **`ControlNode`** (tipo `reanimation_event`) com metadados de procedência
7. Agrupa em `GroupNode` para tratamento como unidade léxica atômica

**ControlNode.metadata gerado:**
```typescript
{
  previousContextLabel: string,    // Jurisdição original
  previousSignature: string,      // Assinatura validada
  previousRoundStrategy: string   // Estratégia original (vazio se hibernate)
}
```

**`hydrate()` pode aceitar salt/encoder diferentes** da instância atual para reanimar dados de outro contexto.

## Integração entre Contextos (`fromExternalInstance()`)

Dual handshake: validação de assinatura + isolamento de jurisdição.

- Se a instância atual está vazia (`ast === null`), a árvore externa torna-se a **raiz** do cálculo
- Se já possui cálculo, realiza **união** via operação `crossContextAdd`
- O nó de controle preserva a linhagem forense (contexto original, assinatura, estratégia de arredondamento)
- Tentar misturar instâncias sem `fromExternalInstance()` dispara `instance-mismatch`

## Schema de Persistência

A pasta `schema/` contém definições formais para armazenamento de rastros de auditoria:

| Formato | Arquivo | Uso |
|---------|---------|-----|
| JSON Schema | `schema/audit.schema.json` | Validação estrutural |
| CDDL | `schema/audit.cddl` | CBOR/REST |
| Proto | `schema/audit.proto` | Protobuf |
| SQL | `schema/audit.sql` | PostgreSQL/SQLite |
| Prisma | `schema/audit.prisma` | ORM |
| GraphQL | `schema/audit.graphql` | API |
| Kysely | `schema/audit.kysely.ts` | Type-safe SQL |

**Processors binários** (`processor/`): protobuf, cbor, msgpack — consumíveis via `toCustomOutput()`.

---

[↑ Voltar ao índice](../index.md)
