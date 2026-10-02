# 11 — Preparação do Repositorio (Dia 0)

## Objetivo

Estabelecer desde o dia 0 a mesma **rigorosa disciplina de qualidade** do projeto de referência `katu`:

- **Clippy máximo**: Lints restritivos, sem `unwrap`/`expect`/`panic` em produção
- **Instrumentação ponta a ponta**: Spans e eventos estruturados, custo zero sem feature
- **Testes determinísticos**: FNV-1a fingerprint, seeds fixas, sem relógio em lógica
- **Rust 1.98+ / Edition 2024**: Bases seguras e modernas

---

## Estrutura de Arquivos de Configuração

```
calc-auy-rs/
├── Cargo.toml              # Workspace root com lints
├── clippy.toml             # Configuração do Clippy
├── rustfmt.toml            # Formatação
├── .cargo/
│   └── config.toml         # Aliases e config local
├── crates/
│   └── ...
└── xtask/                  # Task runner (opcional)
```

---

## Cargo.toml (Workspace Root)

```toml
[workspace]
resolver = "2"
members = [
    "crates/calc-auy-core",
    "crates/calc-auy-builder",
    "crates/calc-auy-output",
    "crates/calc-auy-parser",
    "crates/calc-auy-i18n",
    "crates/calc-auy-processors",
]
default-members = ["crates/calc-auy"]

[workspace.package]
version = "0.1.0"
edition = "2024"
rust-version = "1.98"
license = "MPL-2.0"
publish = false

[workspace.dependencies]
# Tipos/erros comuns
thiserror = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Aritmética
num-bigint = "0.4"
num-traits = "0.2"
num-integer = "0.1"

# Hash
blake3 = "1.5"
hex = "0.4"
base64 = "0.22"
bs58 = "0.5"

# Dev
proptest = "1"
criterion = "0.5"

# =============================================================================
# Lints — rigor máximo (baseado no katu, D92) · Rust 1.98 / Edition 2024
# =============================================================================
[workspace.lints.rust]
unsafe_code = "deny"
missing_docs = "warn"
unused_qualifications = "deny"
unused_lifetimes = "deny"
elided_lifetimes_in_paths = "deny"
single_use_lifetimes = "deny"
trivial_casts = "deny"
trivial_numeric_casts = "deny"
unreachable_pub = "warn"
unsafe_op_in_unsafe_fn = "deny"
let_underscore_drop = "deny"
macro_use_extern_crate = "deny"
meta_variable_misuse = "deny"
non_ascii_idents = "deny"
noop_method_call = "deny"
unused_import_braces = "deny"
variant_size_differences = "warn"

[workspace.lints.rustdoc]
broken_intra_doc_links = "deny"

[workspace.lints.clippy]
# Grupos (prioridade menor para permitir overrides pontuais)
all = { level = "deny", priority = -1 }
correctness = { level = "deny", priority = -1 }
suspicious = { level = "deny", priority = -1 }
style = { level = "deny", priority = -1 }
complexity = { level = "deny", priority = -1 }
perf = { level = "deny", priority = -1 }
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
cargo = { level = "warn", priority = -1 }

# Restriction curada (D92)
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
todo = "deny"
unimplemented = "deny"
unreachable = "deny"
dbg_macro = "deny"
print_stdout = "deny"
print_stderr = "deny"
exit = "deny"
mem_forget = "deny"
indexing_slicing = "deny"
arithmetic_side_effects = "warn"
as_conversions = "deny"
cast_possible_truncation = "deny"
cast_sign_loss = "deny"
cast_possible_wrap = "deny"
```

---

## clippy.toml

