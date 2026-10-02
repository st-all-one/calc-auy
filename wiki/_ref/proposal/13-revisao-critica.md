# 13 — Revisão Crítica da Proposta

> **Escopo**: revisão da proposta `wiki/_ref/proposal/` assumindo que este será o **Rust oficial** (não um porte descartável), mantendo o objetivo central do `calc-auy-ts` (exatidão + auditabilidade + inclusividade) e o norte de **performance extrema** do `wiki/_ref/brainstorm/`.
>
> **Método**: leitura integral dos 13 documentos + confronto com o código-fonte original (`src/utils/security.ts`, `src/core/constants.ts`, `wiki/architecture.md`) e com os 4 brainstorms.

---

## Sumário Executivo da Revisão

### Veredito

A proposta tem boa **direção arquitetural** (core enxuto + camadas, type-state, instrumentação desde o dia 0), mas **não está pronta para ser a versão oficial**. Há **uma contradição conceitual central não resolvida**, **6 bloqueadores de correção/compatibilidade** e **uma série de conflitos internos** entre documentos que impedem tanto a compilação quanto a interoperabilidade bit-a-bit com o TS.

O erro mais grave: **o documento 03 (BigInt) e o documento 12 (u64/u128) propõem representações numéricas mutuamente exclusivas**, e nenhum documento reconcilia isso. Como a assinatura BLAKE3 depende de cada literal `n/d` no JSON, mudar a representação muda a assinatura — ou seja, **essa decisão é irreversível para rastros já emitidos**.

### Tabela de Achados

| ID | Severidade | Achado | Documento |
|----|-----------|--------|-----------|
| A1 | 🔴 P0 | Representação numérica contraditória (BigInt vs u64/u128) | 03 vs 12 |
| A2 | 🔴 P0 | Formato JSON incompatível (serde sem `rename`/`tag`) | 03, 04, 05 |
| A3 | 🔴 P0 | JCS incompleto (`todo!`) e não conforme a ECMAScript | 05 |
| A4 | 🔴 P0 | `pow_fractional` inexistente + raízes irracionais não tratadas | 03 |
| A5 | 🔴 P0 | `ControlNode` / `crossContextAdd` não verificam assinatura prévia | 04 |
| A6 | 🔴 P0 | Limites de segurança (1M bits, 16KB metadata, MAX_OPERANDS) não aplicados | 03, 04 |
| A7 | 🔴 P0 | `#[derive(Eq, Hash)]` em `Node` não compila (contém `serde_json::Value`) | 04 |
| B1 | 🟠 P1 | Conflito com os lints do dia 0 (`unwrap`/`panic`/`todo`/`indexing_slicing`) | 03, 05 vs 11 |
| B2 | 🟠 P1 | `unsafe_code = deny` vs SIMD/RDTSC em `unsafe` | 11 vs 12 |
| B3 | 🟠 P1 | `HashMap` proibido nos lints, mas proposto para cache | 11 vs 02, 10 |
| B4 | 🟠 P1 | Crate fachada `crates/calc-auy` referenciada e nunca definida | 11 |
| C1 | 🟠 P1 | Modelo de erro RFC 7807 incompleto; `instance` não determinístico | 02, 04 |
| C2 | 🟠 P1 | Falta o port `Clock` (determinismo de timestamps) | 11 |
| C3 | 🟠 P1 | Schema do rastro não versionado | todos |
| C4 | 🟠 P1 | i18n hardcoded em módulos Rust (não extensível, não data-driven) | 02 |
| C5 | 🟠 P1 | Sem corpus de conformidade golden TS↔Rust | 09 |
| C6 | 🟠 P1 | Sem caminho de distribuição WASM (substituto de pacote JSR) | todos |
| D1 | 🟡 P2 | Doc 12 é órfão (não integrado ao core) | 12 |
| D2 | 🟡 P2 | Alocações desnecessárias no `eval` (clones de BigInt, `Vec` por `Apply`) | 04 |
| D3 | 🟡 P2 | SIMD é largamente inaplicável a bignum; doc promete demais | 12 |
| D4 | 🟡 P2 | Benchmarks especulativos, sem metodologia nem RDTSC | 10 |
| D5 | 🟡 P2 | Builder `&self -> Self` implica cópia O(N²) sem partilha estrutural | 02 |
| E1 | 🟡 P2 | `Into<Rational>` aceita `f64` (rompe a garantia de exatidão) | 02 |
| E2 | 🟡 P2 | `commit()` sem opções; paridade de API incompleta | 02 |
| E3 | 🟡 P2 | Encoders base32/base58 sem garantia de padding idêntico | 05 |

