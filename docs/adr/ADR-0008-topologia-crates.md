# ADR-0008: Topologia de Crates

## Status
Aceito

## Contexto
Organizar o projeto em módulos coesos com dependências claras.

## Decisão
```
calc-auy-rs/
├── crates/
│   ├── calc-auy-core/       # Rational, AST, engine, rounding, canonical, signature, error
│   ├── calc-auy-parser/     # lexer + parser → AST
│   ├── calc-auy-builder/    # fluent API + custodía + hibernate/hydrate
│   ├── calc-auy-output/     # monetary, latex, unicode, slice, audit, mermaid
│   ├── calc-auy-i18n/       # SRL + realizers
│   ├── calc-auy-processors/ # protobuf, cbor, msgpack
│   ├── calc-auy-api/        # FACHADA: superfície pública única
│   ├── calc-auy-wasm/       # cdylib wasm-bindgen
│   └── calc-auy/            # BINÁRIO final: CLI
└── xtask/                   # tarefas de build
```

## Consequências
- `calc-auy` é binário (`[[bin]]`)
- `calc-auy-wasm` é `cdylib`
- `calc-auy-api` é a única superfície pública de biblioteca