```toml
# =============================================================================
# calc-auy — clippy.toml (rigor máximo · Rust 1.98 / Edition 2024)
# Valores de configuração do Clippy. Os NÍVEIS de lint ficam em
# [workspace.lints] no Cargo.toml.
# =============================================================================

# ------------------------------------------------------------------- unsafe --
accept-comment-above-attributes = false
accept-comment-above-statement  = false

# ----------------------------------------------- unwrap/expect/panic (D92) ---
allow-expect-in-consts = false
allow-expect-in-tests  = false
allow-unwrap-in-consts = false
allow-unwrap-in-tests  = false
allow-panic-in-tests   = false
allow-unwrap-types     = []

# ------------------------------------------------------------------- testes --
allow-dbg-in-tests                = false
allow-print-in-tests              = false
allow-useless-vec-in-tests        = false
allow-indexing-slicing-in-tests   = false
allow-large-stack-frames-in-tests = true

# --------------------------------------------- estilo / padronização global --
allow-mixed-uninlined-format-args = false
allow-one-hash-in-raw-strings     = false
unreadable-literal-lint-fractions = true
upper-case-acronyms-aggressive    = true
enforce-iter-loop-reborrow        = true
lint-commented-code               = true
semicolon-inside-block-ignore-singleline = false
semicolon-outside-block-ignore-multiline = false
module-items-ordered-within-groupings    = "all"
warn-on-all-wildcard-imports      = true
allowed-wildcard-imports          = []

# ----------------------------------------------- complexidade / tamanho -------
cognitive-complexity-threshold = 15
type-complexity-threshold      = 150
too-many-lines-threshold       = 60
too-many-arguments-threshold   = 5
excessive-nesting-threshold    = 3
max-trait-bounds               = 3
max-suggested-slice-pattern-length = 3
single-char-binding-names-threshold = 2
min-ident-chars-threshold      = 2
allowed-idents-below-min-chars = [
  "i", "j", "x", "y", "z", "w", "n",
  "id", "io", "fs", "db", "ui", "ok", "err", "ty", "kv", "..",
]

# ------------------------------------------------- bools / API / tamanhos ----
max-fn-params-bools        = 0
max-struct-bools           = 1
enum-variant-size-threshold = 128
enum-variant-name-threshold = 3
struct-field-name-threshold = 3
large-error-threshold      = 128
unnecessary-box-size       = 128
pass-by-value-size-limit   = 128
array-size-threshold       = 4096
stack-size-threshold       = 65536
future-size-threshold      = 8192
max-include-file-size      = 262144
vec-box-size-threshold     = 4096
too-large-for-stack        = 200

# ------------------------------------------------------------ MSRV / docs ----
msrv = "1.98"
avoid-breaking-exported-api = false
check-incompatible-msrv-in-tests = true
check-private-items        = true
missing-docs-allow-unused  = false
missing-docs-in-crate-items = false
inherent-impl-lint-scope   = "crate"
recursive-self-in-type-definitions = true
enable-raw-pointer-heuristic-for-send = true
pub-underscore-fields-behavior = "PubliclyExported"

# ----------------------------------------- determinismo / concorrência ------
await-holding-invalid-types = [
  "std::sync::MutexGuard",
  "std::sync::RwLockReadGuard",
  "std::sync::RwLockWriteGuard",
  "std::cell::Ref",
  "std::cell::RefMut",
]

# -------------------------------------------------------------- aritmética ----
arithmetic-side-effects-allowed = [
  "Wrapping", "Saturating", "f32", "f64",
  "AtomicU8", "AtomicU16", "AtomicU32", "AtomicU64", "AtomicUsize",
  "AtomicI8", "AtomicI16", "AtomicI32", "AtomicI64", "AtomicIsize",
]
arithmetic-side-effects-allowed-binary = []
arithmetic-side-effects-allowed-unary  = []
suppress-restriction-lint-in-const = false
verbose-bit-mask-threshold         = 1
const-literal-digits-threshold     = 30
literal-representation-threshold   = 16384

# ---------------------------------------------------- listas de proibição ----
disallowed-names = ["foo", "baz", "quux", "tmp", "thing", "stuff", "misc", ".."]

disallowed-types = [
  { path = "std::rc::Rc",       reason = "não é Send/Sync; use Arc" },
  { path = "std::rc::Weak",     reason = "não é Send/Sync" },
  { path = "std::cell::RefCell", reason = "interior mutability em runtime; use Mutex/RwLock" },
  { path = "std::cell::Cell",   reason = "estado mutável compartilhado; use atômicos" },
  { path = "std::collections::LinkedList", reason = "cache-hostil; use Vec/VecDeque" },
  { path = "std::collections::HashMap",  reason = "iteração não determinística; use BTreeMap/IndexMap" },
  { path = "std::collections::HashSet",  reason = "iteração não determinística; use BTreeSet/IndexSet" },
]

disallowed-methods = [
  { path = "std::mem::transmute",            reason = "UB potencial; use from_bits/from_ne_bytes" },
  { path = "std::mem::forget",               reason = "vazamento; use RAII/Drop" },
  { path = "std::mem::zeroed",               reason = "valor inválido possível; use Default" },
  { path = "std::mem::uninitialized",        reason = "deprecado e UB; use MaybeUninit" },
  { path = "std::slice::from_raw_parts",     reason = "unsafe; confinado ao adaptador" },
  { path = "std::slice::from_raw_parts_mut", reason = "unsafe; confinado ao adaptador" },
  { path = "std::ptr::read",                 reason = "unsafe; confinado ao adaptador" },
  { path = "std::ptr::write",                reason = "unsafe; confinado ao adaptador" },
  { path = "std::env::set_var",              reason = "unsafe na Edition 2024" },
  { path = "std::env::remove_var",           reason = "unsafe na Edition 2024" },
  { path = "std::env::var",                  reason = "não determinístico" },
  { path = "std::env::vars",                 reason = "não determinístico" },
  { path = "std::time::SystemTime::now",     reason = "não determinístico; use o port Clock" },
  { path = "std::time::Instant::now",        reason = "não determinístico; use o port Clock" },
  { path = "std::process::exit",             reason = "propague Result; exit codes na borda" },
]

disallowed-macros = [
  { path = "std::dbg",           reason = "remova antes do commit" },
  { path = "std::todo",          reason = "inacabado; abra uma issue" },
  { path = "std::unimplemented", reason = "inacabado; retorne Error" },
  { path = "std::unreachable",   reason = "prove a impossibilidade sem panic" },
  { path = "std::panic",         reason = "propague Result" },
]

# ------------------------------------------------ ordenação / documentação ----
doc-valid-idents = [
  "calc-auy", "CalcAUY", "AST", "JSON", "CBOR", "Protobuf", "MessagePack",
  "LaTeX", "Unicode", "Mermaid", "BLAKE3", "JCS", "RFC", "NBR", "ABNT",
  "BigInt", "GCD", "LRA", "WCAG", "eMAG", "PEMDAS", "BODMAS",
  "snake_case", "camelCase", "..",
]

standard-macro-braces = [
  { name = "vec",          brace = "[" },
  { name = "format",       brace = "(" },
  { name = "write",        brace = "(" },
  { name = "writeln",      brace = "(" },
  { name = "assert",       brace = "(" },
  { name = "assert_eq",    brace = "(" },
  { name = "assert_ne",    brace = "(" },
  { name = "debug_assert", brace = "(" },
  { name = "matches",      brace = "(" },
]

warn-unsafe-macro-metavars-in-private-macros = true

# ------------------------------------------------------------------ diversos --
absolute-paths-allowed-crates = ["std", "core", "alloc"]
absolute-paths-max-segments   = 2
allow-comparison-to-zero      = true
allow-exact-repetitions       = true
allowed-prefixes              = ["to", "as", "into", "from", "try_into", "try_from"]
allowed-scripts               = ["Latin"]
cargo-ignore-publish          = false
check-grouped-late-init       = true
check-inconsistent-struct-field-initializers = false
enforced-import-renames       = []
large-error-ignored           = []
ignore-interior-mutability    = ["bytes::Bytes"]
matches-for-let-else          = "WellKnownTypes"
```