### Status das Resoluções

Todas as decisões abaixo foram tomadas e estão registradas no [doc 14 — Arquitetura Oficial Rust](./14-arquitetura-oficial-rust.md).

| Achado | Status | Resolução |
|--------|--------|-----------|
| A1 | ✅ Resolvido | ADR-001 — Racional híbrido `Small { u64/u64 }` → `Large { BigInt }` com aritmética verificada |
| A2 | ✅ Resolvido | ADR-002 — wire `snake_case` Rust-native, versionado (TS é só referência) |
| A3 | ✅ Resolvido | ADR-003 — canonical próprio v1, sem `f64` no payload assinado; BLAKE3 keyed |
| A4 | ✅ Resolvido | ADR-004 — `pow` por raiz enésima exata ou `IrrationalResult` |
| A5 | ✅ Resolvido | ADR-005 — `VerifiedAst` obrigatório para `eval` |
| A6 | ✅ Resolvido | ADR-006 — limites como invariantes de construtor/desserializador |
| A7 | ✅ Resolvido | ADR-003/007 — `MetaValue` (Eq/Hash); sem `serde_json::Value` |
| B1 | ✅ Resolvido | ADR-016 — operadores infalíveis, sem `unwrap`/`panic`/`todo` |
| B2 | ✅ Resolvido | ADR-009 — `unsafe` confinado com política A/B |
| B3 | ✅ Resolvido | ADR-016 — `BTreeMap`/`IndexMap` |
| B4 | ✅ Resolvido | ADR-008 — `calc-auy` binário + `calc-auy-api` fachada + `calc-auy-wasm` |
| C1 | ✅ Resolvido | ADR-015 — RFC 7807 completo |
| C2 | ✅ Resolvido | ADR-014 — port `Clock` + `MockClock` |
| C3 | ✅ Resolvido | ADR-013 — schema versionado |
| C4 | ✅ Resolvido | ADR-011 — i18n como camada NLG (SRL → realizer), por último |
| C5 | ⚠️ Reenquadrado | Corpus vira especificação executável (Rust oficial), TS como oráculo opcional |
| C6 | ✅ Resolvido | ADR-012 — WASM de alta prioridade |
| D1 | ✅ Resolvido | Doc 12 integrado ao ADR-001/009/010 |
| D2 | ✅ Resolvido | ADR-010 — buffers/arena, sem alocação por operação |
| D3 | ✅ Resolvido | ADR-009/010 — SIMD só com A/B; lotes como vetor principal |
| D4 | ✅ Resolvido | Benchmarks medidos (criterion + cputicks) por camada |
| D5 | ✅ Resolvido | ADR-008 — builder com partilha estrutural (`Arc`/consumível) |
| E1 | ✅ Resolvido | ADR-007 — trait selado, sem `f64` |
| E2 | ⚠️ Em curso | Paridade de API definida no ADR-008/015 (a completar na Fase 4) |
| E3 | ⚠️ Em curso | Encoders definidos no ADR-003 (sem requisito de padding do TS) |

---

## 1. A Contradição Central: Precisão Arbitrária vs. Performance Extrema

### O problema

- **Doc 03** define `Rational { n: BigInt, d: BigInt }` (precisão arbitrária, teto de 1M bits — exigência do original).
- **Doc 12** propõe `Fraction<u64, u128>` com `binary_gcd` e LUTs (performance extrema).
- **Nenhum documento integra os dois.** O doc 12 é um apêndice que contradiz o núcleo do doc 03.

Isso não é cosmético: o original exige **exatidão arbitrária** (`MAX_BI_BITS = 1_000_000n`) e **GCD a cada operação**. Um `u64` estoura em `2^64 ≈ 1.8e19`, enquanto o contrato permite valores com ~300.000 dígitos. Adotar `u64` **viola a garantia jurídica central** do produto.

