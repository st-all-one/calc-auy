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
