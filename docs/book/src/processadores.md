# Processadores (serialização binária)

O schema é versionado (ADR-013) e vive em `schema/`:

- `calc_auy.proto` — projeção Protobuf v1.
- `calc_auy.schema.json` — JSON Schema draft 2020-12.
- `calc_auy.cddl` — forma *wire* canônica.

Os codecs (`calc-auy-processors`) são **Protobuf** (`prost`), **CBOR**
(`ciborium`) e **MessagePack** (`rmp-serde`), todos determinísticos e com
*golden bytes*. A geração do schema é idempotente:

```console
$ cargo run -q -p xtask -- schema
schema: em sincronia (idempotente)
```

`Format::encode`/`decode` compartilham um modelo *wire* único, e os limites são
reaplicados na reconstrução da arena.

## Persistência e `to_custom_output`

Além dos codecs, o seam `OutputProcessor` permite estender a saída sem alterar o
núcleo. O processador de persistência achata o rastro em colunas de banco
(`signature`, `context_label`, `round_strategy`, `result_numerator`,
`result_denominator`, `ast`):

```rust
use calc_auy_processors::persistence::PersistenceProcessor;

let record = output.to_custom_output(&PersistenceProcessor, (), &realizer)?;
```
