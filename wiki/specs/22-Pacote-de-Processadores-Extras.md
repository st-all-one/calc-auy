# 22 - Pacote de Processadores Extras (Modulares)

## Princípio de Design

A biblioteca central (`mod.ts`) tem **zero dependências externas**. Todos os processadores extras residem em `processor/` e são carregados sob demanda via importação explícita:

```typescript
import { protobufProcessor } from "@st-all-one/calc-auy/processor/protobuffer";
import { msgpackProcessor } from "@st-all-one/calc-auy/processor/msgpack";
```

Cada processador implementa a interface `CalcAUYCustomOutput<Toutput, Toptions>` definida em `src/output_internal/types.ts`:

```typescript
export type CalcAUYCustomOutput<Toutput, Toptions extends OutputOptions = OutputOptions> =
    (this: CalcAUYOutput, ctx: CalcAUYCustomOutputContext<Toptions>) => Toutput;
```

O contexto recebido (`ctx`) expõe:

- `ctx.result: RationalNumber` — resultado bruto
- `ctx.ast: CalculationNode` — AST completa
- `ctx.roundStrategy: RoundingStrategy` — estratégia aplicada
- `ctx.audit` — { latex, unicode, verbal } pré-renderizados
- `ctx.methods` — todos os métodos de `CalcAUYOutput` (`.toLiveTrace()`, `.toMonetary()`, etc.)
- `ctx.options` — opções do processador

O padrão comum é:

```typescript
// Exemplo: todos os processadores chamam toLiveTrace() primeiro
const obj = ctx.methods.toLiveTrace();
if (!obj.finalResult || !obj.roundStrategy) {
    throw new Error("Incomplete Audit Trace");
}
// ... transformação específica do formato
```

## Mapas de Compressão (KIND_MAP / OP_MAP)

Os formatos binários (Protobuf, MsgPack, CBOR) compartilham os mesmos mapas de inteiros para representação compacta dos tipos de nó e operação.

### `KIND_MAP` — Tipos de Nó

```typescript
const KIND_MAP: Record<string, number> = {
    literal:   1,
    operation: 2,
    group:     3,
    control:   4,
};
const REV_KIND_MAP: Record<number, string> = {
    1: "literal",
    2: "operation",
    3: "group",
    4: "control",
};
```

### `OP_MAP` — Tipos de Operação

```typescript
const OP_MAP: Record<string, number> = {
    add:             1,
    sub:             2,
    mul:             3,
    div:             4,
    pow:             5,
    mod:             6,
    divInt:          7,
    crossContextAdd: 8,
};
const REV_OP_MAP: Record<number, string> = {
    1: "add",   2: "sub",   3: "mul",   4: "div",
    5: "pow",   6: "mod",   7: "divInt", 8: "crossContextAdd",
};
```

## Protobuf (`processor/protobuffer/`)

**Arquivo**: `processor/protobuffer/processor.protobuffer.ts`

**Dependência**: `protobufjs`

### Schema (`PROTO_DEF` embutido)

Schema Protobuf v3 definido como string literal em `processor.protobuffer.ts:12-58`. Destaques:

```protobuf
syntax = "proto3";
package calc_auy;

enum OperationType {
  OPERATION_TYPE_UNSPECIFIED = 0;
  OPERATION_TYPE_ADD = 1;
  OPERATION_TYPE_SUB = 2;
  OPERATION_TYPE_MULT = 3;
  OPERATION_TYPE_DIV = 4;
  OPERATION_TYPE_POW = 5;
  OPERATION_TYPE_MOD = 6;
  OPERATION_TYPE_DIV_INT = 7;
  OPERATION_TYPE_CROSS_CONTEXT_ADD = 8;
}

message CalculationNode {
  map<string, MetadataValue> metadata = 1;
  oneof node_type {
    LiteralNode literal = 2;
    OperationNode operation = 3;
    GroupNode group = 4;
    ControlNode control = 5;
  }
}

message SerializedCalculation {
  CalculationNode ast = 1;
  string signature = 2;
  string contextLabel = 3;
  optional RationalValue finalResult = 4;
  optional string roundStrategy = 5;
}
```

O uso de `oneof node_type` elimina a necessidade do campo `kind` — o tipo do nó é inferido pela presença do campo no oneof. `finalResult` e `roundStrategy` são `optional` para compatibilidade com hibernações puras (sem resultado finalizado).

### `transformNode()` — AST → Protobuf

```typescript
// processor.protobuffer.ts:174-207
function transformNode(node: CalculationNode): IProtoNode {
    // kind é mapeado para oneof: literal → { literal: {...} }, operation → { operation: {...} }, etc.
    if (node.kind === "literal") {
        res.literal = { value: { n: node.value.n, d: node.value.d }, originalInput: node.originalInput };
    } else if (node.kind === "operation") {
        res.operation = { type: OP_MAP[node.type], operands: node.operands.map(transformNode) };
    }
    // ...
}
```

### `reverseTransformNode()` — Protobuf → AST

O oneof é testado por presença de campo:

