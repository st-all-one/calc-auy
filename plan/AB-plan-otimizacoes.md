# Plano A/B de otimização — matemática de ponta, probabilidade e engenharia de algoritmos

> Estado: **proposta**. Nenhum item abaixo foi implementado ainda (exceto onde
> marcado como *feito*). Cada ideia é formulada como um experimento A/B com
> hipótese falsificável, métrica e critério de decisão.

## 0. Método (como faremos A/B)

O harness atual (`bench/run.sh`, `bench/ts/compare.ts`, `bench/report.py`) serve
para comparação Rust × TS, mas **não** é adequado para A/B interno por causa da
variância observada (o mesmo binário variou 2× entre execuções sob carga —
`plan/evidence/ab/hotspots.txt`).

Protocolo proposto:

1. **Isolamento**: `taskset -c 2-3`, `nice -n -5`, turbo desligado se possível;
   uma carga por vez.
2. **Pareamento e intercalação**: rodar A e B **intercalados** (A,B,A,B,…) no
   mesmo processo/binário quando possível, para cancelar deriva térmica.
3. **Repetições**: ≥ 7 execuções por variante por workload; reportar **mediana**
   e **IC 95% por bootstrap** (10 000 reamostragens), nunca a média bruta.
4. **Significância**: teste de **Wilcoxon pareado** por workload; efeito
   reportado como razão de medianas com IC. Só aceitar B se o IC excluir 1,0.
5. **Perfil primeiro**: `perf record` (CPU), `dhat`/`heaptrack` (alocações) e
   contadores de instruções/cache antes de otimizar. A regra que emergiu deste
   estudo: **o gargalo quase nunca é onde se imagina** (o custo de
   `mult_avalanche_900k` não é aritmética, é conversão decimal — ver §1).
6. **Guarda de não-regressão**: o A/B de cada item roda **todo** o conjunto de
   62 workloads, não só o alvo; qualquer regressão > 5% em workload não-alvo
   bloqueia o item.

Artefatos: `bench/ab.sh` (orquestra A/B por feature-flag ou por commit),
`plan/evidence/ab/<id>/` (JSON bruto + tabela).

## 1. Evidência medida (por que este plano)

Top workloads por **tempo absoluto** (µs/op, `bench/results/rust.json`):

| # | Workload | µs/op | Natureza do custo (medido) |
|---|---|---:|---|
| 1 | `output/toCustomOutput_100k` | 88 087 | 3 `String` clonadas/call (`OutputContext` owned) |
| 2 | `output/toSlice_100k` | 77 858 | ~500 k ops `Rational` no rateio |
| 3 | `stress/hydra_50x3` | 71 775 | build + eval de 127 k nós + serialização canônica |
| 4 | `stress/mult_avalanche_900k` | 35 962 | **conversão decimal** de `2^900000` (34 ms!) |
| 5 | `perf/batch_5000_mult` | 11 340 | 5 000 × (eval + canonical + assinatura) |
| 6 | `security/metadata_10000_emoji` | 10 845 | 10 k inserts em `BTreeMap` + 1 MB canônico |
| 7 | `perf/depth_10000` | 7 501 | 10 k adições + canonical |
| 8 | `security/metadata_5000` | 2 850 | idem, metade |
| 9 | `perf/batch_1000_tax` | 2 289 | idem #5 |
| 10 | `output/toMonetary_burst_5_locales` | 517 | render 5 locales |

Medições de primitivas (`plan/evidence/ab/hotspots.txt`):

| Primitiva | Tempo |
|---|---:|
| `2^900000` → decimal (`num-bigint`) | **34–57 ms** |
| `2^900000` → hex | **0,28–0,46 ms** (**~125×** mais rápido) |
| `2^900000.bits()` | 0,002 µs |
| `2^225000` → decimal | 4,3–7,1 ms |
| `2^225000` (pow) | 8,6–14,3 µs |
| `2^225000` (shift `1<<k`) | 0,6–0,9 µs (**~15×**) |
| 225 kbit × 225 kbit | 8–18 µs |
| `write_canonical` de 1 literal (reuso vs alocar) | 0,08 µs vs 0,20 µs (**2,5×**) |
| soma de 125 k racionais (fold esquerdo) | 12,8–21,3 ms |

