# Pacote de Processadores Extras

O core da CalcAUY foca em precisão absoluta sem dependências externas. Processadores extras disponíveis em `processor/` permitem formatos binários, visuais e de persistência sem inflar o bundle principal.

## Formatos Binários

### CBOR (RFC 8949)
Serialização binária compacta via `@std/cbor`.

```typescript
import { cborProcessor, cborHydrator } from "@st-all-one/calc-auy/processor/cbor";
const buffer = resultado.toCustomOutput(cborProcessor);
const restaurado = cborHydrator(buffer);
```

### MessagePack
Serialização binária via `@std/msgpack`.

```typescript
import { msgpackProcessor, msgpackHydrator } from "@st-all-one/calc-auy/processor/msgpack";
```

### Protobuf v3
Schema-first, maior compressão, compatibilidade cross-language.

```typescript
import { protobufProcessor, protobufHydrator } from "@st-all-one/calc-auy/processor/protobuffer";
```

## Renderização Visual

### HTML (KaTeX)
Gera fragmento HTML auto-contido com fórmulas matemáticas renderizadas.

```typescript
import { htmlProcessor } from "@st-all-one/calc-auy/processor/html";
const html = resultado.toCustomOutput(htmlProcessor);
```

### Image (SVG)
Encapsula a renderização em SVG para ambientes sem suporte HTML complexo.

```typescript
import { imageBufferProcessor } from "@st-all-one/calc-auy/processor/image-buffer";
const svg = resultado.toCustomOutput(imageBufferProcessor);
```

## Persistência SQL

Mapeia o rastro para um record denormalizado para inserção em bancos relacionais.

```typescript
import { persistenceProcessor } from "@st-all-one/calc-auy/processor/persistence";
const record = resultado.toCustomOutput(persistenceProcessor);
// record: { signature, context_label, round_strategy, result_numerator, result_denominator, ast }
```

## Benchmarks

Em testes com 100.000 cálculos de juros compostos persistidos em SQLite3:

- **Protobuf** reduziu armazenamento em **36%** comparado a JSON
- **BINários (BLOB)** foram **2x mais rápidos** que parse de strings JSON (TEXT)
- **Zero impacto** no `mod.ts` principal — importe apenas o que usar

---

[↑ Voltar ao índice](../index.md)