```typescript
// processor.protobuffer.ts:209-258
function reverseTransformNode(node: IProtoNode): CalculationNode {
    if (node.literal) { return { kind: "literal", value: node.literal.value, ... }; }
    if (node.operation) { return { kind: "operation", type: REV_OP_MAP[node.operation.type], ... }; }
    if (node.group) { return { kind: "group", child: reverseTransformNode(node.group.child) }; }
    if (node.control) { return { kind: "control", type: "reanimation_event", ... }; }
    throw new Error("Invalid node structure during Protobuf hydration");
}
```

### `protobufProcessor`

```typescript
export const protobufProcessor: CalcAUYCustomOutput<Uint8Array> = function (ctx): Uint8Array {
    const obj = ctx.methods.toLiveTrace();
    if (!obj.finalResult || !obj.roundStrategy) { throw new Error(...); }
    const payload = { ast: transformNode(obj.ast), finalResult: obj.finalResult, ... };
    const message = SerializedCalculationMsg.create(payload);
    return SerializedCalculationMsg.encode(message).finish();
};
```

### Hidratação reversa: `protobufHydrator(buffer: Uint8Array): SerializedCalculation`

Usa `protobufjs` decode + `toObject` com `enums: String, longs: String, oneofs: true` para produzir objeto plano, depois `reverseTransformNode()`.

## MessagePack (`processor/msgpack/`)

**Arquivo**: `processor/msgpack/processor.msgpack.ts`

**Dependência**: `@std/msgpack`

### Representação com Inteiros

O `kind` do nó é armazenado como inteiro via `KIND_MAP`:

```typescript
// processor.msgpack.ts:75-106
function transformNode(node: CalculationNode): ValueType {
    const res = { kind: KIND_MAP[node.kind] };
    if (node.kind === "literal") {
        res.value = { n: node.value.n, d: node.value.d };
        res.originalInput = node.originalInput;
    } else if (node.kind === "operation") {
        res.type = OP_MAP[node.type];
        res.operands = node.operands.map(transformNode);
    }
    // ...
}
```

O payload MsgPack:

```typescript
const payload = {
    ast: transformNode(obj.ast),
    finalResult: { n: obj.finalResult.n, d: obj.finalResult.d },
    roundStrategy: obj.roundStrategy,
    signature: obj.signature,
    contextLabel: obj.contextLabel,
};
return encode(payload);
```

### `msgpackHydrator(buffer: Uint8Array): SerializedCalculation`

Decodifica com `decode()` do `@std/msgpack`, depois aplica `reverseTransformNode()` usando `REV_KIND_MAP` e `REV_OP_MAP`.

## CBOR (RFC 8949) (`processor/cbor/`)

**Arquivo**: `processor/cbor/processor.cbor.ts`

**Dependência**: `@std/cbor`

### Estrutura Idêntica ao MsgPack

O CBOR processor segue exatamente a mesma lógica de `KIND_MAP`/`OP_MAP` e `transformNode()`:

```typescript
export const cborProcessor: CalcAUYCustomOutput<Uint8Array> = function (ctx): Uint8Array {
    const obj = ctx.methods.toLiveTrace();
    if (!obj.finalResult || !obj.roundStrategy) { throw new Error(...); }
    const payload = {
        ast: transformNode(obj.ast),
        finalResult: { n: obj.finalResult.n, d: obj.finalResult.d },
        roundStrategy: obj.roundStrategy,
        signature: obj.signature,
        contextLabel: obj.contextLabel,
    };
    return encodeCbor(payload);
};
```

### `cborHydrator(buffer: Uint8Array): SerializedCalculation`

Decodifica com `decodeCbor()` do `@std/cbor`, depois `reverseTransformNode()`.

## HTML (`processor/html/`)

**Arquivo**: `processor/html/processor.html.ts`

**Dependência**: KaTeX (via `vendor.ts`)

### Renderização com KaTeX

```typescript
import { htmlProcessor } from "@st-all-one/calc-auy/processor/html";
const html = output.toCustomOutput(htmlProcessor);
```

O processador:

1. Chama `ctx.methods.toLiveTrace()` para obter AST e resultado.
2. Converte a AST para LaTeX via `ctx.audit.latex`.
3. Renderiza o LaTeX com KaTeX (`katex.renderToString()`).
4. Embrulha em HTML completo com CSS inline auto-contido.

### Estrutura da Saída

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>/* KaTeX CSS embutido */</style>
</head>
<body>
  <div class="calcauy-output">
    <div class="calcauy-formula">${katexHtml}</div>
    <div class="calcauy-result">${resultado}</div>
    <div class="calcauy-meta">
      <span class="label">Estratégia:</span> ${roundStrategy}
      <span class="label">Assinatura:</span> ${signature.slice(0, 16)}...
    </div>
  </div>