**Conclusão central:** o tempo absoluto é dominado por **serialização**
(decimal O(n²) e canônico por-nó) e por **loops de operações `Rational`**, não
pela aritmética de precisão arbitrária em si. Isso reposiciona o plano: o maior
retorno não está em multiplicação/FFT, e sim em **codificação, alocação e
estruturas**.

## 2. Objetivos

- **O-A (tempo absoluto):** reduzir o tempo de parede dos ~10 workloads pesados.
- **O-B (paridade):** fechar as 3 derrotas restantes: `supernova_primorial`
  (0,51×), `toSliceByRatio_4` (0,57×), `toSlice_100k` (0,87×).
- **O-C (não-regressão):** manter 59/62 e o geométrico ≥ 6,9×.

## 3. Catálogo de ideias (A/B)

Legenda: **Impacto** (esperado, por workload), **Esforço** (P/M/G), **Risco**.

### Onda 1 — Ganhos grandes, baixo risco (atacar O-A e O-B já)

> **Status:** implementada (AB-03, AB-04, AB-05, AB-06, AB-07, AB-08).
> AB-01 e AB-02 foram **adiadas** — ver §7.

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-01** | **Codificação canônica de inteiros subquadrática** (base 2^32/hex em vez de decimal, ou decimal D&C) | `Rational::write_canonical` usa `to_string()` decimal O(n²); hex é O(n) (~125×) | variante B emite `n`/`d` em hex; medir `mult_avalanche`, `power_tower`, `roots_nested_huge`, `sign_*` | 34 ms → ~0,5 ms no pior caso | M | Spec de assinatura muda (bump `TraceVersion` V2) |
| **AB-02** | **Conversão decimal D&C** (dividir por `10^k`, recursão, com recíproco de Barrett) | reduz o expoente efetivo de O(n²)→~O(M(n)log n); mantém decimal | comparar `to_str_radix(10)` vs implementação D&C nos tamanhos 4 k–1 Mbit | 3–10× na conversão decimal | G | Correção de padding/zeros à esquerda |
| **AB-03** | **`toSlice` com aritmética inteira** | extrair denominador comum dos pesos e fazer `divmod` de `BigInt`; elimina ~500 k ops `Rational` | `to_slice(100_000)` atual vs versão inteira | 78 ms → ~3 ms (**~25×**) | P | Arredondamento do maior resto (testes de propriedade) |
| **AB-04** | **`OutputContext` zero-copy** (`&str`/`Cow`) | hoje clona latex+unicode+verbal por chamada | `to_custom_output` com `String` vs `&str` | 88 ms → ~15 ms (**~6×**) | P | Assinatura pública do trait (breaking, pré-1.0) |
| **AB-05** | **Reuso de buffer em `compute_subtree_hashes`** | `Vec::new()` por literal; reusar 1 buffer | hashing de AST de 100 k literais | ~2,5× no hashing | P | trivial |
| **AB-06** | **Avaliação DAG-aware (memo por `NodeId`)** | `eval` re-avalia subexpressões repetidas (`mult_avalanche` computa `2^225000` 4×) | `eval` vs `eval` com `Vec<Option<Rational>>` por nó | 4× menos pows; geral para DAGs | P/M | Memória; nós de uso único pagam overhead |
| **AB-07** | **`fold_add`/`prod_tree` com run-length** | `hydra` soma 50 operandos iguais; detectar repetição → `k·x` | detecção de iguais vs soma em árvore | ~2× no eval do `hydra` | P | Heurística de detecção |
| **AB-08** | **Fast path potência de 2** | base potência de 2 ⇒ shift; produto de potências de 2 ⇒ soma de expoentes | `pow`/`mul` com detecção vs atual | ~15× no `pow`, evita materialização em cadeias | P | Detecção O(n/word); semântica exata preservada |