---

## rustfmt.toml

```toml
edition = "2024"
max_width = 100
tab_spaces = 4
newline_style = "Unix"
use_field_init_shorthand = true
use_try_shorthand = true
```

---

## .cargo/config.toml

```toml
[alias]
c = "check"
b = "build"
t = "test"
cl = "clippy"
d = "doc --no-deps"
f = "fmt --all -- --check"

[net]
git-fetch-with-cli = true
```

---

## Sistema de Instrumentação

### Feature Flag

```toml
# crates/calc-auy-core/Cargo.toml
[features]
default = []
# Instrumentação transversal. OFF por defeito: custo literalmente zero.
instrument = []
```

### Módulo de Diagnóstico (`src/diag/mod.rs`)

```rust
//! Diagnóstico transversal: **log estruturado** + **métrica de tempo**.
//!
//! Regras do projeto:
//!
//! - **Logs sempre estruturados**: um registo é um **identificador estável** (do catálogo
//!   [`events`]) + **campos tipados**; nunca texto livre interpolado.
//! - **Custo zero por defeito**: sem `feature = "instrument"`, [`span!`] e [`event!`] são *no-op*.
//! - **On-demand**: com a feature, liga-se em runtime (`CALC_AUY_INSTRUMENT=1`).

pub mod events;
pub mod fingerprint;
pub mod redact;

/// Nível de diagnóstico, do mais grave (`Error`) ao mais verboso (`Trace`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

/// Valor de um campo estruturado (sem alocação).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Value<'a> {
    Str(&'a str),
    Int(i64),
    Uint(u64),
    Bool(bool),
}

impl<'a> From<&'a str> for Value<'a> {
    fn from(value: &'a str) -> Self {
        Self::Str(value)
    }
}

impl From<i32> for Value<'_> {
    fn from(value: i32) -> Self {
        Self::Int(i64::from(value))
    }
}

impl From<u64> for Value<'_> {
    fn from(value: u64) -> Self {
        Self::Uint(value)
    }
}

impl From<usize> for Value<'_> {
    fn from(value: usize) -> Self {
        Self::Uint(u64::try_from(value).unwrap_or(u64::MAX))
    }
}

impl From<bool> for Value<'_> {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}
```