</body>
</html>
```

## Image Buffer (SVG) (`processor/image-buffer/`)

**Arquivos**: `processor/image-buffer/processor.imagebuffer.ts`, `image_utils.ts`

**Dependência**: Renderização HTML interna

```typescript
import { imageBufferProcessor } from "@st-all-one/calc-auy/processor/image-buffer";
const svgBuffer = output.toCustomOutput(imageBufferProcessor);
```

### Técnica: HTML → SVG `foreignObject`

1. Gera HTML completo (reutiliza o `htmlProcessor` internamente).
2. Embrulha em `<svg><foreignObject width="..." height="...">`.
3. O SVG resultante pode ser salvo como arquivo `.svg` ou convertido para PNG buffer.

### Utilitários (`image_utils.ts`)

- `htmlToSvgBuffer(html: string): Uint8Array` — wraps HTML em SVG foreignObject
- `svgToPngBuffer(svg: Uint8Array): Promise<Uint8Array>` — conversão via Canvas API (Deno)

## Persistence (`processor/persistence/`)

**Arquivo**: `processor/persistence/processor.persistence.ts`

**Dependência**: Nenhuma (zero dep)

### Interface de Saída

```typescript
export interface ICalcAUYPersistenceRecord {
    signature: string;
    context_label: string;
    round_strategy: string;
    result_numerator: string;
    result_denominator: string;
    ast: InternalTypes.ASTTypes.CalculationNode;
}
```

### Implementação

```typescript
export const persistenceProcessor: CalcAUYCustomOutput<ICalcAUYPersistenceRecord> = function (ctx) {
    const trace = ctx.methods.toLiveTrace();
    if (!trace.finalResult) {
        throw new Error("Persistence error: finalResult is required for storage.");
    }
    return {
        signature: trace.signature,
        context_label: trace.contextLabel,
        round_strategy: trace.roundStrategy || "NBR-5891",
        result_numerator: trace.finalResult.n,
        result_denominator: trace.finalResult.d,
        ast: trace.ast,
    };
};
```

### Schema SQL / Prisma

O record é desnormalizado para inserção direta:

```sql
CREATE TABLE calcauy_audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature       TEXT NOT NULL UNIQUE,
    context_label   TEXT NOT NULL,
    round_strategy  TEXT NOT NULL DEFAULT 'NBR-5891',
    result_numerator   TEXT NOT NULL,
    result_denominator TEXT NOT NULL,
    ast             JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```prisma
model CalcAUYAuditTrail {
    id               String   @id @default(uuid()) @db.Uuid
    signature        String   @unique
    context_label    String
    round_strategy   String   @default("NBR-5891")
    result_numerator   String
    result_denominator String
    ast              Json
    created_at       DateTime @default(now()) @db.Timestamptz
}
```

## Métricas de Performance

Testes comparativos entre formatos (resultados aproximados, AST com 10 nós):

| Formato | Tamanho (bytes) | Redução vs JSON | Leitura (ms) | Escrita (ms) |
|---------|----------------|----------------|-------------|-------------|
| JSON    | 2.150          | —              | 0,08        | 0,12        |
| MsgPack | 1.580          | 26%            | 0,05        | 0,09        |
| CBOR    | 1.540          | 28%            | 0,05        | 0,09        |
| Protobuf| 1.380          | 36%            | 0,04        | 0,07        |

Formatos binários (Protobuf, MsgPack, CBOR) têm leitura ~2x mais rápida que JSON e são armazenáveis como `BLOB` no banco, reduzindo tráfego de rede e armazenamento.

## Estrutura de Diretórios

```
processor/
├── protobuffer/
│   ├── deno.jsonc
│   ├── processor.protobuffer.ts    # transformNode, reverseTransformNode, protobufHydrator
│   └── protobuf.test.ts
├── msgpack/
│   ├── deno.jsonc
│   ├── processor.msgpack.ts        # KIND_MAP/OP_MAP, transformNode, msgpackHydrator
│   └── msgpack.test.ts
├── cbor/
│   ├── deno.jsonc
│   ├── processor.cbor.ts           # KIND_MAP/OP_MAP, transformNode, cborHydrator
│   └── cbor.test.ts
├── html/
│   ├── deno.jsonc
│   ├── processor.html.ts           # HTML + KaTeX embedding
│   ├── vendor.ts                   # KaTeX vendor lock
│   └── html.test.ts
├── image-buffer/
│   ├── deno.jsonc
│   ├── processor.imagebuffer.ts    # SVG foreignObject wrapper
│   ├── image_utils.ts              # htmlToSvgBuffer, svgToPngBuffer
│   └── image_buffer.test.ts
└── persistence/
    ├── deno.jsonc
    ├── processor.persistence.ts    # ICalcAUYPersistenceRecord
    └── persistence.test.ts
```

## Referência de Código

- `src/output_internal/types.ts` — `CalcAUYCustomOutput`, `CalcAUYCustomOutputContext`
- `processor/protobuffer/processor.protobuffer.ts` — Protobuf processor + hydrator
- `processor/msgpack/processor.msgpack.ts` — MsgPack processor + hydrator
- `processor/cbor/processor.cbor.ts` — CBOR processor + hydrator
- `processor/html/processor.html.ts` — HTML com KaTeX
- `processor/image-buffer/processor.imagebuffer.ts` — SVG foreignObject
- `processor/image-buffer/image_utils.ts` — htmlToSvgBuffer, svgToPngBuffer
- `processor/persistence/processor.persistence.ts` — PersistenceRecord

[↑ Voltar ao índice](../../index.md)