### Onda 2 — Probabilidade / estatística

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-09** | **Filtro probabilístico de potência perfeita** | antes de `exact_nth_root`, testar `n mod p` como resíduo k-ésimo para primos pequenos (3,5,7,11,…); se falha, rejeita sem iterar | `roots_nested_huge`/raízes irracionais: atual vs filtro | 10–100× no caso "não é potência" | P | *Sound*: só rejeita; sem falso positivo |
| **AB-10** | **Pré-checagem modular de coprimalidade** | `gcd(a mod M, b mod M)` (M = produto de primos) = 1 ⇒ provavelmente coprimos ⇒ pular GCD grande; se ≠ 1, cai no GCD exato | `add`/`mul` de frações grandes com denominadores coprimos | evita GCDs em `primorial`/`supernova` | P | Precisa fallback exato (sound) |
| **AB-11** | **Hash rápido (não-cripto) no `EvalCache`** | BLAKE3 por nó é caro; memoização interna só precisa de baixa colisão | `eval_memoized` BLAKE3 vs xxh3/ahash determinístico (seed fixo) | 5–10× no hashing de memoização | P | Colisão (usar 128 bits + verificação opcional); determinismo |
| **AB-12** | **Política de cache adaptativa (W-TinyLFU)** | hot cache e `EvalCache` usam FIFO/clear total; frequência melhora hit rate | traço de acessos reais; comparar hit rate e tempo | melhor hit rate sob cargas mistas | M | Complexidade; determinismo do contador |
| **AB-13** | **Auto-tuning estatístico de limiares** | limiares Stein/Lehmer/HGCD e `PARALLEL_THRESHOLD` variam com a máquina; calibrar no startup por amostragem | limiares fixos vs calibrados | marginal (5–15%) | M | Custo de calibração; determinismo |
| **AB-14** | **Amostragem para pré-alocação** | estimar tamanho de saída por amostra de bits para `String::with_capacity` | com/sem reserva | reduz realocações em render | P | trivial |

### Onda 3 — Backend bignum e matemática fina

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-15** | **Comparar backend bignum** (`num-bigint` × `malachite` × `ibig`) | multiplicação/divisão/conversão de base melhores | micro-harness nos tamanhos 4 k–1 Mbit (mul, div, gcd, decimal, hex) | 2–10× em números grandes | M | `malachite`/`ibig` puros (WASM ok); `rug`/GMP **excluído** (LGPL + não-WASM) |
| **AB-16** | **Divisão subquadrática (Newton/Barrett)** sobre `num-bigint` | habilita D&C decimal e acelera HGCD | divisão atual vs Newton | 3–10× em divisões grandes | G | Estabilidade numérica inteira; testes extensos |
| **AB-17** | **Multiplicação NTT (inteira)** para > 1 Mbit | Karatsuba/Toom estagnam; NTT é O(n log n) e exata | `num-bigint` vs NTT em ≥ 1 Mbit | grande só ≥ 1 Mbit | G | Complexidade; provavelmente fora do escopo atual |
| **AB-18** | **Redução racional via HGCD** (encadear `hgcd` no `new_bigint_checked`) | reduzir numerador/denominador de 2n bits com matriz | atual vs HGCD-based | ~1,5–2× em reduções grandes | M | já temos HGCD pronto |
| **AB-19** | **Limites logarítmicos precisos** | `check_mul_budget` usa soma de bits (falso positivo); usar topo de 64 bits + `log2` | cargas de overflow válidas | evita rejeições legítimas (não é tempo, é correção de DoS) | P | — |

### Onda 4 — Paralelismo e sistemas

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-20** | **Ligar `parallel` e medir** | `rayon` já existe em lotes e reduções | single vs multi-thread em `batch_*`, `hydra`, `depth_10000` | até N núcleos em cargas grandes | P | Overhead em cargas pequenas; determinismo já garantido |
| **AB-21** | **BLAKE3 paralelo** em traços grandes | `blake3` tem feature `rayon` | `metadata_*`, `sign_chain_450` | 2–4× | P | — |
| **AB-22** | **Hot cache sharded/lock-free** | `Mutex` único contende em multithread | `Mutex` vs shards vs `RwLock` | remove contenção | M | Complexidade |
| **AB-23** | **PGO + LTO fat + `codegen-units=1`** | ganho global de layout/inlining | build atual vs PGO | 5–20% global | P | Reproducibilidade do build |
| **AB-24** | **`target-cpu=native`** | usa AVX2/AVX-512 | baseline vs native | 5–15% | P | Portabilidade (só em build local) |
| **AB-25** | **Alocador `mimalloc`/`jemalloc`** | cargas alocação-intensivas | system vs mimalloc | 5–15% | P | Dependência; WASM não usa |
| **AB-26** | **Arena `bumpalo` para temporários** | BigInt aloca muito | contagem de alloc (dhat) antes/depois | 10–30% no eval | M | Complexidade de lifetime |
| **AB-27** | **SIMD no lexer/escape** (`memchr`, `simdutf8`) | lexing e escaping byte-a-byte | `lex_chain_100`, JSON | 1,5–3× no parser | P | — |

