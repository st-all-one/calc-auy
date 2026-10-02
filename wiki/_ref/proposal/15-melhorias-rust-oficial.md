# 15 — Melhorias Habilitadas pelo Rust Oficial

> **Base**: `.agents/skill/rust/` (Rust 1.97/1.98 · Edition 2024) e o [doc 14](./14-arquitetura-oficial-rust.md).
>
> **Premissa**: como a implementação oficial é Rust e não há compatibilidade a preservar com o TS,
> podemos adotar os **padrões idiomáticos** que a skill recomenda em vez de "traduzir" o design
> do TypeScript. Cada item indica o arquivo da skill que o fundamenta.

---

## Como ler

| Seção | Tema | Arquivos da skill |
|-------|------|-------------------|
| A | Conceitual | `06`, `07`, `16` |
| B | Arquitetural | `09`, `10`, `11`, `16` |
| C | Estrutural | `04`, `07`, `09`, `10`, `15` |
| D | Implementação | `08`, `11`, `14`, `16` |
| E | Ferramental / CI | `13`, `14`, `15` |

Os padrões da skill que **passam a ser regra do projeto**:

- "default to immutability and borrowing; `clone()` only with justification" (`SKILL.md`)
- "make illegal states unrepresentable" (`SKILL.md`, `06`)
- "ban `unwrap()` in libraries; use `?` + `thiserror`/`anyhow`" (`SKILL.md`, `06`)
- "prefer iterators/adapters over index loops; avoid needless `collect()`" (`SKILL.md`, `08`)
- "unsafe: isolate and document with `// SAFETY:`; run Miri" (`SKILL.md`, `14`)
- "organizar por domínio, não por camada técnica" (`16`, boas práticas)
- "testes: doc tests + unit in-module + integration; proptest para propriedades" (`13`)

---

## A. Melhorias Conceituais

### A1 — Duas representações da AST: memória tipada × wire serde

**Problema atual**: o doc 04 guarda `RationalValue { n: String, d: String }` dentro da AST. Isso
força *parse de BigInt a cada avaliação* e *formatação a cada serialização* — exatamente o que uma
linguagem com tipos fortes pode evitar.

**Melhoria** (skill `06`, `10`): a AST em memória carrega `Rational` **tipado**; a serialização
`serde` é uma borda, não o armazenamento.

```rust
// Em memória: tipos fortes, sem strings numéricas
pub enum NodeData {
    Literal { value: Rational, original_input: Box<str> },
    Operation { op: OperationType, operands: Range<u32> },
    // ...
}

// Wire: serializado pelo `Serialize` de `Rational` (n/d como string decimal)
#[derive(Serialize, Deserialize)]
#[serde(transparent)]
pub struct RationalRepr { n: String, d: String }
```

Ganhos: elimina uma classe de bugs (string numérica inválida), reduz alocações e acelera o engine.
`RationalValue` deixa de existir como tipo separado.

### A2 — Ciclo de vida como typestate

A skill (`16`, "State Pattern") mostra como codificar estados no sistema de tipos. A proposta já
tem `VerifiedAst`; estendemos para todo o ciclo de vida:

```rust
pub struct Draft;       // hibernate: cálculo iniciado, sem resultado final
pub struct Committed;   // commit: resultado + assinatura
pub struct Verified;    // custódia conferida (parse-don't-validate)

pub struct Calculation<S> { ast: FlatAst, ctx: Arc<Context>, _s: PhantomData<S> }

impl Calculation<Draft> {
    pub fn add(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError>;
    pub fn commit(self, limits: &Limits) -> Result<Calculation<Committed>, CalcAuyError>;
    pub fn hibernate(self) -> Result<String, CalcAuyError>;
}
impl Calculation<Committed> {
    pub fn verify(self, v: &dyn CustodyVerifier) -> Result<Calculation<Verified>, CalcAuyError>;
    pub fn signature(&self) -> &Digest;
}
impl Calculation<Verified> {
    pub fn result(&self) -> &Rational;
    pub fn output(&self) -> Output<'_>;
}
```

Métodos inválidos para um estado **não compilam** (não há `result()` em `Draft`).

### A3 — Integridade como Merkle log (cadeia de custódia real)

Hoje a "cadeia de custódia" é um `Control` com `previous_signature`. Como Rust é oficial,
podemos elevar isso a um **log encadeado (Merkle/append-only)**: cada commit referencia o hash do
commit anterior, tornando a sequência inteira à prova de adulteração — não apenas cada cálculo
isolado.

