# 02 — Arquitetura Proposta em Rust

> ⚠️ **Parcialmente superado pelo [doc 14](./14-arquitetura-oficial-rust.md)** (ADR-008): o crate
> `calc-auy` é o **binário** (CLI), a superfície pública fica em `calc-auy-api` e há um crate
> `calc-auy-wasm` de alta prioridade.

## Princípios Fundamentais

### 1. Core Enxuto e Performático

O **core** deve conter apenas o essencial para:
- Representar números racionais exatos
- Construir e avaliar ASTs
- Aplicar arredondamento
- Assinar e verificar integridade

**Tudo o mais é camada.**

### 2. Camadas Desacopladas

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APLICAÇÃO                      │
│  (CLI, Server, Library, Tests)                                  │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE PROCESSADORES                  │
│  (Protobuf, CBOR, MessagePack, HTML, Image, Persistence)        │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE SAÍDA                          │
│  (Monetary, LaTeX, Unicode, Verbal, Mermaid, Slicer)            │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE BUILDER                        │
│  (Fluent API, Instance Management, Hibernate/Hydrate)           │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE PARSER                         │
│  (Lexer, Parser, Expression Evaluation)                         │
├─────────────────────────────────────────────────────────────────┤
│                        CORE                                     │
│  (Rational, AST, Engine, Rounding, Signature, Error)            │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Zero-Cost Abstractions

- **Traits** para outputs (sem vtable dispatch quando possível)
- **Genéricos** para estratégias de rounding
- **Const generics** para limites configuráveis

### 4. Type State Pattern

Garantir em tempo de compilação que:
- ASTs só podem ser avaliadas após commit
- Instâncias só podem ser combinadas se do mesmo contexto
- Assinaturas só podem ser geradas com salt válido

---

## Estrutura de Crates

### Workspace Layout

```toml
# Cargo.toml (workspace root)
[workspace]
members = [
    "crates/calc-auy-core",
    "crates/calc-auy-builder",
    "crates/calc-auy-output",
    "crates/calc-auy-parser",
    "crates/calc-auy-i18n",
    "crates/calc-auy-processors",
]

[workspace.dependencies]
num-bigint = "0.4"
num-traits = "0.2"
num-integer = "0.1"
serde = { version = "1.0", features = ["derive"] }
thiserror = "1.0"
blake3 = "1.5"
```

### Dependências por Crate

| Crate | Dependências |
|-------|--------------|
| `calc-auy-core` | `num-bigint`, `num-traits`, `num-integer`, `blake3`, `serde`, `thiserror` |
| `calc-auy-builder` | `calc-auy-core` |
| `calc-auy-output` | `calc-auy-core`, `calc-auy-i18n` |
| `calc-auy-parser` | `calc-auy-core` |
| `calc-auy-i18n` | (nenhuma ou `fluent`) |
| `calc-auy-processors` | `calc-auy-core`, `prost`, `ciborium`, `rmp-serde` |

---

## API Pública Proposta

### Core API

```rust
// calc-auy-core/src/lib.rs

pub use rational::Rational;
pub use ast::{Ast, Node, OperationType};
pub use engine::eval;
pub use rounding::{RoundingStrategy, apply_rounding};
pub use signature::{sign, verify, SignatureEncoder};
pub use error::{CalcAuyError, ErrorCategory};
```

### Builder API

```rust
// calc-auy-builder/src/lib.rs

pub struct CalcAuyBuilder {
    ast: Option<Ast>,
    instance_id: InstanceId,
    config: InstanceConfig,
    birth_time: Option<String>,
}

impl CalcAuyBuilder {
    pub fn new(config: InstanceConfig) -> Self;
    pub fn from<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn add<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn sub<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn mul<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn div<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn pow<T: Into<Rational>>(&self, value: T) -> Self;
    pub fn group(&self) -> Self;
    pub fn set_metadata(&self, key: &str, value: MetadataValue) -> Self;
    pub fn commit(&self) -> Result<CalcAuyOutput, CalcAuyError>;
    pub fn hibernate(&self) -> Result<String, CalcAuyError>;
    pub fn hydrate(json: &str, config: &InstanceConfig) -> Result<Self, CalcAuyError>;
}
```

### Output API

```rust
// calc-auy-output/src/lib.rs

pub struct CalcAuyOutput {
    result: Rational,
    ast: Ast,
    round_strategy: RoundingStrategy,
    signature: String,
    config: InstanceConfig,
}

impl CalcAuyOutput {
    pub fn to_string_number(&self, options: Option<OutputOptions>) -> String;
    pub fn to_monetary(&self, options: Option<OutputOptions>) -> String;
    pub fn to_latex(&self, options: Option<OutputOptions>) -> String;
    pub fn to_unicode(&self, options: Option<OutputOptions>) -> String;
    pub fn to_verbal_a11y(&self, options: Option<OutputOptions>) -> String;
    pub fn to_mermaid_graph(&self, options: Option<OutputOptions>) -> String;
    pub fn to_slice(&self, parts: usize, options: Option<OutputOptions>) -> Vec<String>;
    pub fn to_audit_trace(&self) -> String;
    pub fn to_json(&self, keys: Option<Vec<&str>>, options: Option<OutputOptions>) -> String;
}
```