### Catálogo de Eventos (`src/diag/events.rs`)

```rust
//! Catálogo de identificadores de evento.
//!
//! **Fonte única de verdade** dos nomes usados em `span!`/`event!`. Regras:
//!
//! - Formato `<subsistema>.<ação>` (≥ 2 segmentos), minúsculas `[a-z0-9_]`.
//! - Estáveis: mudar um id é uma decisão registada.

/// Versão do catálogo. Incrementa ao remover/renomear ids.
pub const CATALOG_VERSION: u16 = 1;

macro_rules! catalog {
    ($(($name:ident, $id:literal, $doc:literal)),* $(,)?) => {
        $(
            #[doc = $doc]
            pub const $name: &str = $id;
        )*
        /// Todos os identificadores do catálogo (para validação e ferramentas).
        pub const ALL: &[&str] = &[$($id),*];
    };
}

catalog! {
    // -- Execução / arranque -------------------------------------------------
    (CALC_AUY_RUN, "calc_auy.run", "Execução de topo."),
    (CALC_AUY_COMMIT, "calc_auy.commit", "Commit de um cálculo."),
    (CALC_AUY_HIBERNATE, "calc_auy.hibernate", "Hibernação de um cálculo."),
    (CALC_AUY_HYDRATE, "calc_auy.hydrate", "Hidratação de um cálculo."),

    // -- Core ------------------------------------------------------------------
    (RATIONAL_CREATE, "rational.create", "Criação de um Rational."),
    (RATIONAL_OP, "rational.op", "Operação aritmética."),
    (AST_EVAL, "ast.eval", "Avaliação de AST."),
    (AST_VALIDATE, "ast.validate", "Validação de AST."),
    (ROUNDING_APPLY, "rounding.apply", "Aplicação de arredondamento."),
    (SIGNATURE_GEN, "signature.gen", "Geração de assinatura."),
    (SIGNATURE_VERIFY, "signature.verify", "Verificação de assinatura."),

    // -- Output ----------------------------------------------------------------
    (OUTPUT_FORMAT, "output.format", "Formatação de saída."),
    (OUTPUT_CACHE_HIT, "output.cache_hit", "Cache de output hit."),
    (OUTPUT_CACHE_MISS, "output.cache_miss", "Cache de output miss."),

    // -- Parser ----------------------------------------------------------------
    (LEXER_TOKENIZE, "lexer.tokenize", "Tokenização de expressão."),
    (PARSER_PARSE, "parser.parse", "Parsing de expressão."),

    // -- Function span genérico -----------------------------------------------
    (
        CALC_AUY_FN,
        "calc_auy.fn",
        "Span genérico de função: o rótulo real viaja em `Record.function`."
    ),
}
```

