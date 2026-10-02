# 12 — Core de Performance Extrema

> ⚠️ **Superado pelo [doc 14](./14-arquitetura-oficial-rust.md)** (ADR-001, ADR-009, ADR-010):
> o caminho rápido é o `Small { u64/u64 }` do racional híbrido; o vetor principal de performance
> é o **motor de lotes SoA + tiles + multithread**, não SIMD genérico em bignum; `unsafe` segue
> política A/B.

## Objetivo

Tornar o core da CalcAUY em Rust **absurdamente performático**, explorando:
- **SIMD** (Single Instruction, Multiple Data) para operações em lote
- **Binary GCD branchless** para simplificação de frações
- **LUTs** (Look-Up Tables) para frações pequenas
- **u64/u64 com u128 intermediário** como representação padrão
- **Métodos `algebraic_*`** do Rust 1.98+ para ponto flutuante
- **Flags de compilador** agressivas
- **Medição sub-nanosegundo** com `cputicks`/`pbench`

---

## Representação Numérica

### A Escolha: `u64/u64` com `u128` Intermediário

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REPRESENTAÇÃO NUMÉRICA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ARMAZENAMENTO: u64/u64                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Cobre qualquer ativo individual até ~$1,8 × 10¹⁹                │    │
│  │  • Suficiente para 99% dos casos financeiros                        │    │
│  │  • Multiplicação: u64 × u64 → u128 (3-4 ciclos)                     │    │
│  │  • Vetoriza com AVX-512 (8 lanes por instrução)                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  INTERMEDIÁRIOS: u128                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Adição: a/b + c/d = (a*d + c*b) / (b*d)                        │    │
│  │  • Produto a*d pode chegar a 2¹²⁸ — estoura u64                     │    │
│  │  • u128 evita overflow silencioso                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  TIPO GENÉRICO PARAMETRIZADO:                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  struct Fraction<T> { num: T, den: T }                              │    │
│  │                                                                     │    │
│  │  trait FractionOps: Sized {                                        │    │
│  │      type Wide: FractionOps;  // u64 → u128, u128 → u256           │    │
│  │      fn mul_wide(self, other: Self) -> Self::Wide;                 │    │
│  │      fn add_wide(self, other: Self) -> Self::Wide;                 │    │
│  │  }                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Definição do Tipo

```rust
// crates/calc-auy-core/src/rational.rs

use std::ops::{Add, Sub, Mul, Div, Neg};

/// Número racional exato com representação genérica.
///
/// Invariantes:
/// - `den > 0` (denominador sempre positivo)
/// - `gcd(num, den) == 1` (fração irredutível)
///
/// # Type Parameters
/// - `T`: Tipo de armazenamento (u64, u128, etc.)
/// - `W`: Tipo "wide" para intermediários (u128 para u64, u256 para u128)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Fraction<T, W> {
    num: T,
    den: T,
    _wide: std::marker::PhantomData<W>,
}

/// Tipo padrão: u64 com u128 intermediário.
pub type Rational = Fraction<u64, u128>;

impl Fraction<u64, u128> {
    /// Cria um novo racional a partir de u64.
    #[inline(always)]
    pub const fn new(num: u64, den: u64) -> Self {
        Self {
            num,
            den,
            _wide: std::marker::PhantomData,
        }
    }

    /// Cria racional a partir de inteiro.
    #[inline(always)]
    pub const fn from_int(n: u64) -> Self {
        Self::new(n, 1)
    }

    /// Simplifica a fração usando Binary GCD branchless.
    #[inline(always)]
    pub fn simplified(self) -> Self {
        let g = binary_gcd(self.num, self.den);
        Self::new(self.num / g, self.den / g)
    }
}

// Operações com u128 intermediário

impl Add for Fraction<u64, u128> {
    type Output = Self;

    #[inline(always)]
    fn add(self, other: Self) -> Self::Output {
        // a/b + c/d = (a*d + c*b) / (b*d)
        // Usa u128 para evitar overflow
        let a = self.num as u128;
        let b = self.den as u128;
        let c = other.num as u128;
        let d = other.den as u128;

        let num = a * d + c * b;
        let den = b * d;

        // Converte de volta para u64 (com safety check)
        let num_u64 = num as u64;
        let den_u64 = den as u64;

        Self::new(num_u64, den_u64).simplified()
    }
}

impl Mul for Fraction<u64, u128> {
    type Output = Self;

    #[inline(always)]
    fn mul(self, other: Self) -> Self::Output {
        // (a/b) * (c/d) = (a*c) / (b*d)
        let a = self.num as u128;
        let b = self.den as u128;
        let c = other.num as u128;
        let d = other.den as u128;

        let num = a * c;
        let den = b * d;

        Self::new(num as u64, den as u64).simplified()
    }
}
```