```rust
pub struct CustodyLink {
    pub previous: Option<Digest>, // elo anterior (None = raiz)
    pub trace: Digest,            // hash canônico deste commit
}

pub fn chain(previous: Option<&Digest>, payload: &SignaturePayload, salt: &Secret<str>) -> CustodyLink;
```

Ganhos conceituais: a reabertura/aprovação do TS vira um caso particular de log encadeado; a
detecção de fraude cobre **ordem e completude** da história, não só o conteúdo de um objeto.
`cross_context_add` passa a validar o elo, não um campo solto. Requer decisão de produto (backward
semântico), mas é a evolução natural do recurso.

### A4 — Endereçamento por conteúdo e memoização (separar valor de proveniência)

Insight habilitado por possuirmos a forma canônica: o **resultado numérico** de uma subárvore
depende só do **valor canônico** dela; a **assinatura** depende também dos metadados. Podemos
separar as duas chaves:

- `value_hash(subtree)` — ignora metadata → chave de **cache de avaliação** (memoização).
- `trace_hash(subtree)` — inclui metadata → chave de **integridade**.

```rust
// Cache de avaliação por conteúdo (sem metadata):
pub fn eval_memoized(ast: &FlatAst, node: NodeId, cache: &mut EvalCache) -> Result<Rational, CalcAuyError> {
    let key = ast.value_hash(node);           // blake3 do subcampo canônico
    if let Some(v) = cache.get(&key) { return Ok(v.clone()); }
    let v = eval_node(ast, node, cache)?;     // recursão via cache
    cache.insert(key, v.clone());
    Ok(v)
}
```

Isso dá **deduplicação e memoização** de subtrees repetidas (comum em lotes e fórmulas), sem
comprometer a integridade. É também a base para *structural sharing* entre cálculos.

### A5 — Exatidão como invariante de um único oráculo

O caminho `Small` é uma **otimização não observável**. Formalizamos: existe uma implementação
`Large` (BigInt) que é a **especificação**; `Small` deve provar equivalência.

```rust
// Teste de propriedade obrigatório (skill 13):
proptest! {
    #[test]
    fn small_e_large_concordam(a in any_small(), b in any_small(), op in any_op()) {
        prop_assert_eq!(op_small(a, b), op_large(a.into_big(), b.into_big()));
    }
}
```

Nenhuma decisão de performance pode alterar o resultado observável — isso vira um invariante
testado, não uma promessa.

### A6 — Canonicalização como trait/derive (invariante no tipo)

Em vez de um canonicalizador que "espera" não receber `f64`, tornamos isso uma **propriedade do
tipo**, verificada em tempo de compilação (skill `07`, marker/blanket):

```rust
/// Só tipos implementáveis por dados canônicos (sem f64) ganham canonicalização.
pub trait Canonical: sealed::Sealed {
    fn write_canonical(&self, out: &mut Vec<u8>);
}

/// Derive que gera o writer e REJEITA campos f64 via trait bound.
#[derive(calc_auy_macros::Canonical)]
#[canonical(rename_all = "snake_case")]
pub struct SignaturePayload { /* ... */ }
```

O `#[derive(Canonical)]` gera o writer determinístico a partir do struct — **impossível divergir**
da definição. Um campo `f64` falha a compilação (não implementa `Canonical`).

---

## B. Melhorias Arquiteturais

### B1 — AST em arena plana (`FlatAst`) com `Arc`

A skill (`10`) lembra que `Box`/`Rc`/`Arc` têm custos; e (`16`) recomenda **layout cache-friendly**
(SoA). A AST recursiva com `Box` faz *pointer chasing* e uma alocação por nó. Melhoria: **árvore de
arrays** (arena), com índices em vez de ponteiros:

```rust
pub struct NodeId(NonZeroU32);        // niche: Option<NodeId> ocupa 4 bytes

pub struct FlatAst {
    nodes: Vec<NodeData>,             // contíguo, cache-friendly
    children: Vec<NodeId>,            // filhos em um pool contíguo
    metadata: Vec<Arc<Metadata>>,     // compartilhado
    // índice → range em `children`
}

impl FlatAst {
    pub fn child(&self, id: NodeId, i: u32) -> NodeId;
}
```

Ganhos:
- **Sem alocação por nó** e sem *pointer chasing*; travessia sequencial (L1/L2).
- `Arc<FlatAst>` é **clonado em O(1)** → compartilhamento barato entre threads e no motor de lotes.
- Serialização desserializa para a arena; a forma recursiva é só a projeção wire.
- Travessia iterativa trivial (índices), sem risco de stack overflow.

Custo: ergonomia da construção — resolvida com um `Builder` que empurra nós na arena.