### Onda 5 — Estruturas e representação

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-28** | **Avaliador compilado (closures/bytecode)** | elimina o interpretador de pilha (`stack`/`values`/`Action`) | eval atual vs bytecode | 2–5× em árvores grandes | G | Complexidade; limites/erros |
| **AB-29** | **CSE / hash-consing no builder** | dedup de subexpressões idênticas | AST size e eval | menos nós e menos eval | M | Semântica de metadados por nó |
| **AB-30** | **AST SoA cache-friendly** | `FlatAst` + `batch/soa.rs` já existe | AoS vs SoA no eval | 1,2–2× | M | Refatoração ampla |
| **AB-31** | **Cobrança incremental da assinatura** | hashear o AST enquanto é construído | commit atual vs incremental | evita re-serializar no commit | M | Só se a assinatura for obrigatória |

### Onda 6 — Matemática simbólica (exploratória, alto risco)

| ID | Ideia | Hipótese / mecanismo | A/B | Impacto | Esf. | Risco |
|---|---|---|---|---|---|---|
| **AB-32** | **Representação simbólica de potências** | guardar `(base, exp)` em vez de materializar `2^900000` | power towers | enorme | GG | Quebra o invariante "racional exato"; ADR |
| **AB-33** | **Hensel lifting para raiz n-ésima** | testar/liftar potências perfeitas módulo p^k | vs `nth_root` | alternativa ao AB-09 | G | Complexidade |
| **AB-34** | **Frações contínuas para rateio/arredondamento** | evitar `Rational` em `toSlice`/rounding | vs inteiro (AB-03) | similar ao AB-03 | M | — |

## 4. Roadmap priorizado

Ordenado por (impacto × confiança) / esforço. Cada linha vira um PR com A/B.