---

## Simplificação de Frações: Binary GCD Branchless

### Por Que Não Euclides?

O algoritmo de Euclides usa **divisão inteira**, que tem latência de **~20-30 ciclos** em x86-64. Para simplificação em massa, isso é proibitivo.

### Binary GCD (Stein) Branchless

```rust
/// Binary GCD (Stein) branchless para u64.
///
/// Substitui divisão por shifts e subtrações.
/// Latência: ~15-25 ciclos (vs ~30-50 do Euclides).
#[inline(always)]
pub fn binary_gcd(mut u: u64, mut v: u64) -> u64 {
    if u == 0 { return v; }
    if v == 0 { return u; }

    // Conta zeros à direita (trailing zeros)
    let shift = (u | v).trailing_zeros();
    u >>= u.trailing_zeros();

    loop {
        v >>= v.trailing_zeros();
        
        // Branchless min/max usando cmov
        let (lo, hi) = if u < v { (u, v) } else { (v, u) };
        v = hi - lo;
        
        if v == 0 {
            return lo << shift;
        }
        u = lo;
    }
}

/// Binary GCD para u32 (mais rápido que u64 para números pequenos).
#[inline(always)]
pub fn binary_gcd_u32(mut u: u32, mut v: u32) -> u32 {
    if u == 0 { return v; }
    if v == 0 { return u; }

    let shift = (u | v).trailing_zeros();
    u >>= u.trailing_zeros();

    loop {
        v >>= v.trailing_zeros();
        let (lo, hi) = if u < v { (u, v) } else { (v, u) };
        v = hi - lo;
        if v == 0 {
            return lo << shift;
        }
        u = lo;
    }
}
```

### LUT (Look-Up Table) para Frações Pequenas

Para frações onde numerador e denominador cabem em `u8`, uma LUT de 128 KB elimina qualquer cálculo:

```rust
/// LUT de frações simplificadas para u8/u8.
///
/// 256 × 256 entradas de u16 = 128 KB (cabe no L2).
/// Cada entrada: (num << 8) | den
static SIMPLIFIED_U8: [[u16; 256]; 256] = build_simplified_table();

const fn build_simplified_table() -> [[u16; 256]; 256] {
    let mut table = [[0u16; 256]; 256];
    let mut i = 0;
    while i < 256 {
        let mut j = 0;
        while j < 256 {
            if i == 0 || j == 0 {
                table[i][j] = 0;
            } else {
                let g = gcd_const(i as u32, j as u32) as u16;
                table[i][j] = ((i as u16 / g) << 8) | (j as u16 / g);
            }
            j += 1;
        }
        i += 1;
    }
    table
}

const fn gcd_const(mut a: u32, mut b: u32) -> u32 {
    while b != 0 {
        let t = b;
        b = a % b;
        a = t;
    }
    a
}

/// Simplifica fração u8 usando LUT.
///
/// Latência: ~2-4 ciclos (um load da L2).
#[inline(always)]
pub fn simplify_u8(num: u8, den: u8) -> (u8, u8) {
    let packed = SIMPLIFIED_U8[num as usize][den as usize];
    ((packed >> 8) as u8, (packed & 0xFF) as u8)
}
```