---

## Type State Pattern

Para garantir segurança em tempo de compilação:

```rust
// Estados do builder
pub struct Empty;
pub struct Building;
pub committed;

pub struct CalcAuyBuilder<State = Empty> {
    ast: Option<Ast>,
    state: PhantomData<State>,
}

// Só pode fazer from() em estado Empty
impl CalcAuyBuilder<Empty> {
    pub fn from<T: Into<Rational>>(self, value: T) -> CalcAuyBuilder<Building> {
        // ...
    }
}

// Só pode fazer operações em estado Building
impl CalcAuyBuilder<Building> {
    pub fn add<T: Into<Rational>>(&self, value: T) -> CalcAuyBuilder<Building> {
        // ...
    }
    
    pub fn commit(&self) -> Result<CalcAuyOutput, CalcAuyError> {
        // ...
    }
}
```

---

## Feature Flags

```toml
[features]
default = ["std", "builder", "output"]

# Core features
std = []
alloc = []

# Module features
builder = ["dep:calc-auy-builder"]
output = ["dep:calc-auy-output"]
parser = ["dep:calc-auy-parser"]
i18n = ["dep:calc-auy-i18n"]
processors = ["dep:calc-auy-processors"]

# Processor features
processor-proto = ["processors", "calc-auy-processors/proto"]
processor-cbor = ["processors", "calc-auy-processors/cbor"]
processor-msgpack = ["processors", "calc-auy-processors/msgpack"]

# Serde features
serde = ["dep:serde", "calc-auy-core/serde"]
```

---

## Comparação: TypeScript vs Rust

| Aspecto | TypeScript | Rust |
|---------|------------|------|
| **BigInt** | `BigInt` (nativo) | `num-bigint::BigInt` |
| **Imutabilidade** | `readonly` + `Object.freeze()` | Ownership + `&self` |
| **Cache** | `Map` + `WeakRef` | `HashMap` ou removido |
| **Async** | `async/await` para crypto | Síncrono |
| **Erros** | `throw` + `instanceof` | `Result<T, E>` |
| **Traits** | Interfaces | Traits (com default impl) |
| **Genéricos** | Type erasure | Monomorfização (zero-cost) |
| **Pattern matching** | `switch` + `if` | `match` (exaustivo) |
| **Null safety** | `null` / `undefined` | `Option<T>` |
| **Serialization** | `JSON.stringify` | `serde` |

---

## Estratégia de Módulos

### Core (`calc-auy-core`)

```
src/
├── lib.rs           # Re-exports
├── rational.rs      # Rational (n/d)
├── ast.rs           # Ast, Node, OperationType
├── engine.rs        # eval()
├── rounding.rs      # RoundingStrategy
├── signature.rs     # sign(), verify()
├── error.rs         # CalcAuyError
└── constants.rs     # Limites e constantes
```

### Builder (`calc-auy-builder`)

```
src/
├── lib.rs           # Re-exports
├── builder.rs       # CalcAuyBuilder
├── instance.rs      # InstanceConfig, InstanceId
└── metadata.rs      # MetadataValue, validação
```

### Output (`calc-auy-output`)

```
src/
├── lib.rs           # Re-exports
├── output.rs        # CalcAuyOutput
├── monetary.rs      # to_monetary()
├── latex.rs         # to_latex()
├── unicode.rs       # to_unicode()
├── verbal.rs        # to_verbal_a11y()
├── mermaid.rs       # to_mermaid_graph()
└── slicer.rs        # to_slice()
```

### Parser (`calc-auy-parser`)

```
src/
├── lib.rs           # Re-exports
├── lexer.rs         # Tokenizer
└── parser.rs        # Parser (descida recursiva)
```

### i18n (`calc-auy-i18n`)

```
src/
├── lib.rs           # Re-exports
├── locale.rs        # Locale enum
└── locales/
    ├── mod.rs       # Registro de locales
    ├── pt_br.rs     # Português (Brasil)
    ├── en_us.rs     # Inglês (EUA)
    ├── en_eu.rs     # Inglês (Europa)
    ├── es_es.rs     # Espanhol
    ├── fr_fr.rs     # Francês
    ├── de_de.rs     # Alemão
    ├── ru_ru.rs     # Russo
    ├── zh_cn.rs     # Chinês
    └── ja_jp.rs     # Japonês
```

### Processors (`calc-auy-processors`)

```
src/
├── lib.rs           # Re-exports
├── protobuf.rs      # Protobuf processor
├── cbor.rs          # CBOR processor
└── msgpack.rs      # MessagePack processor
```

---

## Próximos Passos

1. **Fase 1**: Implementar `calc-auy-core` (rational, ast, engine, rounding, signature)
2. **Fase 2**: Implementar `calc-auy-builder` (fluent API)
3. **Fase 3**: Implementar `calc-auy-output` (formatos de saída)
4. **Fase 4**: Implementar `calc-auy-parser` (lexer + parser)
5. **Fase 5**: Implementador `calc-auy-processors` (protobuf, cbor, msgpack)
6. **Fase 6**: Implementar `calc-auy-i18n` (8 locales)

Cada fase deve ter testes unitários e de integração antes de avançar.
