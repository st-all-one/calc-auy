# 14 — Arquitetura Oficial Rust: Decisões e Resoluções

> **Complemento**: o [doc 15 — Melhorias Habilitadas pelo Rust Oficial](./15-melhorias-rust-oficial.md)
> propõe aprimoramentos idiomáticos (arena plana, typestate, `tracing`, Merkle log, memoização por
> conteúdo) que refinam as decisões abaixo.

> **Status**: documento autoritativo. Onde houver conflito com os docs 02–13, **este prevalece**.
>
> **Premissas oficiais (decididas)**:
> 1. A implementação **oficial é Rust**; o TS é apenas referência de comportamento.
> 2. **Não há obrigação de compatibilidade de wire com o TS.** Seguimos o padrão Rust em tudo.
> 3. **Racional híbrido** com caminho rápido `Small { u64/u64 }` → promoção para `Large { BigInt }`.
> 4. **`unsafe` permitido** apenas sob política A/B com ganho comprovado.
> 5. **`calc-auy` é o binário final** (CLI). A biblioteca vive em crates próprios + fachada.
> 6. **WASM é alvo de alta prioridade.**
> 7. **i18n por último**, como camada de *realização linguística* (não tradução chave-valor).
> 8. **Performance por lotes multithread**, maximizando residência em cache L1/L2.

---

## Índice de Decisões (ADRs)

| ADR | Decisão | Resolve |
|-----|---------|---------|
| 001 | Racional híbrido `Small`/`Large` com aritmética verificada | A1 |
| 002 | Wire format Rust-native `snake_case`, versionado | A2 |
| 003 | Serialização canônica própria v1, sem f64 no payload assinado | A3, A7 |
| 004 | `pow` racional por raiz enésima exata ou erro tipado | A4 |
| 005 | Verificação de custódia como fase obrigatória ("verified AST") | A5 |
| 006 | Limites como invariantes de construtor/desserializador | A6 |
| 007 | Tipos selados; proibição de `f64`; operadores infalíveis | A7, E1 |
| 008 | Topologia de crates: libs + fachada + bin + wasm | B4 |
| 009 | Política de `unsafe` com A/B e fallback safe | B2, D3 |
| 010 | Motor de execução em lotes (SoA + tiles + multithread) | novo |
| 011 | i18n como camada NLG (SRL → realizer) | C4 |
| 012 | WASM como alvo de primeira classe | C6 |
| 013 | Schema versionado e política de evolução | C3 |
| 014 | Port `Clock` e determinismo | C1, C2 |
| 015 | Modelo de erro RFC 7807 | C1 |
| 016 | Alinhamento integral aos lints do dia 0 | B1, B3 |

---

## ADR-001 — Racional Híbrido

### Representação

```rust
// crates/calc-auy-core/src/rational/mod.rs

/// Racional exato. A semântica é única; a representação é adaptativa.
///
/// Invariantes (válidos em AMBAS as variantes):
/// - `d > 0` (denominador estritamente positivo; zero é `0/1`)
/// - `gcd(n, d) == 1` (sempre irredutível)
#[derive(Clone, Debug)]
pub struct Rational {
    repr: Repr,
}

#[derive(Clone, Debug)]
enum Repr {
    /// Caminho rápido. `n`, `d` cabem em u64 e a fração é canônica.
    Small { n: u64, d: u64 },
    /// Caminho de precisão arbitrária. Mesmos invariantes.
    Large { n: BigInt, d: BigInt },
}
```

**ZERO e ONE são constantes** (`Small { 0, 1 }` / `Small { 1, 1 }`), eliminando alocação no caso mais comum.

### Prevenção estrutural do overflow

Nenhuma operação trunca ou entra em panic. Toda aritmética é **verificada**; overflow é **sinal de promoção**, não erro:

```rust
/// Tenta resolver a adição no caminho Small. `None` ⇒ promover para Large.
#[inline]
fn try_add_small(a: (u64, u64), b: (u64, u64)) -> Option<(u64, u64)> {
    let (a_n, a_d) = (u128::from(a.0), u128::from(a.1));
    let (b_n, b_d) = (u128::from(b.0), u128::from(b.1));

    // Produtos cabem sempre em u128; a soma pode estourar → checked_add.
    let num = a_n.checked_mul(b_d)?.checked_add(b_n.checked_mul(a_d)?)?;
    let den = a_d.checked_mul(b_d)?;

    let g = gcd_u128(num, den);
    let (num, den) = (num / g, den / g);

    if num <= u128::from(u64::MAX) && den <= u128::from(u64::MAX) {
        Some((num as u64, den as u64))
    } else {
        None // promove para BigInt — nunca perde precisão
    }
}
```

`gcd_u128` usa **Binary GCD branchless** (sem divisão), o que mantém o caminho quente livre de `DIV`.

### Promoção e rebaixamento

- **Promoção**: quando `Small` não cabe ou quando uma operação com `Large` é pedida → converte para `BigInt`.
- **Rebaixamento** (`Large` → `Small`): opcional e somente quando `n`, `d` caibam em `u64` após a operação. Ajuda cargas que alternam entre valores grandes e pequenos. Deve ser medido antes de habilitar por padrão.
- **Correção**: existe uma única implementação de referência (`Large`, com `BigInt`), usada como oráculo nos testes. Os testes de propriedade exigem `small_path == large_path` para todo o domínio amostrado.

### Semântica de serialização

Independente da variante interna, `n`/`d` são serializados como **strings decimais** e sempre canônicos. Assim, a assinatura não depende da representação.

### Comparação e ordenação

`Small` vs `Small` compara por produtos cruzados em `u128` (com promoção em overflow); misto promove o lado menor. Nunca usa `f64`.

---

## ADR-002 — Wire Format Rust-Native (`snake_case`)

Formato oficial **v1**, independente do TS:

```json
{
  "trace_version": 1,
  "context_label": "financial",
  "ast": {
    "kind": "operation",
    "op_type": "mul",
    "operands": [
      { "kind": "literal", "value": { "n": "10000", "d": "1" }, "original_input": "10000" },
      { "kind": "group", "child": { "kind": "operation", "op_type": "pow", "operands": [ ] } }
    ],
    "metadata": { "ref": "SELIC, mar/26" }
  },
  "final_result": { "n": "96702579", "d": "6400" },
  "round_strategy": "nbr5891",
  "signature": "…"
}
```

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Node {
    Literal {
        value: RationalValue,
        original_input: String,
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    Operation {
        op_type: OperationType,
        operands: Vec<Node>,
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    Group {
        child: Box<Node>,
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
    Control {
        child: Box<Node>,
        previous_context_label: String,
        previous_signature: String,
        previous_round_strategy: RoundingStrategy,
        #[serde(default, skip_serializing_if = "Metadata::is_empty")]
        metadata: Metadata,
    },
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum OperationType {
    Add, Sub, Mul, Div, Pow, Mod, DivInt, CrossContextAdd,
}

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum RoundingStrategy {
    Nbr5891, HalfUp, HalfEven, Truncate, Ceil, None,
}
```

- **Chaves de metadata** ordenadas (`BTreeMap`) → determinismo de serialização.
- `original_input` é preservado para auditoria.
- `trace_version` obrigatório no topo.

---

## ADR-003 — Serialização Canônica Própria (v1)

Como a implementação oficial é Rust, **definimos o formato canônico** e o versionamos. Isso elimina o problema de compatibilidade com `Number.prototype.toString()` do JS.

### Prevenção estrutural: o payload assinado não contém `f64`

```rust
/// Valor permitido em metadata. NÃO existe variante de ponto flutuante.
///
/// Isso torna a canonicalização trivial, determinística e `Eq + Hash`.
/// Decimais devem ser representados como string (ex.: "14.75") ou racional.
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MetaValue {
    Null,
    Bool(bool),
    Int(i64),
    Uint(u64),
    Str(String),
    Array(Vec<MetaValue>),
    Object(BTreeMap<String, MetaValue>),
}
```

> **Isto resolve o bug de compilação A7** (`serde_json::Value` não é `Eq`/`Hash`) e o risco A3 em um só movimento: ao remover `f64` do domínio assinado, a canonicalização de números deixa de ser ambígua.

### Canonicalizador

```rust
// crates/calc-auy-core/src/canonical.rs
/// Escreve a forma canônica v1 diretamente no buffer (sem round-trip por Value).
pub fn write_canonical(value: &impl Serialize, out: &mut Vec<u8>) -> Result<(), CalcAuyError>;
```

Regras v1 (documentadas e congeladas):
- Objetos: chaves ordenadas por bytes UTF-8; sem espaços.
- Arrays: ordem preservada.
- Strings: escape JSON mínimo (`"`, `\`, controles).
- Inteiros: decimal, sem zeros à esquerda; `u64`/`i64` completos (sem perda).
- **Proibido `f64`**: a ausência da variante garante em tempo de compilação.
- Sem `null` implícito: campos ausentes são omitidos.

### Assinatura

Como não há restrição de compatibilidade, usamos **BLAKE3 keyed** com derivação de chave a partir do salt — eliminando a ambiguidade de fronteira `canonical || salt`:

```rust
pub fn sign(canonical: &[u8], salt: &str) -> [u8; 32] {
    let key = blake3::derive_key("calc-auy/v1 signature", salt.as_bytes());
    blake3::keyed_hash(&key, canonical).into()
}
```

- Salt vazio é permitido (chave derivada de contexto fixo).
- A codificação (`hex`, `base64`, `base32`, `base58`) é aplicada **após** o hash.

---

## ADR-004 — `pow` Racional: Raiz Enésima Exata ou Erro

`(n/d)^(p/q)` é racional **somente** se `n` e `d` forem potências `q`-ésimas perfeitas. A prevenção estrutural é **nunca computar `n^p` antes de verificar a raiz** — isso evita explosão de bits.

```rust
pub fn pow(&self, exp: &Rational, limits: &Limits) -> Result<Rational, CalcAuyError> {
    let (p, q) = exp.as_coprime_parts()?;      // p/q reduzido, q > 0
    if q == 1 {
        return self.pow_int(p, limits);         // caminho inteiro, com orçamento de bits
    }
    // q > 1: exige raiz q-ésima exata
    let root_n = exact_nth_root(self.numer(), q)?; // Option<BigInt>/u64
    let root_d = exact_nth_root(self.denom(), q)?;
    match (root_n, root_d) {
        (Some(rn), Some(rd)) => {
            // (rn/rd)^p, com p possivelmente negativo
            Rational::new_checked(rn, rd, limits)?.pow_int(p, limits)
        }
        _ => Err(CalcAuyError::IrrationalResult { base: self.clone(), exp: exp.clone() }),
    }
}
```

- Base negativa só é permitida se `q` for ímpar (senão `IrrationalResult`/`MathDomain`).
- `pow_int` pré-calcula o **orçamento de bits** (`bits(base) * |p|`) e retorna `MathOverflow` **antes** de alocar, prevenindo DoS.
- `0^0 = 1`, `0^n = 0` (n>0), `0^-n = DivisionByZero` — documentados e testados.

---

## ADR-005 — Custódia Verificada ("Verified AST")

### Prevenção: um `Control` não pode ser avaliado sem verificação

O tipo de avaliação **não aceita** a AST crua. A única forma de obter o tipo aceito é passar pela verificação de custódia:

```rust
/// AST que passou pela verificação de todas as cadeias cross-contexto.
/// Campo privado: só pode ser construído por `Ast::verify_custody`.
pub struct VerifiedAst {
    inner: Ast,
    _private: (),
}

impl Ast {
    /// Percorre todos os nós `Control`, reconstruindo o payload anterior,
    /// recomputando a assinatura e comparando com `previous_signature`.
    /// Também valida `previous_context_label` e `previous_round_strategy`.
    pub fn verify_custody(
        self,
        verifier: &dyn CustodyVerifier,
        limits: &Limits,
    ) -> Result<VerifiedAst, CalcAuyError>;
}

/// `eval` só aceita `&VerifiedAst`.
pub fn eval(ast: &VerifiedAst, limits: &Limits) -> Result<Rational, CalcAuyError>;
```

- `cross_context_add` exige operandos `Control` **verificados** e rótulos de contexto coerentes; a verificação é feita *antes* da avaliação.
- ASTs sem `Control` passam pela fase como no-op (custo desprezível).
- O padrão "parse, don't validate" garante que **não existe** caminho de código que avalie um `Control` sem checar a assinatura.

---

## ADR-006 — Limites como Invariantes

### Prevenção: verificar na construção, nunca no call-site

```rust
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub max_bits: u64,            // 1_000_000
    pub max_depth: usize,         // 500
    pub max_nodes: usize,         // 1000
    pub max_operands: usize,      // 100
    pub max_metadata_bytes: usize,// 16384
}
```

Os limites são aplicados **dentro** de:
- `Rational::new_checked` / `pow_int` (bit-length após a própria operação);
- construtores de `Node` e do builder (profundidade, nós, operandos);
- `Deserialize` customizado de `Node`/`Ast` (contagem/ profundidade/tamanho) — **hidratação nunca constrói AST inválida**;
- `Metadata::insert` (tamanho serializado em bytes).

### Flattening hierárquico (`MAX_OPERANDS`)

O original já usa esse truque (mantém construção O(N) e profundidade O(log N)). Portamos:

```rust
/// Ao acumular operandos de mesmo tipo, uma operação nunca ultrapassa `max_operands`.
/// Ao encher, cria-se uma nova camada — profundidade O(log_N).
fn push_operand(op: &mut OperationBuilder, value: Node, limits: &Limits) {
    if op.operands.len() < limits.max_operands {
        op.operands.push(value);
    } else {
        let full = op.take_node();
        op.operands = vec![full, value];
    }
}
```

Efeito: um `+` de 100.000 termos gera profundidade ~2–3, não 100.000.

---

## ADR-007 — Tipos Selados e Aritmética Infalível

### Entrada sem `f64`

```rust
/// Trait selado: só tipos EXATOS podem virar Rational.
/// f64/f32 NÃO implementam. Erro de compilação em vez de perda silenciosa.
pub trait IntoRational: private::Sealed {
    fn into_rational(self, limits: &Limits) -> Result<Rational, CalcAuyError>;
}

impl IntoRational for i64 { /* … */ }
impl IntoRational for u64 { /* … */ }
impl IntoRational for i128 { /* … */ }
impl IntoRational for u128 { /* … */ }
impl IntoRational for BigInt { /* … */ }
impl IntoRational for &str { /* … */ }
impl IntoRational for Rational { /* … */ }
```

### Operadores

- `Add`, `Sub`, `Mul`, `Neg`: **infalíveis** (overflow promove; nunca panic).
- `Div`, `Rem`: **sem** `std::ops`; apenas `checked_div`/`checked_rem` → `Result`. Impossível dividir por zero sem tratar.
- `pow`: `Result` (ADR-004).
- `Eq`/`Hash`: deriváveis em `Node` graças a `MetaValue` (ADR-003). Onde a identidade não for útil, usar `canonical_hash()`.

---

## ADR-008 — Topologia de Crates

```
calc-auy-rs/
├── Cargo.toml                    # workspace (lints, versões)
├── crates/
│   ├── calc-auy-core/            # Rational, AST, engine, rounding, canonical, signature, error
│   ├── calc-auy-parser/          # lexer + parser → AST
│   ├── calc-auy-builder/         # fluent API + custodía + hibernate/hydrate
│   ├── calc-auy-output/          # monetary, latex, unicode, slice, audit, mermaid
│   ├── calc-auy-i18n/            # SRL + realizers (implementado por último)
│   ├── calc-auy-processors/      # protobuf, cbor, msgpack (gerados do schema)
│   ├── calc-auy-api/             # FACHADA: superfície pública única
│   ├── calc-auy-wasm/            # cdylib wasm-bindgen (ALTA PRIORIDADE)
│   └── calc-auy/                 # BINÁRIO final: CLI + tudo embutido
└── xtask/                        # tarefas de build (schema, corpus, wasm)
```

Regras:

- **`calc-auy` é binário** (`[[bin]]`), com CLI (subcomandos `commit`, `hydrate`, `verify`, `sign`, `format`, `batch`, `repl`, `schema`).
- **`calc-auy-wasm` é `cdylib`** consumindo `calc-auy-api`.
- **`calc-auy-api`** é a única superfície pública de biblioteca (o CLI e o WASM não duplicam lógica).
- Dependência sempre aponta para o core; nenhuma lib depende do binário.

```toml
# workspace
[workspace]
resolver = "2"
members = ["crates/*", "xtask"]
default-members = ["crates/calc-auy"]

[workspace.lints] # ver doc 11 (corrigido pelo ADR-016)
```

Grafos:
```
core ─┬─> parser ─┐
      ├─> builder ├─> output ─> i18n
      ├─> processors
      └───────────┴─> api ─┬─> calc-auy (bin)
                           └─> calc-auy-wasm (cdylib)
```

---

## ADR-009 — Política de `unsafe` (A/B com Barra de Evidência)

`unsafe` é permitido, confinado e condicionado a evidência:

1. **Confinamento**: apenas nos módulos `core::simd` e `core::ticks`, com `#![allow(unsafe_code)]` local. O resto do workspace mantém `unsafe_code = "deny"`.
2. **Fallback obrigatório**: toda função `unsafe` tem gêmea `safe` com semântica idêntica.
3. **Teste A/B**: benchmark pareado (mesmo input, mesma máquina) via `criterion` + `cputicks` (RDTSC). **Só permanece** se:
   - ganho ≥ limiar definido (sugestão: **≥ 15% no throughput** ou **≥ 20% na latência p99**), **e**
   - testes diferenciais provam equivalência (proptest + corpus + fuzzing).
4. **Dispatch de runtime**: detecção de features (`is_x86_feature_detected!`) ou `pulp`, com seleção da variante.
5. **Documentação**: cada `unsafe fn` traz `# Safety` e a referência ao benchmark que a justifica.
6. **Matriz de alvos**: x86-64 (AVX2/AVX-512), aarch64 (NEON), wasm (sem SIMD ou `simd128`).

> Sem esse protocolo, `unsafe` não entra. Isso protege a garantia de correção do produto.

---

## ADR-010 — Motor de Execução em Lotes (SoA + Tiles + Multithread)

Este é o vetor principal de performance extrema do Rust (mais relevante que SIMD em bignum).

### Princípio: paralelismo é exato e determinístico

Como a aritmética racional é **exata**, `a+b` e `a*b` são associativas e comutativas **sem erro de arredondamento**. Portanto a redução paralela é **exata e independente de ordem** — ao contrário de `f64`. Isso permite paralelizar somas/produtos longos com segurança matemática.

### Layout SoA para lotes pequenos

```rust
/// Lote homogêneo de racionais que cabem em u64 (caminho mais quente).
pub struct SmallBatch {
    nums: Vec<u64>, // Structure of Arrays
    dens: Vec<u64>,
}
```

- Valores que não cabem (`Large`) vão para uma tabela lateral indexada.
- Duas `Vec<u64>` contíguas maximizam densidade útil por cache line e permitem carregar 8 lanes por instrução (auto-vetorização + SIMD quando vantajoso).

### Tiling (L1/L2)

```rust
/// Tamanho de tile ajustado para o conjunto de trabalho residir em L2.
/// Num+den (16 B) + acumuladores parciais ⇒ ~L2/32. Tunável por benchmark.
pub const SMALL_TILE: usize = 1024;

pub fn sum_batch(batch: &SmallBatch) -> Rational {
    let partials: Vec<Rational> = batch
        .nums
        .par_chunks(SMALL_TILE)
        .zip(batch.dens.par_chunks(SMALL_TILE))
        .map(|(ns, ds)| sum_tile(ns, ds))   // acumula no tile, simplifica no fim do tile
        .reduce(|| Rational::ZERO, |a, b| a + b); // redução exata
    partials
}
```

- Trabalho por tile fica quente na **L1/L2**; a redução final combina poucos parciais.
- **Timing de simplificação**: dentro do tile acumula-se sem simplificar a cada termo (o brainstorm está certo); **a borda do tile** (e o resultado final) é canônica. Isso concilia "simplificar sempre" (contrato observável) com "não simplificar a cada passo" (performance interna).

### Paralelismo entre cálculos

```rust
pub fn eval_batch(asts: &[VerifiedAst], limits: &Limits) -> Vec<Result<Rational, CalcAuyError>> {
    let mut out: Vec<Result<Rational, CalcAuyError>> = vec![Ok(Rational::ZERO); asts.len()];
    out.par_iter_mut()
        .zip(asts.par_iter())
        .for_each(|(slot, ast)| *slot = eval(ast, limits));
    out
}
```

- Resultados **indexados** (não ordenados por conclusão) ⇒ determinismo.
- Sem locks no caminho quente; cada thread escreve na sua posição pré-alocada.
- Evita *false sharing* com buffers por faixa.

### Regras de cache e alocação

1. Preferir **arena por thread** para nós intermediários; nunca alocar por operação escalar.
2. Reutilizar buffers entre commits (scratch *pool*).
3. `Small` **não aloca**: os 16 bytes vivem na pilha/SoA.
4. Medir tamanho de tile e grau de paralelismo por CPU (`xtask bench tile`).
5. **WASM**: feature `parallel` desligada por padrão (sem `rayon`); tiling permanece. Suporte opcional a `wasm-threads`.

---

## ADR-011 — i18n como Camada de Realização Linguística (por último)

Não é tradução chave-valor. É **NLG determinístico**: uma representação semântica neutra é "realizada" por funções específicas de cada idioma, que decidem **ordem, concordância, número, gênero, script e palavras-número**.

### Representação Semântica (SRL)

```rust
/// Árvore de SIGNIFICADO, independente de idioma.
pub enum Srl {
    Number { value: Rational, rendered: NumberStyle },
    Add(Box<Srl>, Box<Srl>),
    Mul(Box<Srl>, Box<Srl>),
    Pow(Box<Srl>, Box<Srl>),
    Group(Box<Srl>),
    Round { value: Box<Srl>, strategy: RoundingStrategy, decimals: u32 },
    Equals(Box<Srl>, Box<Srl>),
}
```

### Realizer por idioma

```rust
pub trait VerbalRealizer {
    /// Realiza a SRL em linguagem natural, decidindo ordem e flexões.
    fn realize(&self, srl: &Srl, out: &mut String);
}

pub struct PtBr;
impl VerbalRealizer for PtBr {
    fn realize(&self, srl: &Srl, out: &mut String) {
        match srl {
            Srl::Mul(a, b) => {
                self.realize(a, out);
                out.push_str(" multiplicado por ");
                self.realize(b, out);
            }
            // ordem, plural, gênero, "abre parênteses", etc.
        }
    }
}
```

- Idiomas podem **reordenar** (ex.: japonês coloca o operador após os operandos) e mudar a estratégia de leitura de números.
- Tabelas de palavras-número são **dados**; a gramática é **código**.
- A camada `calc-auy-output::verbal` só depende do **trait** `VerbalRealizer` → o core e os demais outputs não são bloqueados pela i18n.
- Registro de locales extensível sem recompilar o núcleo (feature por idioma).

**Ordem de implementação**: por último, mas o *seam* (trait + SRL) é definido desde o início.

---

## ADR-012 — WASM como Alvo de Primeira Classe

- Crate `calc-auy-wasm` (`crate-type = ["cdylib", "rlib"]`) com `wasm-bindgen`.
- Superfície JS gerada a partir de `calc-auy-api`.
- `commit` é síncrono no core; expomos versões `Promise` quando fizer sentido para o consumidor JS.
- Números grandes trafegam como **string** (BigInt não existe no wasm-bindgen ABI); helpers convertem.
- Sem `rayon` por padrão; `simd128` opcional atrás de feature.
- Metas: tamanho do `.wasm` ≤ X KB (medido), sem `panic = abort` implícito problemático, `console_error_panic_hook` em dev.
- CI: `wasm-pack test`, `wasm-opt`, publicação em npm/JSR.
- **É um entregável de fase inicial**, não um "depois".

---

## ADR-013 — Schema Versionado e Evolução

- Todo artefato serializado carrega `trace_version`.
- `schema/` mantém JSON Schema + CDDL; processadores (Proto/CBOR/MsgPack) são **gerados** de `schema/calc_auy.cddl` via `xtask schema`.
- Política: adicionar campos é OK (`#[serde(default)]`); renomear/remover exige *major*; nunca reutilizar nomes.
- Funções de migração `migrate(vN -> vN+1)` com testes.

---

## ADR-014 — Port `Clock` e Determinismo

```rust
pub trait Clock: Send + Sync {
    fn now_rfc3339(&self) -> String;
    fn next_uuid_v7(&self) -> Uuid;
}

pub struct SystemClock;      // produção
pub struct MockClock { /* determinístico, avança por passo */ }
```

- O **payload assinado não contém tempo nem aleatoriedade** — o timestamp de nascimento, quando existir, é campo separado e fora da assinatura (ou explicitamente fornecido).
- O `instance` de erro (UUID v7) usa o `Clock`; em testes, `MockClock` torna tudo reprodutível.
- `#[cfg(test)]` / feature `deterministic` instala o `MockClock` por padrão nas suítes.

---

## ADR-015 — Modelo de Erro (RFC 7807)

```rust
#[derive(Debug, Serialize, thiserror::Error)]
#[serde(rename_all = "snake_case")]
pub struct ProblemDetails {
    pub r#type: String,   // URL estável da wiki de erros
    pub title: String,
    pub status: u16,
    pub detail: String,
    pub instance: Uuid,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub context: BTreeMap<String, MetaValue>,
}

#[derive(Debug, thiserror::Error)]
pub enum CalcAuyError {
    #[error("divisão por zero")]                DivisionByZero,
    #[error("resultado irracional")]            IrrationalResult { .. },
    #[error("overflow matemático")]             MathOverflow { max_bits: u64 },
    #[error("limite excedido")]                 LimitExceeded { kind: LimitKind, .. },
    #[error("violação de integridade")]         IntegrityViolation { expected: String, received: String },
    #[error("custódia inválida")]               CustodyViolation { .. },
    // ...
}
```

- Conversão `CalcAuyError -> ProblemDetails` centralizada.
- O CLI e o WASM serializam `ProblemDetails`.

---

## ADR-016 — Alinhamento aos Lints do Dia 0

Todos os documentos passam a respeitar o doc 11. Ajustes:

| Conflito | Resolução |
|---|---|
| `unwrap`/`expect`/`panic` | Proibidos; operadores infalíveis por promoção; `Div`/`Rem` só via `checked_*` |
| `todo!`/`unimplemented!` | Proibidos; `pow` implementado (ADR-004) |
| `indexing_slicing` | Usar `split_at`/`get` |
| `HashMap` | Proibido; `BTreeMap`/`IndexMap` |
| `unsafe_code = deny` | Flexibilizado **somente** para `core::simd`/`core::ticks` (ADR-009), via `#[allow]` local; workspace segue `deny` |
| Rust 1.75 vs 1.98 | Unificar em **1.98 / Edition 2024** |

---

## Roadmap Reordenado

| Fase | Conteúdo | Depende de |
|------|----------|-----------|
| **0 — Fundação** | workspace, lints (doc 11), `diag`, `Clock`, `Limits`, `ProblemDetails`, `MetaValue`, ADRs registradas | — |
| **1 — Core** | `Rational` híbrido, AST (`snake_case`), canonical v1, signature keyed, `pow`, engine | Fase 0 |
| **2 — Custódia & Builder** | `VerifiedAst`, `verify_custody`, builder fluente, flattening, hibernate/hydrate | Fase 1 |
| **3 — Parser** | lexer + parser → AST, differential fuzz contra LRA de referência | Fase 1 |
| **4 — Output** | monetary, latex, unicode, slice, audit trace, mermaid (sem i18n) | Fase 2 |
| **5 — Lotes & Performance** | SoA, tiling, `eval_batch`, A/B de `unsafe`, benchmarks por camada | Fases 1–4 |
| **6 — WASM** | `calc-auy-wasm`, bindings, CI wasm, publicação | Fase 4 |
| **7 — CLI** | `calc-auy` binário, subcomandos, formatos | Fases 4–6 |
| **8 — Processors** | protobuf/CBOR/MsgPack gerados do schema | Fase 1 |
| **9 — i18n** | SRL + realizers por idioma | Fase 4 |

---

## Corpus de Conformidade (não mais "compatibilidade com TS")

Como Rust é oficial, o corpus passa a ser **especificação executável**:

1. Vetores escritos à mão para cada regra (arredondamento, `pow`, limites, custódia, canonical).
2. `proptest`: invariantes do racional (corpo/ordem/simplificação) e equivalência `Small`/`Large`.
3. `fuzz` (cargo-fuzz): parser e desserializador.
4. O TS pode ser mantido como **oráculo diferencial opcional** em desenvolvimento, mas **não** é requisito de aceitação.

---

## Checklist da Versão Oficial

- [ ] ADR-001..016 registradas e revisadas.
- [ ] `Rational` híbrido com equivalência `Small == Large` provada.
- [ ] Wire v1 `snake_case` com `trace_version`.
- [ ] Canonical v1 sem `f64`; assinatura keyed.
- [ ] `pow` exato ou `IrrationalResult`; sem `todo!`.
- [ ] `VerifiedAst` obrigatório para `eval`.
- [ ] Todos os limites em construtores/desserializadores.
- [ ] `MetaValue` (Eq/Hash) — sem `serde_json::Value` no domínio assinado.
- [ ] Sem `f64` na ingestão (trait selado).
- [ ] `Add/Sub/Mul` infalíveis; `Div/Rem` via `checked_*`.
- [ ] `calc-auy` binário; `calc-auy-api` fachada; `calc-auy-wasm` cdylib.
- [ ] Motor de lotes SoA + tiles + `rayon`, determinístico.
- [ ] Política de `unsafe` A/B documentada e aplicada.
- [ ] `Clock` + `MockClock`; determinismo testado.
- [ ] RFC 7807 completo.
- [ ] Schema versionado + processors gerados.
- [ ] WASM publicado e testado em CI.
- [ ] i18n como SRL + realizer (por último).
- [ ] Lints do dia 0 verdes (`clippy -D warnings`, `fmt --check`, testes).