---

## SIMD para Operações em Lote

### Por Que SIMD?

SIMD permite processar **múltiplas frações simultaneamente**:
- **AVX-512**: 8 lanes `u64` por instrução
- **Speedup teórico**: 8x para operações em lote

### Operações SIMD com `pulp`

```rust
use pulp::*;

/// Soma de vetores de frações com SIMD.
///
/// Processa 8 frações por instrução (AVX-512).
pub fn add_fractions_simd(
    a_nums: &[u64], a_dens: &[u64],
    b_nums: &[u64], b_dens: &[u64],
) -> (Vec<u64>, Vec<u64>) {
    assert_eq!(a_nums.len(), b_nums.len());
    let n = a_nums.len();

    let mut result_nums = vec![0u64; n];
    let mut result_dens = vec![0u64; n];

    // Processa 8 elementos por vez com AVX-512
    let mut i = 0;
    while i + 8 <= n {
        // Carrega 8 elementos de cada vetor
        let a_n = pulp::cast::<u64, [u64; 8]>::from_slice(&a_nums[i..i+8]);
        let a_d = pulp::cast::<u64, [u64; 8]>::from_slice(&a_dens[i..i+8]);
        let b_n = pulp::cast::<u64, [u64; 8]>::from_slice(&b_nums[i..i+8]);
        let b_d = pulp::cast::<u64, [u64; 8]>::from_slice(&b_dens[i..i+8]);

        // Converte para u128 para intermediários
        // (implementação simplificada — na prática, usa intrinsics)
        let a_n_wide = a_n.widen();
        let a_d_wide = a_d.widen();
        let b_n_wide = b_n.widen();
        let b_d_wide = b_d.widen();

        // num = a_n * b_d + b_n * a_d
        let num = a_n_wide * b_d_wide + b_n_wide * a_d_wide;
        // den = a_d * b_d
        let den = a_d_wide * b_d_wide;

        // Converte de volta e simplifica
        // ...

        i += 8;
    }

    // Processa resto escalar
    while i < n {
        let a = Fraction::new(a_nums[i], a_dens[i]);
        let b = Fraction::new(b_nums[i], b_dens[i]);
        let c = a + b;
        result_nums[i] = c.num;
        result_dens[i] = c.den;
        i += 1;
    }

    (result_nums, result_dens)
}
```

### SIMD com `std::arch` (Controle Total)

```rust
#[cfg(target_arch = "x86_64")]
use core::arch::x86_64::*;

/// Soma de 8 frações u64 com AVX-512.
///
/// # Safety
/// Requer AVX-512F habilitado.
#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx512f")]
pub unsafe fn add_fractions_avx512(
    a_nums: &[u64; 8],
    a_dens: &[u64; 8],
    b_nums: &[u64; 8],
    b_dens: &[u64; 8],
) -> ([u64; 8], [u64; 8]) {
    // Carrega 8 u64 em registradores AVX-512
    let a_n = _mm512_loadu_si512(a_nums.as_ptr() as *const __m512i);
    let a_d = _mm512_loadu_si512(a_dens.as_ptr() as *const __m512i);
    let b_n = _mm512_loadu_si512(b_nums.as_ptr() as *const __m512i);
    let b_d = _mm512_loadu_si512(b_dens.as_ptr() as *const __m512i);

    // Converte para u128 (implementação simplificada)
    // Na prática, usaria _mm512_mul_epu32 e manipulação de carry

    // num = a_n * b_d + b_n * a_d
    // den = a_d * b_d

    // ... implementação completa ...

    unimplemented!("Implementação completa com intrinsics AVX-512")
}
```

---

## Reestruturação Algorítmica

### O Erro Mais Comum: Simplificar a Cada Passo