### Macros de Span e Event (`src/diag/macros.rs`)

```rust
/// Abre um [`Span`](crate::diag::Span).
///
/// ```
/// use calc_auy_core::diag::{Level, events};
/// let _span = calc_auy_core::span!(Level::Info, events::CALC_AUY_COMMIT, "n" => 42);
/// ```
#[cfg(feature = "instrument")]
#[macro_export]
macro_rules! span {
    ($level:expr, $event:expr $(, $key:literal => $value:expr)* $(,)?) => {
        $crate::diag::Span::start(
            $level,
            $event,
            &[$(( $key, $crate::diag::Value::from($value) )),*],
        )
    };
}

/// Abre um [`Span`] **de função**: igual a [`span!`] mas com o rótulo estável da função.
///
/// ```
/// use calc_auy_core::diag::{Level, events};
/// let _span = calc_auy_core::fn_span!(Level::Trace, events::CALC_AUY_COMMIT, "exemplo::run");
/// ```
#[cfg(feature = "instrument")]
#[macro_export]
macro_rules! fn_span {
    ($level:expr, $event:expr, $function:literal $(, $key:literal => $value:expr)* $(,)?) => {
        $crate::diag::Span::start_function(
            $level,
            $event,
            $function,
            &[$(( $key, $crate::diag::Value::from($value) )),*],
        )
    };
}

/// Instrumenta uma função com nível `Trace` e o identificador genérico `calc_auy.fn`.
///
/// ```
/// fn f() {
///     let _span = calc_auy_core::trace_fn!("exemplo::f");
/// }
/// ```
#[macro_export]
macro_rules! trace_fn {
    ($function:literal) => {
        $crate::fn_span!(
            $crate::diag::Level::Trace,
            $crate::diag::events::CALC_AUY_FN,
            $function
        )
    };
}

/// Emite um evento estruturado.
///
/// ```
/// use calc_auy_core::diag::{Level, events};
/// calc_auy_core::event!(Level::Debug, events::RATIONAL_OP, "op" => "add");
/// ```
#[cfg(feature = "instrument")]
#[macro_export]
macro_rules! event {
    ($level:expr, $event:expr $(, $key:literal => $value:expr)* $(,)?) => {
        $crate::diag::record($level, $event, &[$(( $key, $crate::diag::Value::from($value) )),*])
    };
}

// No-op quando a feature está desligada
#[cfg(not(feature = "instrument"))]
#[macro_export]
macro_rules! span {
    ($level:expr, $event:expr $(, $key:literal => $value:expr)* $(,)?) => {
        $crate::diag::Span::noop($level, $event)
    };
}

#[cfg(not(feature = "instrument"))]
#[macro_export]
macro_rules! fn_span {
    ($level:expr, $event:expr, $function:literal) => {
        $crate::diag::Span::noop($level, $event)
    };
    ($level:expr, $event:expr, $function:literal, $($rest:tt)*) => {
        $crate::diag::Span::noop($level, $event)
    };
}

#[cfg(not(feature = "instrument"))]
#[macro_export]
macro_rules! event {
    ($level:expr, $event:expr $(, $key:literal => $value:expr)* $(,)?) => {};
}
```

### Fingerprint para Testes Determinísticos (`src/diag/fingerprint.rs`)

```rust
//! Impressão determinística de estado/resultado.
//!
//! Mesma entrada → mesma impressão (hex de 64 bits), comparável entre execuções.

/// Acumulador FNV-1a de 64 bits.
#[derive(Debug, Clone, Copy)]
pub struct Fingerprint(u64);

/// Primo FNV de 64 bits.
const PRIME: u64 = 0x0000_0100_0000_01b3;

/// Offset basis FNV-1a de 64 bits.
const OFFSET: u64 = 0xcbf2_9ce4_8422_2325;

