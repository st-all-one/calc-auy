# Estudo A/B de algoritmos de GCD

Estudo que motivou a troca do GCD do núcleo (`crates/calc-auy-core/src/numeric/gcd.rs`).

Reproduza com:

```bash
env RUSTUP_TOOLCHAIN=stable cargo run --release -p calc-auy-core --example gcd_study
```

Saída bruta: `plan/evidence/gcd/study.txt`.

## Contexto de execução

O GCD é o custo dominante da redução de frações grandes. No núcleo, ele é
chamado por:

- `Rational::new_bigint_checked` (parse, `pow_int`, `from_decimal_strings`);
- `Rational::add` / `sub` (redução da soma);
- `Rational::mul` / `checked_div` (redução do produto).

Tamanhos típicos: as cargas de estresse chegam a ~6 kbit (`supernova_primorial`)
e ~900 bit (`primorial_sum_100`); o builder de raízes chega a ~1 Mbit, mas aí o
GCD não é exercitado.

O baseline era **Euclides clássico com `%` de precisão total** — apesar de o
cabeçalho do módulo prometer "Binary GCD". Medido, era ~8× mais lento que o
Stein binário e ~12× mais lento que o Lehmer nos tamanhos reais.

## Algoritmos comparados

| Algoritmo | Ideia | Complexidade |
|---|---|---|
| **Euclides** | `a mod b` de precisão total a cada passo | O(n²) ops. de palavra, constante alta |
| **Stein** | subtrações e shifts, sem divisão (`num-integer`) | O(n²) ops. de palavra, constante baixa |
| **Lehmer** | simula ~64 passos de Euclides com as palavras líderes (Knuth 4.5.2L) | O(n²/word) ops. de palavra |
| **Half-GCD** | Euclides como produto de matrizes em SL(2,ℤ), recursivo | O(M(n)·log n) (subquadrático) |

O Half-GCD é a abordagem **algébrica**: cada passo de Euclides é a matriz
`[[0,1],[1,-q]]`; a composição de ~n/2 passos é um produto de matrizes que pode
ser calculado por divisão-e-conquista (metade alta primeiro), usando a
multiplicação rápida do bignum.

## Resultados (µs/op, AMD Ryzen 5 5500U, Rust 1.98.1)

| bits | Euclides | Stein | Lehmer | Half-GCD | vencedor |
|---:|---:|---:|---:|---:|---|
| 256 | 36,5 | **8,1** | 9,6 | 60,0 | Stein |
| 1024 | 97,1 | **16,5** | 23,1 | 134,0 | Stein |
| 2048 | 225,8 | **38,6** | 52,8 | 281,9 | Stein |
| 4096 | 628,0 | **103,9** | 119,9 | 601,1 | Stein |
| 6144 | 1162,1 | 201,8 | **197,7** | 968,5 | Lehmer |
| 8192 | 1850,9 | 333,0 | **281,5** | 1266,9 | Lehmer |
| 16384 | 15413,5 | 1208,4 | **805,7** | 2795,0 | Lehmer |
| 32768 | 72884,3 | 4729,2 | **2245,7** | 6215,1 | Lehmer |
| 65536 | 315869,7 | 18311,1 | **6917,0** | 14910,9 | Lehmer |

Crossover em tamanhos muito grandes (só Lehmer × Half-GCD):

| bits | Lehmer | Half-GCD | vencedor |
|---:|---:|---:|---|
| 131 072 | **23 773** | 35 846 | Lehmer (1,5×) |
| 262 144 | 113 741 | **93 043** | Half-GCD (1,2×) |
| 524 288 | 472 344 | **246 432** | Half-GCD (1,9×) |
| 1 048 576 | 1 903 471 | **652 258** | Half-GCD (2,9×) |

## Conclusões

1. **Euclides é o pior** em todos os tamanhos. Trocar por Stein já dá ~8× nos
   tamanhos reais.
2. **Stein** vence até ~4 kbit (constantes menores, sem overhead de coeficientes).
3. **Lehmer** vence de ~4 kbit a ~200 kbit: melhor caso para o projeto.
4. **Half-GCD** só vence acima de **~200 kbit** (crossover medido entre 131 kbit
   e 262 kbit). A vantagem subquadrática só compensa quando a multiplicação é
   rápida o bastante; com a multiplicação Karatsuba/Toom do `num-bigint`, o
   ganho máximo é ~2,9× a 1 Mbit. Com uma multiplicação FFT (GMP/`rug`), o
   crossover desceria bastante.
5. Os coeficientes do Half-GCD crescem exponencialmente com a profundidade se o
   caso-base reduzir até o GCD completo — o caso-base **precisa** parar na
   metade (`half_matrix`). Esse foi o bug mais sutil do estudo.

## Estratégia adotada (o "limite" para este projeto)

Dispatchers medidos em `gcd_bigint`:

```
bits < 4 096        → Stein  (num-integer)
bits < 200 000      → Lehmer (palavras líderes)
bits >= 200 000     → Half-GCD (matrizes SL(2,ℤ))
```

Isso é ótimo em todo o intervalo de interesse: as cargas reais do projeto
(≤ 6 kbit) usam Lehmer; o Half-GCD cobre o caso de 1 Mbit.

## Além do GCD: reduzir as chamadas

O maior ganho não veio de acelerar o GCD, mas de **chamá-lo menos e em operandos
menores**:

| Otimização | Efeito |
|---|---|
| `pow_int` não reduz (base já é irredutível ⇒ `num^e`, `den^e` são coprimos) | elimina o GCD do `pow` |
| `add` "gcd-least" (`gcd(b,d)` pequeno, não `gcd(num, b·d)` grande) | substitui um GCD de 2n bits por um de n bits; com denominadores coprimos, **zero** GCD |
| `mul` com redução cruzada (`gcd(a,d)`, `gcd(c,b)`) | produto já sai irredutível; dois GCDs de n bits em vez de um de 2n |

Impacto end-to-end nos workloads de estresse:

| Workload | Antes | Depois | Ganho |
|---|---:|---:|---:|
| `stress/supernova_primorial` | 2 049 µs | 175 µs | **11,7×** |
| `stress/primorial_sum_100` | 2 917 µs | 395 µs | **7,4×** |

`primorial_sum_100` passou de derrota (TS 1,9× mais rápido) a vitória Rust
**3,9×**.