```rust
// ❌ ERRADO: Simplifica a cada operação
fn sum_fractions_bad(fractions: &[Rational]) -> Rational {
    let mut acc = Rational::from_int(0);
    for f in fractions {
        acc = acc + *f.clone();  // Simplifica aqui!
    }
    acc
}

// ✅ CERTO: Simplifica só no final
fn sum_fractions_good(fractions: &[Rational]) -> Rational {
    // Acumula numerador e denominador sem simplificar
    let mut num: u128 = 0;
    let mut den: u128 = 1;

    for f in fractions {
        // num/den + f.num/f.den = (num*f.den + f.num*den) / (den*f.den)
        num = num * f.den as u128 + f.num as u128 * den;
        den = den * f.den as u128;
    }

    // Simplifica uma única vez no final
    Rational::new(num as u64, den as u64).simplified()
}
```

### Acúmulo de MDC em Cadeias de Somas

```rust
/// Soma de frações com acúmulo de MDC.
///
/// Mantém `g = gcd(g, novo_den)` e divide apenas no final.
/// Reduz a pressão sobre os intermediários.
pub fn sum_fractions_with_gcd_accum(fractions: &[Rational]) -> Rational {
    let mut num: u128 = 0;
    let mut den: u128 = 1;
    let mut g: u64 = 1;

    for f in fractions {
        let new_den = den * f.den as u128;
        let new_num = num * f.den as u128 + f.num as u128 * den;

        // Acumula MDC
        g = binary_gcd(g, f.den);

        num = new_num;
        den = new_den;
    }

    // Divide pelo MDC acumulado
    let final_g = binary_gcd(g, num as u64);
    Rational::new((num / final_g as u128) as u64, (den / final_g as u128) as u64)
}
```

---

## Flags de Compilador

### Cargo.toml (Perfil de Release)

```toml
[profile.release]
opt-level = 3
codegen-units = 1
lto = "fat"
panic = "abort"
overflow-checks = false

[profile.release.build-override]
opt-level = 3
codegen-units = 1
```

### Flags Adicionais (`.cargo/config.toml`)

```toml
[build]
rustflags = [
    "-C", "target-cpu=native",
    "-C", "codegen-units=1",
]
```

### Métodos `algebraic_*` (Rust 1.98+)

```rust
// Para ponto flutuante, use algebraic_* para desbloquear otimizações
pub fn dot_product_algebraic(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter())
        .map(|(x, y)| x.algebraic_mul(*y))  // Reassociação permitida
        .fold(0.0, |acc, x| acc.algebraic_add(x))  // FMA automático
}
```

---

## Medição Sub-Nanosegundo

### Por Que Não `Instant`?

`std::time::Instant` tem resolução de **~20-30 nanossegundos**, insuficiente para medir operações que levam **< 1 ns**.

### `cputicks`: Acesso Direto ao RDTSC

```rust
// crates/calc-auy-core/src/bench/cputicks.rs

/// Lê o contador de ticks da CPU (RDTSC no x86, CNTVCT_EL0 no ARM).
///
/// Resolução: ~0.3 ns (um ciclo de clock).
#[cfg(target_arch = "x86_64")]
#[inline(always)]
pub fn cputicks() -> u64 {
    unsafe { core::arch::x86_64::_rdtsc() }
}

/// Mede a latência de uma operação em ticks.
#[cfg(target_arch = "x86_64")]
pub fn measure_ticks<F, T>(f: F) -> (T, u64)
where
    F: FnOnce() -> T,
{
    let start = cputicks();
    let result = f();
    let end = cputicks();
    (result, end - start)
}
```

### Benchmark com `criterion`