### A resolução (proposta)

Um **Racional híbrido com dois caminhos**, preservando `n/d` canônico em toda a borda:

```rust
/// Dois níveis de representação, mesmo contrato semântico.
pub struct Rational {
    repr: Repr,
}

enum Repr {
    /// Caminho rápido: cabe em u128 numerador e denominador.
    /// `Small` deve estar SEMPRE simplificado (gcd=1, d>0).
    Small { n: u64, d: u64 },
    /// Caminho de precisão arbitrária (espelho do TS, teto de 1M bits).
    Large { n: BigInt, d: BigInt },
}
```

Regras de ouro:

1. **Semântica idêntica ao TS** — o resultado observável (n/d canônico) não depende do caminho interno.
2. **Promoção com verificação de overflow** — `u128` intermediário; se `num`/`den` não couberem em `u64`, promove para `Large` (nunca trunca).
3. **Serialização sempre canônica** — a assinatura só enxerga a forma simplificada, independentemente do caminho.
4. **O brainstorm de "simplificar só no final" aplica-se apenas ao interior de uma operação** (que tem ≤ `MAX_OPERANDS = 100` operandos), nunca à borda observável. O `d` de cada nó literal permanece canônico.

> **Decisão que precisa virar ADR (Architecture Decision Record) e estar no doc 02/03**, com testes que provem `eval_hybrid == eval_bigint` para todo o corpus.

---

## 2. Bloqueadores de Correção e Compatibilidade (P0)

### A2 — Formato JSON incompatível

O doc 04 deriva `Serialize`/`Deserialize` **sem nenhum atributo de renomeação**, mas o formato do TS é:

```json
{ "kind": "operation", "type": "mul", "operands": [ { "kind": "literal",
  "value": { "n": "10000", "d": "1" }, "originalInput": "10000" } ] }
```