impl Fingerprint {
    /// Novo acumulador (estado FNV-1a inicial).
    #[must_use]
    pub const fn new() -> Self {
        Self(OFFSET)
    }

    /// Acumula bytes crus.
    pub fn write(&mut self, bytes: &[u8]) {
        for byte in bytes {
            self.0 ^= u64::from(*byte);
            self.0 = self.0.wrapping_mul(PRIME);
        }
    }

    /// Acumula um fragmento **prefixado com o comprimento** (não ambíguo entre fronteiras).
    pub fn write_fragment<T: AsRef<[u8]>>(&mut self, part: T) {
        let bytes = part.as_ref();
        self.write(&u64::try_from(bytes.len()).unwrap_or(u64::MAX).to_le_bytes());
        self.write(bytes);
    }

    /// Valor do hash.
    #[must_use]
    pub const fn value(self) -> u64 {
        self.0
    }

    /// Impressão em 16 hex.
    #[must_use]
    pub fn hex(self) -> String {
        format!("{:016x}", self.0)
    }
}

impl Default for Fingerprint {
    fn default() -> Self {
        Self::new()
    }
}

/// Hash de uma sequência de fragmentos.
#[must_use]
pub fn of(parts: &[&[u8]]) -> u64 {
    let mut fp = Fingerprint::new();
    for part in parts {
        fp.write_fragment(*part);
    }
    fp.value()
}

/// Macro de conveniência para fingerprint de múltiplos fragmentos.
///
/// ```
/// let a = calc_auy_core::fingerprint!("a", "bc");
/// let b = calc_auy_core::fingerprint!("ab", "c");
/// assert_ne!(a, b);
/// assert_eq!(a, calc_auy_core::fingerprint!("a", "bc"));
/// ```
#[macro_export]
macro_rules! fingerprint {
    ($($part:expr),* $(,)?) => {{
        let mut fp = $crate::diag::fingerprint::Fingerprint::new();
        $(fp.write_fragment($part.as_ref());)*
        fp.hex()
    }};
}

#[cfg(test)]
mod tests {
    use super::{Fingerprint, of};

    #[test]
    fn same_input_has_the_same_print() {
        let a = of(&[b"hello", b"world"]);
        let b = of(&[b"hello", b"world"]);
        assert_eq!(a, b);
    }

    #[test]
    fn different_input_has_different_print() {
        let a = of(&[b"hello", b"world"]);
        let b = of(&[b"world", b"hello"]);
        assert_ne!(a, b);
    }

    #[test]
    fn boundary_is_not_ambiguous() {
        // "a" + "bc" != "ab" + "c"
        let a = of(&[b"a", b"bc"]);
        let b = of(&[b"ab", b"c"]);
        assert_ne!(a, b);
    }
}
```

### Redação de Segredos (`src/diag/redact.rs`)

```rust
//! Redação de segredos no caminho de diagnóstico.
//!
//! Regra: um campo cuja **chave** é sensível (`token`, `authorization`, `secret`…) ou cujo
//! **valor** traz um marcador de segredo (`Bearer `, `sk-…`) nunca é emitido em claro.

use super::Value;

/// Marcador emitido no lugar de um valor redigido.
pub const REDACTED: &str = "[redacted]";

/// Chaves (em minúsculas) cujo valor textual é sempre redigido.
const SENSITIVE_KEYS: &[&str] = &[
    "secret",
    "token",
    "password",
    "passwd",
    "authorization",
    "auth",
    "cookie",
    "credential",
    "api_key",
    "apikey",
    "private_key",
    "salt",
];

/// Marcadores de segredo detetados **dentro** de um valor textual.
const SECRET_MARKERS: &[&str] = [
    "-----begin",
    "bearer ",
    "authorization:",
    "sk-",
    "ghp_",
    "xoxb-",
];

/// `true` se a chave do campo é sensível.
#[must_use]
pub fn is_sensitive_key(key: &str) -> bool {
    let lowered = key.to_ascii_lowercase();
    SENSITIVE_KEYS.iter().any(|needle| lowered.contains(needle))
}