### B2 — `tracing` como espinha de instrumentação (substitui o `diag` caseiro)

O doc 11 reinventa spans/eventos. A skill (`16`) recomenda `tracing` + `tracing-subscriber`. Migrar
para `tracing`:

```rust
use tracing::instrument;

#[instrument(level = "trace", skip(self), fields(event = "calc_auy.commit", node_count))]
pub fn commit(&self) -> Result<Committed, CalcAuyError> { /* ... */ }
```

- Campos estruturados, spans hierárquicos, `#[instrument]`.
- **Custo zero quando não há subscriber**; features `release_max_level_off` / `max_level_off` removem
  o código em release.
- Mantemos o **catálogo de eventos** como constantes (estável para consultas), mas emitidos via
  `tracing`.
- `redact` permanece (via `secrecy`) e `fingerprint` continua para testes determinísticos.

Ganho: menos código próprio, ecossistema maduro, integração com `tracing-subscriber`/OpenTelemetry.

### B3 — `Arc<Metadata>` + `Arc::make_mut` (partilha estrutural)

O `metadata_cloning_stress` do original (1000 chaves) revela o custo de clonar metadados. A skill
(`10`) mostra `Arc` para multi-ownership. Melhoria: metadados imutáveis **compartilhados** e
copy-on-write:

```rust
pub type Metadata = Arc<BTreeMap<Box<str>, MetaValue>>;

pub fn set_metadata(node: &mut NodeData, key: Box<str>, value: MetaValue) {
    // clona o mapa apenas se houver outros donos
    Arc::make_mut(&mut node.metadata).insert(key, value);
}
```

### B4 — Erros: `thiserror` (lib) × `anyhow` (bin)

Regra explícita da skill (`06`, `16`):

- **Bibliotecas** (`core`, `api`, …): `thiserror` com enums variantes tipadas; erros `Send + Sync`
  (skill `11`, para multithread).
- **Binário `calc-auy`**: `anyhow` + `.context(...)` / `bail!`.

```rust
// bin
fn run(cli: Cli) -> anyhow::Result<()> {
    let out = calc_auy_api::commit(&input)
        .with_context(|| format!("failed to commit {}", input.id))?;
    Ok(())
}
```

### B5 — Backend numérico como trait (monomorfizado)

Generaliza o ADR-001 e a ideia do brainstorm (`FractionOps`), mantendo zero-cost por monomorfização
(skill `07`):

```rust
pub trait Numeric: sealed::Sealed + Sized + Clone + Eq {
    type Wide;                       // u64→u128, u128→u256
    fn checked_add(self, other: Self) -> Option<Self>;
    fn checked_mul(self, other: Self) -> Option<Self>;
    // ...
}

pub struct Hybrid;                   // u64 → BigInt, com promoção verificada
```

Permite trocar a largura (u64/u128/u256) e testar o `Large` como oráculo (A5) sem reescrever a
lógica de racionais.

### B6 — Camada NLG em crate próprio

O realizer (ADR-011) não deve depender de `output`. Criar `calc-auy-nlg` com a SRL e o trait
`VerbalRealizer`; `calc-auy-output` depende do trait, e `calc-auy-i18n` provê implementações. Assim
a i18n fica genuinamente plugável (skill `07`: "traits pequenos e coesos").

---

## C. Melhorias Estruturais

### C1 — Newtypes e segredos

Skill (`07`, newtype; `16`, type safety):

```rust
pub struct Digest([u8; 32]);                 // assinatura crua; encode() sob demanda
pub struct ContextLabel(Box<str>);
pub struct TraceVersion(NonZeroU16);
pub struct Salt(secrecy::SecretString);      // nunca Serialize/Debug

impl Digest {
    pub fn hex(&self) -> String { /* ... */ }
    pub fn encode(&self, enc: Encoder) -> String { /* ... */ }
}
```

- `Digest` guarda os 32 bytes; a codificação (hex/base32/…) é derivada. Evita guardar `String` e
  re-parsear.
- `Salt` com `secrecy` + `zeroize` garante que o sal **nunca** vaze em log/serialização (integra-se
  ao `redact` do doc 11).

### C2 — Limites impostos no streaming da desserialização

O ADR-006 verifica depois de construir. Melhoria: **visitors** que impõem limites *durante* a
desserialização (skill `06`, tipos de validação), evitando alocar payloads hostis:

```rust
impl<'de> Deserialize<'de> for MetaValue {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct V<'a> { limits: &'a Limits, bytes: Cell<usize> }
        // visita recursiva, contando bytes/nós/profundidade e abortando cedo
    }
}
```