| Prioridade | ID | Título | Alvo | Ganho esperado |
|---:|---|---|---|---|
| 1 | AB-03 | `toSlice` inteiro | O-B (`toSlice_100k`) | ~25× |
| 2 | AB-04 | `OutputContext` zero-copy | O-A (#1) | ~6× |
| 3 | AB-01 | Canônico subquadrático | O-A (#4), assinatura | ~70× no pior caso |
| 4 | AB-05 | Buffer reusado no hashing | O-A (#3) | ~2,5× no hashing |
| 5 | AB-06 | Eval DAG-aware | O-A (#4), geral | 4× em subexpressões repetidas |
| 6 | AB-09 | Filtro de potência perfeita | O-A (`roots_*`) | 10–100× |
| 7 | AB-10 | Coprimalidade modular | O-B (`supernova`) | evita GCDs |
| 8 | AB-20 | Ligar paralelismo | O-A (batch/hydra) | até N× |
| 9 | AB-23/24/25 | PGO/LTO/native/alloc | O-C global | 10–30% global |
| 10 | AB-11 | Hash rápido no EvalCache | memoização | 5–10× |
| 11 | AB-15 | Backend bignum | O-A (números grandes) | 2–10× |
| 12 | AB-07/08 | RLE + potência de 2 | O-A | 2–15× pontual |
| 13 | AB-12/13 | Cache/limiares adaptativos | robustez | 5–15% |
| 14 | AB-02/16 | Decimal D&C / divisão Newton | O-A | 3–10× |
| 15 | AB-28/29/30 | Compilador/CSE/SoA | O-A | 2–5× |
| 16 | AB-32/17/33 | Simbólico/NTT/Hensel | exploratório | enorme, incerto |

## 5. Critérios de decisão e riscos

- **Aceitar** um item só se: (a) IC 95% da razão de medianas exclui 1,0; (b)
  nenhuma regressão > 5% em workload não-alvo; (c) testes de propriedade
  passam (aritmética exata); (d) clippy/fmt/doc limpos.
- **AB-01** e **AB-04** alteram contratos públicos/spec de assinatura: exigem
  ADR e bump de `TraceVersion`/semver.
- **AB-32** viola o invariante de "racional exato" — só com ADR explícito; é o
  único item que pode quebrar o modelo de integridade.
- **Backend bignum** (AB-15): `rug` está fora (LGPL + WASM). Avaliar
  `malachite`/`ibig` com atenção ao determinismo de serialização.
- **Estatística**: todo resultado deve ser reprodutível (`bench/ab.sh` grava
  JSON bruto + seed); nada de "média de uma execução".

## 6. Próximo passo imediato

Rodar as três primeiras A/B da Onda 1 (AB-03, AB-04, AB-05) — são baratas, não
tocam spec e atacam diretamente os workloads #1, #2 e #3 por tempo absoluto.
Em seguida AB-01 (maior ganho, exige ADR) e AB-06/AB-09.

## 7. Resultado da Onda 1 (implementada)

Todas as medições com o harness Rust × TS (`bench/`); evidência em
`plan/evidence/bench/compare.md`.

| ID | Status | Efeito medido |
|---|---|---|
| **AB-03** | ✅ feito | `toSlice_100k` **77 858 → 5 530 µs** (**14×**); `toSlice_3` 1,72 → 0,66 µs |
| **AB-04** | ✅ feito | `toCustomOutput_100k` **88 087 → 7 320 µs** (**12×**); contexto preguiçoso (`&str` + verbal sob demanda) |
| **AB-05** | ✅ feito | buffer único no `compute_subtree_hashes` (1 alocação por literal a menos) |
| **AB-06** | ✅ feito | memoização DAG por `NodeId` em `eval`; nós compartilhados calculados 1× |
| **AB-07** | ✅ feito | `sum_tree`/`prod_tree` colapsam operandos iguais (`k·x`, `x^k`) |
| **AB-08** | ✅ feito | `pow` de potência de 2 via shift (~15× no `pow`) |
| **AB-01** | ⏸ adiado | codificação canônica subquadrática exige ADR + versionamento de assinatura |
| **AB-02** | ⛔ bloqueado | D&C decimal com divisão schoolbook do `num-bigint` é **pior** (~n² vs n²/19); depende de AB-16 |

**Impacto agregado:** speedup geométrico global **6,93× → 7,81×**; vitórias
Rust **59 → 60** de 62; categoria `output` **7,4× → 10,1×**.

Itens que ficaram abaixo do estimado: `hydra_50x3` (~7% em vez de 2×) porque o
gargalo não é o *eval* e sim a **construção da AST** (127 k nós, cada um com
`Arc<Metadata>` + `Box<str>` de entrada original) e a serialização canônica —
alvo das ondas 5 (AB-28/29/30) e do AB-01.

Otimização extra não prevista no plano: `format_fixed` passou a montar a string
diretamente (1 alocação em vez de 3), o que levou `toSlice_100k` de 26 ms para
5,5 ms.

## 8. Próximo passo imediato

1. **AB-09** (filtro probabilístico de potência perfeita) e **AB-10**
   (coprimalidade modular) — baratos, atacam `roots_*` e `supernova`.
2. **AB-20** (ligar `parallel`) e **AB-23/24/25** (PGO/LTO/alloc) — ganho global.
3. **AB-01** com ADR de versionamento de assinatura (maior ganho absoluto).

Artefatos de apoio já no repositório:

- `plan/evidence/ab/hotspots.txt` — medições que fundamentam o plano.
- `crates/calc-auy-core/examples/hotspot_study.rs` — sonda reproduzível.
- `crates/calc-auy-core/examples/gcd_study.rs` — A/B de GCD.
- `bench/` — harness Rust × TS e relatório.