/// `true` se o valor textual contém um marcador de segredo.
#[must_use]
pub fn is_sensitive_value(value: &str) -> bool {
    let lowered = value.to_ascii_lowercase();
    SECRET_MARKERS.iter().any(|needle| lowered.contains(needle))
}

/// Aplica a redação a um campo.
#[must_use]
pub fn redact_value<'a>(key: &str, value: Value<'a>) -> Value<'a> {
    if is_sensitive_key(key) {
        return Value::Str(REDACTED);
    }
    if let Value::Str(s) = value {
        if is_sensitive_value(s) {
            return Value::Str(REDACTED);
        }
    }
    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sensitive_key_is_redacted() {
        assert_eq!(redact_value("token", Value::Str("abc123")), Value::Str(REDACTED));
        assert_eq!(redact_value("api_key", Value::Str("xyz")), Value::Str(REDACTED));
    }

    #[test]
    fn sensitive_value_is_redacted() {
        assert_eq!(redact_value("header", Value::Str("Bearer abc")), Value::Str(REDACTED));
        assert_eq!(redact_value("key", Value::Str("sk-12345")), Value::Str(REDACTED));
    }

    #[test]
    fn normal_value_passes() {
        assert_eq!(redact_value("name", Value::Str("hello")), Value::Str("hello"));
        assert_eq!(redact_value("count", Value::Int(42)), Value::Int(42));
    }
}
```

---

## Testes Determinísticos

### Padrão de Teste com Fingerprint

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::diag::fingerprint;

    #[test]
    fn rational_addition_is_deterministic() {
        let a = Rational::from_str("1/3").unwrap();
        let b = Rational::from_str("1/6").unwrap();
        let c = a + b;

        // Fingerprint do resultado
        let fp = fingerprint!(c.numerator().to_string(), c.denominator().to_string());
        assert_eq!(fp, "a1b2c3d4e5f67890"); // Valor esperado
    }

    #[test]
    fn signature_is_deterministic() {
        let payload = create_test_payload();
        let sig1 = Signature::generate(&payload, "salt", SignatureEncoder::Hex).unwrap();
        let sig2 = Signature::generate(&payload, "salt", SignatureEncoder::Hex).unwrap();

        assert_eq!(sig1.value, sig2.value);
    }
}
```

### Proptest para Propriedades

```rust
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn rational_addition_is_commutative(a in any::<i64>(), b in any::<i64>()) {
        let ra = Rational::from_int(a.into());
        let rb = Rational::from_int(b.into());
        assert_eq!(ra + rb, rb + ra);
    }

    #[test]
    fn rational_multiplication_is_commutative(a in any::<i64>(), b in any::<i64>()) {
        let ra = Rational::from_int(a.into());
        let rb = Rational::from_int(b.into());
        assert_eq!(ra * rb, rb * ra);
    }

    #[test]
    fn rational_division_is_inverse_of_multiplication(
        a in any::<i64>(),
        b in (1..i64::MAX) // b != 0
    ) {
        let ra = Rational::from_int(a.into());
        let rb = Rational::from_int(b.into());
        let product = ra.clone() * rb.clone();
        let quotient = product / rb;
        assert_eq!(quotient, ra);
    }
}
```

---

## Resumo de Verificação (Checklist Dia 0)

- [ ] `Cargo.toml` workspace com lints rigorosos
- [ ] `clippy.toml` configurado
- [ ] `rustfmt.toml` configurado
- [ ] `.cargo/config.toml` com aliases
- [ ] Feature `instrument` no core
- [ ] Módulo `diag` com `Level`, `Value`, `events`
- [ ] Macros `span!`, `fn_span!`, `trace_fn!`, `event!`
- [ ] `fingerprint!` para testes determinísticos
- [ ] `redact` para segredos
- [ ] Testes de fingerprint e redact
- [ ] CI rodando `cargo clippy -- -D warnings`
- [ ] CI rodando `cargo fmt --check`
- [ ] CI rodando `cargo test`

---

## Comandos de Verificação

```bash
# Check rápido
cargo c

# Clippy máximo
cargo cl -- -D warnings

# Formatação
cargo f

# Testes
cargo t

# Testes com instrumentação
cargo t --features instrument

# Doc
cargo d
```