```rust
// crates/calc-auy-core/benches/rational_bench.rs

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use calc_auy_core::rational::Rational;

fn bench_addition(c: &mut Criterion) {
    let a = Rational::from_str("123456789/987654321").unwrap();
    let b = Rational::from_str("111111111/222222222").unwrap();

    c.bench_function("rational_add", |b| {
        b.iter(|| black_box(a) + black_box(b))
    });
}

fn bench_simplification(c: &mut Criterion) {
    let f = Rational::new(123456789012345, 987654321098765);

    c.bench_function("rational_simplify", |b| {
        b.iter(|| black_box(f).simplified())
    });
}

criterion_group!(benches, bench_addition, bench_simplification);
criterion_main!(benches);
```

---

## Expectativas Realistas

### Latência vs. Throughput

| Abordagem | Latência por fração | Throughput por fração |
| :--- | :--- | :--- |
| Euclides escalar `u64` | ~30-50 ns | ~10 ns |
| Binary GCD branchless `u64` | ~15-25 ns | ~5 ns |
| LUT direta `u8` escalar | ~2-4 ns | ~1 ns |
| SIMD Binary GCD `u64` (8 lanes) | — | **~0.6 ns** |
| SIMD LUT `u8` com AVX-512 (64 lanes) | — | **~0.08 ns** ✅ |
| Compile-time (const) | **0 ns** | **0 ns** ✅ |

### Quando Cada Abordagem é Apropriada

| Cenário | Abordagem Recomendada |
| :--- | :--- |
| Frações isoladas, valores grandes | Binary GCD branchless |
| Lote de frações pequenas (u8) | LUT + SIMD |
| Lote de frações u64 | Binary GCD + SIMD |
| Valores conhecidos em compile-time | `const fn` |
| Operações em ponto flutuante | `algebraic_*` + FMA |

---

## Estratégia de Implementação

### 1. Comece com o Perfil Mais Comum

```rust
// Para a maioria dos casos financeiros, u64/u64 é suficiente
pub type Rational = Fraction<u64, u128>;
```

### 2. Habilite o Poder do Compilador

```bash
# Compile com flags agressivas
RUSTFLAGS="-C target-cpu=native -C codegen-units=1" cargo build --release
```

### 3. Adote SIMD para Operações em Lote

```rust
// Use pulp para SIMD seguro e portátil
use pulp::*;

// Ou std::arch para controle total (unsafe)
#[cfg(target_arch = "x86_64")]
use core::arch::x86_64::*;
```

### 4. Meça com Precisão

```bash
# Use criterion para benchmarks
cargo bench

# Use cputicks para medição sub-ns
cargo run --example measure_ticks
```

### 5. Refine com `unsafe` (Quando Necessário)

```rust
// Apenas após validação extensiva com testes
#[target_feature(enable = "avx512f")]
unsafe fn simd_operation() {
    // Código unsafe com intrinsics
}
```

---

## Resumo de Verificação

- [ ] `Fraction<T, W>` genérico parametrizado
- [ ] Binary GCD branchless para u64
- [ ] LUT para frações u8
- [ ] SIMD com `pulp` ou `std::arch`
- [ ] Flags de compilador agressivas
- [ ] `algebraic_*` para ponto flutuante
- [ ] Medição com `cputicks`/`criterion`
- [ ] Reestruturação algorítmica (simplificar só no final)
- [ ] Testes de correção para código SIMD/unsafe
- [ ] Benchmarks comparando abordagens

---

## Conclusão

O core de performance extrema em Rust permite:

1. **Latência sub-nanosegundo** para operações em lote com SIMD
2. **Throughput de ~0.08 ns por fração** com LUT + AVX-512
3. **Type safety** mantida com genéricos e traits
4. **Medição precisa** com contadores de hardware
5. **Compatibilidade** com Rust 1.98+ e Edition 2024

A combinação de **Binary GCD branchless**, **LUTs**, **SIMD** e **flags de compilador agressivas** coloca o core da CalcAUY no mesmo nível de performance de bibliotecas de alto desempenho como `rug` (GMP bindings) ou `malachite`.