Resultado: DoS de memória é impossível **por construção** na hidratação.

### C3 — `SmallVec` para operandos

Skill (`16`, "small string optimization", evitar alocação). A maioria das operações tem 2–5
operandos:

```rust
pub struct NodeData {
    pub op: OperationType,
    pub operands: smallvec::SmallVec<[NodeId; 4]>,   // sem heap até 4
    pub metadata: Arc<Metadata>,
}
```

Combinado com `MAX_OPERANDS` (flattening), mantém o caminho quente fora do heap.

### C4 — Features mínimas; sem `no_std`; lints herdados

Skill (`09`, `15`):

- **Remover a aspiração `no_std`**: `num-bigint`, `serde_json` e o produto (CLI/WASM) não precisam;
  `no_std` adiciona complexidade sem valor. Declarar `std`.
- Features com `dep:` e `default` mínimo:
  ```toml
  [features]
  default = ["std"]
  std = []
  parallel = ["dep:rayon"]          # off no wasm por padrão
  simd = ["dep:pulp"]
  serde = ["dep:serde", "dep:serde_json"]
  processors-proto = ["dep:prost"]
  ```
- Cada crate herda os lints:
  ```toml
  [lints]
  workspace = true
  ```

### C5 — `#[non_exhaustive]`, `#[must_use]`, traits selados

Skill (`07`): evolução de API sem breaking + garantias no tipo.

```rust
#[non_exhaustive]
pub enum OperationType { Add, Sub, Mul, Div, Pow, Mod, DivInt, CrossContextAdd }

#[must_use]
pub fn numerator(&self) -> &BigInt / u64;
```

`IntoRational` selado (ADR-007) impede implementações externas e o ingresso de `f64`.

### C6 — Organização por domínio, não por camada

Skill (`16`): "Organizar por domínio". Em vez de `rational.rs`, `ast.rs`, `engine.rs`, preferir
módulos de domínio:

```
calc-auy-core/src/
├── numeric/        # Rational híbrido, backend, gcd, roots
├── expression/     # AST (arena), engine, limits
├── integrity/      # canonical, sign, custody, verifier
└── error/          # ProblemDetails, CalcAuyError
```

---

## D. Melhorias de Implementação

### D1 — Aritmética verificada + invariantes em `debug`

Skill (`03`, `06`): invariantes no construtor. Somar `debug_assert!` no caminho quente (removido em
release):

```rust
#[inline]
fn from_small_unchecked(n: u64, d: u64) -> Rational {
    debug_assert!(d > 0 && gcd_u64(n, d) == 1, "invariante violado: {n}/{d}");
    Rational { repr: Repr::Small { n, d } }
}
```

### D2 — Parser zero-copy + fuzzing

Skill (`08`, iterators; `14`, Miri/fuzz). O lexer/parser trabalha sobre `&str` sem alocar tokens
(ou `Cow`), emitindo direto para a arena:

```rust
pub struct Lexer<'a> { input: &'a str, pos: usize }
impl<'a> Iterator for Lexer<'a> { type Item = Result<Token<'a>, CalcAuyError>; /* ... */ }
```

Complementos: `cargo-fuzz` no parser e no desserializador; differential fuzzing contra o oráculo
`Large`.

### D3 — Motor de lotes em streaming com backpressure

Skill (`11`: canais *bounded* para backpressure; `rayon` para paralelismo). O subcomando `batch` lê
NDJSON, processa em paralelo e escreve **preservando a ordem de entrada** com memória limitada:

```rust
// produtor lê linhas → canal bounded → pool rayon → resultados indexados → escritor ordenado
let (tx, rx) = crossbeam_channel::bounded(1024);
// worker pool consome, computa e devolve (idx, resultado);
// coletor reordena por idx e escreve.
```

Isso mantém alta utilização de CPU **e** memória limitada (evita carregar 1M cálculos).

### D4 — Alocadores, capacidade e PGO

Skill (`16`): `Vec::with_capacity`, allocators, profiling.

- `Vec::with_capacity`/`String::with_capacity` nos caminhos frios que ainda alocam.
- Binário nativo pode usar `tikv-jemallocator`/`mimalloc` (feature `alloc-jemalloc`), medindo o
  efeito.
- **PGO/BOLT** (`-Cprofile-generate`/`-Cprofile-use`) para o binário de produção; `-C target-cpu=native`
  apenas no binário (nunca no crate publicado/WASM).

### D5 — WASM idiomático

Skill (`00`, `16`). No alvo WASM:

- `Clock` implementado sobre `js_sys::Date::now()` e `web_sys`/`crypto.getRandomValues` (entropia e
  tempo vêm do host, mantendo o core determinístico).