O derive padrão do Rust produziria `{"Operation":{"op_type":"Mul","operands":[...]}}` — **totalmente incompatível**. Correção necessária:

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Node {
    Literal {
        value: RationalValue,
        #[serde(rename = "originalInput")]
        original_input: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
    Operation {
        #[serde(rename = "type")]
        op_type: OperationType,
        operands: Vec<Node>,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
    Group { child: Box<Node>, #[serde(skip_serializing_if = "Option::is_none")] metadata: Option<Metadata> },
    Control {
        child: Box<Node>,
        #[serde(rename = "previousContextLabel")] previous_context_label: String,
        #[serde(rename = "previousSignature")] previous_signature: String,
        #[serde(rename = "previousRoundStrategy")] previous_round_strategy: String,
        #[serde(skip_serializing_if = "Option::is_none")] metadata: Option<Metadata>,
    },
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OperationType {
    Add, Sub, Mul, Div, Pow, Mod,
    #[serde(rename = "divInt")] DivInt,
    #[serde(rename = "crossContextAdd")] CrossContextAdd,
}
```

Além disso, o **`Ast` do doc 04 não corresponde ao rastro do TS**. O rastro é `{ ast, finalResult, roundStrategy, signature }` (e o payload assinado é `{ ast, finalResult, roundStrategy }`). Deve existir uma estrutura explícita:

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignaturePayload {
    pub ast: AstNode,          // a ÁRVORE, não o wrapper
    pub final_result: RationalValue,
    pub round_strategy: RoundingStrategyId,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditTrace {
    #[serde(flatten)] pub payload: SignaturePayload,
    pub signature: String,
    // contextLabel se o TS o incluir no rastro externo
}
```

> `verify_integrity` no doc 05 desserializa o rastro inteiro como `Ast` — **bug garantido**. Precisa desserializar `AuditTrace`, remover `signature`, reassinar `SignaturePayload` e comparar.

### A3 — JCS não conforme

O `to_canonical_string` do doc 05 está errado em pontos que quebram a compatibilidade:

1. `expand_scientific` é `todo!()` — o caminho de `1e21`, `1.5e-7`, etc. não existe.
2. `format!("{}", f)` **não** é `Number.prototype.toString()` (ECMAScript). JCS §3.2.2.2 exige o algoritmo da ECMAScript (shortest round-trip + limiares de expoente `<-6` / `>=21`). Rust com `ryu` formata diferente (ex.: `1e21` vs `1e+21`, e limiares distintos).
3. Falta `-0 → "0"`, remoção de `.0` para inteiros (`1.0` no TS → `"1"`), e rejeição de `Date`/`RegExp`/`function`/`symbol`/`BigInt` (o TS lança `TypeError`).
4. `undefined` como valor de objeto é **omitido** no TS; precisa replicar.
5. O round-trip via `serde_json::to_value` é frágil: sem `arbitrary_precision`, inteiros > `u64` em metadata viram erro; e a distinção `1` vs `1.0` se perde.

**Recomendação**: implementar um **serializador canônico que escreve direto**, com um formatador f64 compatível com ECMAScript (implementar o algoritmo ou usar uma crate que o faça), e uma **bateria de vetores golden** extraídos do TS (números, expoentes, `-0`, unicode, escapes, `undefined`, profundidade). Confirme também o construtor de bytes: o TS faz `blake3(utf8(canonical + salt))` — o Rust deve fazer exatamente igual (e documentar a ambiguidade de fronteira `canonical`/`salt` como risco aceito, já que BLAKE3 não é length-extendable).

### A4 — `pow_fractional` e o problema conceitual das raízes

`pow_fractional` é `todo!()`. Mas o buraco é conceitual, não só de implementação: **um racional elevado a expoente racional não é, em geral, racional** (ex.: `2^(1/2)`).

Decisão necessária e explícita:

- Calcular a raiz enésima **exata** (`n`-ésima) via `num_integer::Roots` / Newton inteiro.
- Se a raiz não for exata em numerador **e** denominador → erro tipado (`IrrationalResult`/`math-domain`), **nunca aproximar**.
- Confirmar em `src/core/rational.ts` qual é o comportamento atual do TS (limitar a expoente inteiro, ou raiz exata, ou erro) e **espelhá-lo**.

### A5 — `ControlNode` e `crossContextAdd` sem verificação

No doc 04, o engine trata `Control` de forma idêntica a `Group`:

```rust
Node::Group { child, .. } | Node::Control { child, .. } => {
    work_stack.push(EvalTask::Eval(child, depth + 1));
}
```

Isso **descarta** `previousContextLabel`, `previousSignature` e `previousRoundStrategy` — que são exatamente o mecanismo de **cadeia de custódia cross-contexto** (a funcionalidade "reanimação/cross-context" do produto). O engine precisa:

1. Validar a assinatura prévia com `previousSignature` + `previousContextLabel` + salt.
2. Garantir que `crossContextAdd` só combine nós com verificação bem-sucedida.
3. Propagar/reemitir a assinatura corretamente.

Sem isso, o recurso existe no tipo mas não na semântica — uma regressão de segurança silenciosa.

### A6 — Limites de segurança não aplicados

`check_safety()` (doc 03) está **definido e nunca chamado**. Além disso faltam, face às constantes reais do TS:

| Constante TS | Valor | Situação na proposta |
|---|---|---|
| `MAX_BI_BITS` | 1.000.000 | `check_safety` existe, mas não é chamado |
| `MAX_METADATA_BYTES` | 16384 | **ausente** |
| `MAX_OPERANDS` | 100 (flattening hierárquico) | **ausente** (impacto de performance e DoS) |
| `MAX_RECURSION_DEPTH` | 500 | presente (`MAX_DEPTH`) |
| `MAX_HYDRATE_NODES` | 1000 | presente (`MAX_NODES`) |

O `MAX_OPERANDS = 100` com *hierarchical flattening* (mantém construção O(N) e profundidade O(log N) em acúmulos) é uma otimização de performance **do original** que a proposta ignora — e é justamente o tipo de coisa que o brainstorm valoriza. Deve ser portada.

### A7 — Bug de compilação: `Eq`/`Hash` com `serde_json::Value`

No doc 04:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Node {
    Literal { ..., metadata: Option<Metadata>, }
}
pub type Metadata = BTreeMap<String, serde_json::Value>;
```

`serde_json::Value` **não implementa `Eq` nem `Hash`** (por causa de `f64`). Logo `#[derive(Eq, Hash)]` em `Node` **não compila**. Opções:

- Remover `Eq`/`Hash` de `Node` (comparar via forma canônica quando necessário);
- Ou representar metadata como um tipo próprio com `Eq`/`Hash` (ex.: `enum MetaValue` restrito a strings/inteiros/arrays/objetos), o que também é mais seguro para a assinatura.

### A7b — `to_decimal_string` ignora o arredondamento

O método usa divisão inteira (truncamento) e ignora a `RoundingStrategy` — um dos pilares do produto (`NBR5891` etc.). A formatação decimal precisa delegar à estratégia configurada (ou deixar explícito que é uma conversão crua, separada de `apply_rounding`).

---

## 3. Conflitos com a Disciplina do Dia 0 (Doc 11)

O doc 11 estabelece lints duríssimos. Os demais documentos **violam-nos em quase todas as páginas**:

| Regra do doc 11 | Violação nos docs 03/04/05 |
|---|---|
| `unwrap_used = deny`, `expect_used = deny` | `Rational::new(...).expect(...)` em `Add/Sub/Mul/Div` |
| `panic = deny` | `panic!("division by zero")` em `Div` |
| `todo!`/`unimplemented!` = deny | `pow_fractional = todo!()`, `expand_scientific = todo!()` |
| `indexing_slicing = deny` | `&s[..split]`, `&s[split..]` em `to_decimal_string` |
| `arithmetic_side_effects = warn` | aritmética inteira em índices/tamanhos |
| `unsafe_code = deny` | SIMD `_mm512_*` e `_rdtsc` em `unsafe` (doc 12) |
| `disallowed-types` bane `HashMap` | cache proposto com `HashMap` (docs 02, 10) |

Correções estruturais:

1. **Operadores infalíveis**: `Add/Sub/Mul` não devem usar `Result`. Introduza `Rational::new_unchecked` (invariante garantido internamente, `debug_assert!`) e reserve `try_*` para entradas externas/`Div`. Isso também **acelera** (sem `Result` no caminho quente).
2. **`unsafe` confinado**: crie um módulo `simd`/`ticks` com `#![allow(unsafe_code)]` local e documentação de segurança; o resto do workspace permanece `deny`.
3. **Cache determinístico**: use `IndexMap`/`BTreeMap`, não `HashMap`. Adicione ao clippy.toml um allowlist para `IndexMap` se necessário.
4. **`todo!` é inaceitável em documento "oficial"**: substituir por implementação real ou por erro tipado.

---

## 4. Arquitetura e Estrutura (P1)

### B4 — Crate fachada ausente

O doc 11 declara `default-members = ["crates/calc-auy"]`, mas o doc 02 lista apenas 6 crates e **não define** `crates/calc-auy`. Para uma biblioteca oficial, o crate fachada é essencial (re-exporta `CalcAUY`, `Output`, tipos de erro, features). Definir no doc 02.

### C1 — Modelo de erro incompleto

O original usa RFC 7807 com `type`, `title`, `status`, `detail`, `instance` (URN UUID v7) e `context`. A proposta fala em `CalcAuyError` sem mapear esses campos. Para ser oficial:

```rust
#[derive(Debug, thiserror::Error)]
pub struct ProblemDetails {
    pub r#type: String,     // URL estável da wiki de erros
    pub title: String,
    pub status: u16,
    pub detail: String,
    pub instance: Uuid,     // ← precisa de estratégia determinística
    pub context: BTreeMap<String, serde_json::Value>,
}
```

O `instance` (UUID) torna a **saída não determinística**. Como erros não entram na assinatura, isso não quebra a integridade, mas quebra **testes determinísticos** e reprodutibilidade. Solução: injetar um `UuidSource`/`Clock` (ver C2) que em testes é determinístico (espelhando `BIRTH_TICKET_MOCK`).

### C2 — Port `Clock` / determinismo

O doc 11 já proíbe `SystemTime::now`/`Instant::now` via clippy, mas **nenhum doc define o port**. Necessário:

```rust
pub trait Clock: Send + Sync {
    fn now_rfc3339(&self) -> String;
    fn next_uuid_v7(&self) -> Uuid;
}
```

Com implementação real e uma `MockClock` para testes (timestamps determinísticos e assinaturas estáveis).

### C3 — Schema versionado

O original mantém `schema/` (JSON, CDDL, Proto, SQL, Prisma, GraphQL, Kysely, OpenAPI). Para o Rust oficial, o rastro de auditoria é um **formato forense** e precisa de:

- campo `version` (ex.: `"traceVersion": 1`);
- JSON Schema + CDDL versionados no repositório;
- política de evolução (campos aditivos, `#[serde(default)]`, proibição de remoção);
- os processadores (Proto/CBOR/MsgPack) **gerados** a partir do schema, não escritos à mão.

### C4 — i18n deve ser data-driven

O doc 02 propõe 9 módulos `.rs` hardcoded. Isso:

- impede extensão sem recompilar (o original permite estender locales);
- infla o binário e o tempo de compilação;
- duplica a lógica de plural/gênero por idioma.

Preferir: um `LocaleRegistry` carregando dados embutidos (`&'static str` gerados de JSON/FTL no build) com um trait `Locale` para regras gramaticais. Assim, adicionar idioma = adicionar dado, não código. Manter os 9 iniciais.

### C5 — Corpus de conformidade golden (crítico)

Não existe o artefato **mais importante** para uma migração oficial: um **corpus golden** gerado pelo TS contendo, para cada caso, `(input AST, config, salt) → (finalResult, signature, outputs em todos os locales)`. Sem isso, "compatibilidade total" é uma promessa, não um teste. Deve ser **Fase 0**, versionado no repositório, e usado por ambos os CI.

### C6 — Distribuição WASM

O produto é publicado no **JSR** e consumido por Deno/Node/browsers. Um substituto oficial em Rust precisa de um alvo **`wasm32-unknown-unknown` + wasm-bindgen** (ou `wasm-pack`) com a **mesma superfície de API JS** (incluindo `await` no `commit()`), para permitir migração sem reescrever consumidores. A proposta ignora isso por completo. Decidir: (a) publicar WASM no JSR; (b) publicar crate no crates.io; (c) ambos.

### C7 — Extensibilidade de processors

O TS tem `.toCustomOutput(processor)` com processors plugáveis. A API Rust do doc 02 não expõe o equivalente. Definir um trait:

```rust
pub trait Processor {
    type Output;
    fn process(&self, trace: &AuditTrace) -> Result<Self::Output, CalcAuyError>;
}
```

### C8 — Cache por instância

O cache de literais, se global, pode **vazar entre instâncias** (sais/contextos diferentes) — risco de correção e segurança. Deve ser por instância, ou removido (a proposta corretamente sugere que alocações Rust são baratas). Se mantido, a chave deve incluir o `InstanceId`. Documentar o ganho medido antes de manter complexidade.

---

## 5. Performance: Reconciliando o Norte com o Real

### D1 — O doc 12 está órfão

Ele contradiz o doc 03 e não é referenciado por mais ninguém. Deve ser **integrado** (via o Racional híbrido do §1) ou removido.

### D2 — Alocações no caminho quente

No `eval` (doc 04):

- Cada `EvalTask::Apply` aloca um `Vec` de operandos — desnecessário.
- `acc = acc + operand.clone()` clona `BigInt` a cada operando — no pior caso, O(k) alocações por operação.

Melhorias: usar slices da pilha de resultados, acumuladores in-place (`acc += &operand`), e uma arena de scratch reutilizável entre commits.

### D3 — SIMD: promessa exagerada

O brainstorm é explícito: LUT+SIMD só é excelente para **frações pequenas e em lote** (`u8`/`u16`). Para bignum (que a exatidão exige), SIMD praticamente não se aplica de forma limpa — a multiplicação `u128×u128` nem vetoriza bem. O doc 12 sugere ganhos sub-ns de forma genérica, o que é **impossível** para o caminho `Large`.

**Honestidade técnica necessária**: definam-se **orçamentos por camada**:

| Camada | Alvo realista |
|---|---|
| `Small` hot path (cabe em u64) | dezenas de ns por operação, GCD branchless |
| `Large` (bignum, audit trail) | microssegundos a ms; otimizar com Karatsuba/Toom do `num-bigint` |
| Assinatura/Canonicalização | caminho frio; 10–100 µs; **não** vale SIMD |
| Outputs/i18n | caminho frio; cache por `(locale, opções)` |
| Batch de frações pequenas | aí sim: LUT/SIMD fazem sentido |

### D4 — Benchmarks especulativos

O doc 10 apresenta números sem metodologia (nada foi medido), usa "Rust 1.75+" contradizendo "1.98"/edition 2024, e mistura `Instant` com promessas sub-ns — o brainstorm exige **RDTSC/cputicks**. Substituir por:

- baseline medido no TS (mesmo hardware/harness);
- medição Rust com `criterion` + `cputicks`;
- p50/p99.9 (cauda), não só média;
- comparação por cenário do corpus golden.

### D5 — Builder e partilha estrutural

O doc 02 mostra `pub fn add(&self, ...) -> Self`, o que, sem partilha estrutural, **clona a AST a cada passo** → O(N²). O TS usa objetos imutáveis com referências compartilhadas. Em Rust: `Arc<Node>` (persistent), ou builder consumível (`self -> Self`), ou uma arena por instância. Decidir e documentar o custo.

---

## 6. Usabilidade e API (P2)

### E1 — `Into<Rational>` e a armadilha do `f64`

Aceitar `impl Into<Rational>` com `f64` reintroduz o risco IEEE 754 que o produto existe para eliminar. **Proibir `f64`** na ingestão (clippy `disallowed-methods` ou trait selado). Aceitar apenas `i64`/`u64`/`i128`/`BigInt`/`&str`/`Rational`.

### E2 — Paridade de API

Faltam na API Rust: `to_scaled_bigint`, `to_raw_internal_number`, `to_slice_by_ratio`, `commit(options)` (override de `roundStrategy`), `checkIntegrity`, `cross-context` builders, e as **opções tipadas** de output (locale, currency, precision, separadores). A promessa "mesmos métodos" não é cumprida.

### E3 — Encoders

Garantir **padding idêntico** ao TS para `BASE32`/`BASE64`/`BASE58` (o doc 05 usa `base32` RFC4648 sem padding, mas o TS pode usar padding). Isso é compatibilidade de assinatura, não detalhe.

### E4 — Nomes e renames

Confirmar no TS que o wire usa as chaves do enum de rounding (`"NBR5891"`, não `"NBR-5891"`) e que `CEIL`/`NONE` são os identificadores corretos (o `AGENTS.md` lista `CEILING`/`FLOOR`, o que **contradiz** `constants.ts`; a fonte de verdade é `constants.ts`).

---

## 7. Estratégia e Conceitual (P1)

### O que significa "versão oficial"

Uma versão oficial de um formato **forense** não é um porte: é um **padrão**. Exige:

1. **Especificação formal** (semântica de cada operação, formato canônico, algoritmo de assinatura, política de overflow/erro).
2. **Corpus de conformidade** (golden vectors TS↔Rust).
3. **Schema versionado** e política de evolução.
4. **Conjunto de ADRs** para decisões irreversíveis (representação numérica, construtor de assinatura, formato do rastro).
5. **Garantias de determinismo documentadas** (sem tempo de sistema na assinatura, sem iteração de `HashMap` na saída).

### Reordenação do roadmap

O roadmap (doc 09) ignora a preparação do repositório (doc 11) e a performance (doc 12) e não tem fase de conformidade. Reordenar:

- **Fase 0 — Fundação**: workspace, lints, `diag`, `Clock`, corpus golden (gerado do TS), ADRs.
- **Fase 1 — Core**: Rational híbrido + AST (wire-compatible) + Engine + Rounding + Signature + limites.
- **Fase 1.5 — Conformidade**: signatário/avaliador Rust bate o corpus golden bit-a-bit.
- **Fase 2 — Builder + Cross-context** (cadeia de custódia).
- **Fase 3 — Output + i18n data-driven**.
- **Fase 4 — Parser** (differential fuzzing contra o TS).
- **Fase 5 — Processors** (gerados do schema).
- **Fase 6 — WASM/JSR + Benchmarks**. 

### Nota de licenciamento

Evitar crates LGPL para bignum (`rug`/GMP, `malachite`) para não criar atrito com a MPL-2.0 do produto. `num-bigint` (MIT/Apache) e `blake3` (CC0/Apache) são compatíveis. Registrar a análise de licenças.

---

## 8. O Que Está Bom (e deve ser preservado)

- **Arquitetura em camadas** com core enxuto: direção correta.
- **Type-state pattern** no builder: excelente para "estados inválidos impossíveis".
- **Instrumentação feature-gated** com catálogo de eventos e custo zero: padrão de engenharia maduro (doc 11).
- **Fingerprint determinístico** e redação de segredos: bem pensado.
- **Assinatura síncrona** (sem `async`): ganho grande e correto.
- **Percurso iterativo** no engine: evita stack overflow.
- **Preservação da licença MPL-2.0**.

---

## 9. Recomendações Priorizadas

### P0 — antes de escrever qualquer código de produção
1. Resolver a representação numérica com **ADR** (híbrido Small/Large).
2. Especificar o **wire format exato** (serde tags/renames + `AuditTrace`/`SignaturePayload`).
3. Implementar **JCS compatível com ECMAScript** + vetores golden.
4. Resolver **`pow`** (raiz exata ou erro tipado).
5. Implementar **verificação de `ControlNode`/`crossContextAdd`**.
6. Aplicar **todos os limites** (`check_safety`, 16KB metadata, `MAX_OPERANDS`).
7. Remover `Eq`/`Hash` de tipos que contêm `serde_json::Value`.

### P1 — antes do beta
8. Alinhar todos os docs aos lints do dia 0 (sem `unwrap`/`panic`/`todo`).
9. Definir crate fachada, port `Clock`, modelo RFC 7807, schema versionado.
10. Tornar i18n data-driven.
11. Montar o **corpus de conformidade** e o differential fuzzing.
12. Definir a estratégia WASM/JSR.

### P2 — antes do 1.0
13. Integrar/eliminar o doc 12; definir orçamentos de performance por camada.
14. Otimizar alocações do `eval` e partilha estrutural do builder.
15. Benchmarks medidos (criterion + cputicks, p50/p99.9).
16. Completar paridade de API e opções tipadas.

---

## 10. Checklist de Aceitação para a "Versão Oficial"

- [ ] ADR da representação numérica aprovada e testada (`hybrid == bigint`).
- [ ] Wire format idêntico ao TS (testes de round-trip byte-a-byte).
- [ ] JCS idêntico ao TS (vetores golden, incluindo floats/`-0`/expoentes/unicode).
- [ ] Assinatura idêntica ao TS para todo o corpus golden.
- [ ] Cross-contexto verifica assinatura prévia.
- [ ] Todos os limites de segurança aplicados e testados.
- [ ] `pow` com regra explícita de raiz exata/erro.
- [ ] Determinismo garantido (sem `HashMap`/tempo/UUID na saída assinada).
- [ ] RFC 7807 completo; `instance` determinístico sob `MockClock`.
- [ ] Schema versionado + processadores gerados.
- [ ] Corpus de conformidade no CI de ambos os lados.
- [ ] WASM publicável (se o alvo incluir o ecossistema JS).
- [ ] Benchmarks medidos, com metas por camada atendidas.
- [ ] Zero `unsafe` fora do módulo `simd`/`ticks`; lints do dia 0 verdes.

---

## Conclusão

A proposta é um bom **esqueleto**, mas confunde "porte" com "padrão oficial". O caminho para o Rust oficial passa por **resolver a contradição numérica**, **fixar o formato canônico e a assinatura com compatibilidade bit-a-bit**, **restaurar as garantias de segurança e custódia** que o tipo sugere mas a semântica não implementa, e **provar tudo com um corpus golden**. A performance extrema do brainstorm é real, mas pertence sobretudo ao **caminho quente de frações pequenas**; prometê-la para bignum e para a assinatura seria vender o que a exatidão não permite.