- `serde-wasm-bindgen` para converter `JsValue` ↔ tipos (números grandes como string).
- `console_error_panic_hook` em dev; sem `rayon` por padrão.
- `wasm-opt -Oz` e metas de tamanho medidas no CI.

---

## E. Ferramental e CI (segundo a skill)

A skill (`13`, `15`, `14`) recomenda um CI muito mais completo do que o doc 09/11:

| Ferramenta | Uso | Fundamento |
|-----------|-----|-----------|
| `cargo fmt --check` | estilo | `01`, `16` |
| `cargo clippy -- -D warnings` | lints | `01`, `16` |
| `cargo nextest` | testes rápidos em CI | `13` |
| `cargo test --doc` | doc tests como spec | `13` |
| `proptest` | propriedades (A5, invariantes) | `13` |
| `insta` | snapshots de outputs/i18n | `13` |
| `cargo-fuzz` | parser + desserializador | `14` |
| `cargo miri test` | UB no módulo `unsafe` | `14` |
| `cargo-deny` | **licenças** (evitar LGPL) + advisories | `15` |
| `cargo-audit` | vulnerabilidades | `16` |
| `cargo-semver-checks` | estabilidade da API | `15` |
| `cargo-llvm-cov`/`tarpaulin` | cobertura | `13`, `16` |
| `criterion` + `cputicks` | benchmarks por camada | `13` |

> **`cargo-deny` é crítico**: o produto é MPL-2.0 e a skill alerta para auditoria de licenças.
> Impede a entrada acidental de dependências LGPL (ex.: `rug`/GMP, `malachite`).

### E1 — Perfis corrigidos

A skill (`15`) diferencia perfis. Para um produto de **exatidão**:

```toml
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = "symbols"
overflow-checks = true      # ← rede de segurança em código não-numérico; barato
debug-assertions = false

[profile.release.package.calc-auy]   # só o binário
panic = "abort"

[profile.bench]
inherits = "release"
debug = 1
```

- `panic = "abort"` **apenas** no binário/WASM (bibliotecas não devem forçá-lo — quebra unwinding e
  testes).
- `overflow-checks = true` em release: a aritmética racional usa ops verificadas, mas o restante do
  código fica protegido a custo desprezível.

### E2 — MSRV e edition

A skill aponta Rust 1.97 (`SKILL.md`) / `rust-version = "1.85"` (`16`), mas o ambiente já tem
**1.98.1**. Alinhar: `edition = "2024"`, `rust-version = "1.98"`, workspace `resolver` padrão.
Definir policy de MSRV (bump consciente, com `cargo-msrv`).

---

## F. Tensões e Decisões a Tomar

| Tensão | Trade-off | Recomendação |
|--------|-----------|--------------|
| Arena plana (B1) × enum recursivo ergonômico | Cache/localidade × simplicidade | Arena no core; projeção recursiva só no wire |
| `tracing` (B2) × `diag` caseiro | Ecossistema × controle total/eventos proprietários | `tracing` + catálogo de eventos; manter `fingerprint`/`redact` |
| Merkle log (A3) | Poder de custódia × mudança semântica do rastro | Adotar como `trace_version` 2, com migração |
| Memoização (A4) | Ganho em lotes × memória do cache | Cache por conteúdo, com limite e escopo por sessão |
| Content-addressing | Dedup × custo de hashing | Hashear só quando lotes/cache estiverem ativos |
| `panic = "abort"` | Binário menor × unwinding em libs | Só no binário |
| `no_std` | Portabilidade embarcada × complexidade | **Remover** (sem alvo embarcado) |

---

## Resumo: o que muda na prática

1. **AST tipada em memória + arena plana** (`FlatAst`), wire via serde.
2. **Typestate** `Draft → Committed → Verified`; `Digest`/`Salt`/`ContextLabel` como newtypes.
3. **Custódia como Merkle log** e **memoização por conteúdo** (valor × proveniência).
4. **`tracing`** no lugar do `diag` caseiro; **`thiserror`/`anyhow`**; erros `Send + Sync`.
5. **Backend numérico por trait**; `Small` provado equivalente a `Large` (oráculo).
6. **Canonical como derive** (sem `f64` por construção).
7. **Limites no streaming** da desserialização; `SmallVec`; `Arc<Metadata>`.
8. **CI de verdade**: Miri, fuzz, proptest, insta, nextest, **cargo-deny**, semver-checks.
9. **Perfis** com `overflow-checks` em release e `panic=abort` só no binário.
10. **Sem `no_std`**; features mínimas; lints herdados por crate.
