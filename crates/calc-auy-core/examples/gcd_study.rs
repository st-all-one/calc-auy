//! Estudo A/B/C/D de algoritmos de GCD (reproduzível).
//!
//! Roda com:
//!
//! ```bash
//! env RUSTUP_TOOLCHAIN=stable cargo run --release -p calc-auy-core --example gcd_study
//! ```
//!
//! Compara quatro algoritmos em vários tamanhos de operandos, incluindo os
//! tamanhos reais do workload `stress/supernova_primorial` (~6 kbit) e o
//! crossover em ~1 Mbit:
//!
//! - `euclid`: Euclides clássico com `%` de precisão total (baseline antigo).
//! - `stein`:  Stein binário (`num-integer`).
//! - `lehmer`: Lehmer com palavras líderes (Knuth 4.5.2L).
//! - `hgcd`:   Half-GCD algébrico (produto de matrizes SL(2,ℤ), recursivo).

use std::time::Instant;

use num_bigint::{BigInt, Sign};
use num_integer::Integer;
use num_traits::{One, Signed, ToPrimitive, Zero};

// ─────────────────────────────── Euclides ───────────────────────────────

/// Baseline: Euclides clássico com `%` de precisão total.
fn gcd_euclid(a: &BigInt, b: &BigInt) -> BigInt {
    let mut cur = a.clone();
    let mut div = b.clone();
    while !div.is_zero() {
        let remainder = &cur % &div;
        cur.clone_from(&div);
        div = remainder;
    }
    cur.abs()
}

/// Stein binário do `num-integer`.
fn gcd_stein(a: &BigInt, b: &BigInt) -> BigInt {
    a.gcd(b)
}

// ─────────────────────────────── Lehmer ────────────────────────────────

/// GCD de palavra (u64) para o passo final.
fn gcd_word(mut x: u64, mut y: u64) -> u64 {
    if x == 0 {
        return y;
    }
    if y == 0 {
        return x;
    }
    let shift = (x | y).trailing_zeros();
    x >>= x.trailing_zeros();
    loop {
        y >>= y.trailing_zeros();
        if x > y {
            core::mem::swap(&mut x, &mut y);
        }
        y -= x;
        if y == 0 {
            break;
        }
    }
    x << shift
}

/// Lehmer's GCD (Knuth, TAOCP 4.5.2, Algorithm L).
fn gcd_lehmer(a: &BigInt, b: &BigInt) -> BigInt {
    let mut big = a.abs();
    let mut small = b.abs();
    if big < small {
        core::mem::swap(&mut big, &mut small);
    }
    loop {
        if small.is_zero() {
            return big;
        }
        if small.bits() <= 64 {
            let word = small.to_u64().unwrap_or(0);
            if word == 0 {
                return big;
            }
            let reduced = (&big % BigInt::from(word)).to_u64().unwrap_or(0);
            return BigInt::from(gcd_word(reduced, word));
        }
        let shift = big.bits() - 64;
        let x = (big.clone() >> shift).to_u64().unwrap_or(0) as i128;
        let y = (small.clone() >> shift).to_u64().unwrap_or(0) as i128;
        let (mut aa, mut bb, mut cc, mut dd) = (1_i128, 0_i128, 0_i128, 1_i128);
        let (mut xx, mut yy) = (x, y);
        loop {
            if yy + cc == 0 || yy + dd == 0 {
                break;
            }
            let q = (xx + aa) / (yy + cc);
            if q != (xx + bb) / (yy + dd) {
                break;
            }
            let t = aa - q * cc;
            aa = cc;
            cc = t;
            let t = bb - q * dd;
            bb = dd;
            dd = t;
            let t = xx - q * yy;
            xx = yy;
            yy = t;
        }
        if bb == 0 {
            let remainder = &big % &small;
            big.clone_from(&small);
            small = remainder;
        } else {
            let next_big = aa * &big + bb * &small;
            let next_small = cc * &big + dd * &small;
            big = next_big.abs();
            small = next_small.abs();
        }
    }
}

// ─────────────────────────────── Half-GCD ──────────────────────────────

/// Matriz 2×2 em SL(2,ℤ): aplica `(x, y) ↦ (a·x + b·y, c·x + d·y)`.
#[derive(Clone)]
struct Mat {
    a: BigInt,
    b: BigInt,
    c: BigInt,
    d: BigInt,
}

impl Mat {
    fn identity() -> Self {
        Self {
            a: BigInt::one(),
            b: BigInt::zero(),
            c: BigInt::zero(),
            d: BigInt::one(),
        }
    }

    fn mul(&self, other: &Self) -> Self {
        Self {
            a: &self.a * &other.a + &self.b * &other.c,
            b: &self.a * &other.b + &self.b * &other.d,
            c: &self.c * &other.a + &self.d * &other.c,
            d: &self.c * &other.b + &self.d * &other.d,
        }
    }

    fn apply(&self, x: &BigInt, y: &BigInt) -> (BigInt, BigInt) {
        (&self.a * x + &self.b * y, &self.c * x + &self.d * y)
    }
}

/// Bits abaixo dos quais o half-GCD resolve diretamente com Euclides.
const HGCD_BASE_BITS: u64 = 64;

/// Matriz que reduz `(a, b)` até `b` ficar abaixo de `a/2` (caso-base).
///
/// É crucial parar na metade: reduzir até o GCD completo dobraria o tamanho
/// dos coeficientes a cada nível da recursão.
fn half_matrix(a: &BigInt, b: &BigInt) -> Mat {
    let target = a.bits() / 2;
    let mut matrix = Mat::identity();
    let mut x = a.clone();
    let mut y = b.clone();
    while !y.is_zero() && y.bits() > target {
        let quotient = &x / &y;
        let remainder = &x - &quotient * &y;
        let step = Mat {
            a: BigInt::zero(),
            b: BigInt::one(),
            c: BigInt::one(),
            d: -quotient,
        };
        matrix = step.mul(&matrix);
        x = y;
        y = remainder;
    }
    matrix
}

/// Half-GCD: matriz que reduz `(a, b)` a aproximadamente metade do tamanho.
///
/// Requer `a >= b >= 0`. Recursão divide `a` em metade alta e baixa e resolve
/// a metade alta primeiro (divisão-e-conquista), usando multiplicação rápida
/// nas combinações de matrizes.
fn hgcd(a: &BigInt, b: &BigInt) -> Mat {
    if b.is_zero() || a <= b {
        return Mat::identity();
    }
    let n = a.bits();
    if n <= HGCD_BASE_BITS {
        return half_matrix(a, b);
    }
    if b.bits() * 2 <= n {
        return Mat::identity();
    }
    let half = n / 2;
    let first = hgcd(&(a >> half), &(b >> half));
    let (reduced_a, reduced_b) = first.apply(a, b);
    if reduced_b.is_zero() || reduced_b.bits() <= half {
        return first;
    }
    let quotient = &reduced_a / &reduced_b;
    let next_a = reduced_b.clone();
    let next_b = &reduced_a - &quotient * &reduced_b;
    let second = hgcd(&(next_a >> half), &(next_b >> half));
    let step = Mat {
        a: BigInt::zero(),
        b: BigInt::one(),
        c: BigInt::one(),
        d: -quotient,
    };
    second.mul(&step.mul(&first))
}

/// GCD por Half-GCD com finalização de palavra/Lehmer.
fn gcd_hgcd(a: &BigInt, b: &BigInt) -> BigInt {
    let mut big = a.abs();
    let mut small = b.abs();
    if big < small {
        core::mem::swap(&mut big, &mut small);
    }
    while !small.is_zero() {
        if small.bits() <= 64 {
            let word = small.to_u64().unwrap_or(0);
            if word == 0 {
                return big;
            }
            let reduced = (&big % BigInt::from(word)).to_u64().unwrap_or(0);
            return BigInt::from(gcd_word(reduced, word));
        }
        let (reduced_a, reduced_b) = hgcd(&big, &small).apply(&big, &small);
        big = reduced_a.abs();
        small = reduced_b.abs();
        if small.is_zero() {
            return big;
        }
        if small.bits() <= 64 {
            continue;
        }
        let quotient = &big / &small;
        let remainder = &big - &quotient * &small;
        big = small;
        small = remainder;
    }
    big
}

// ─────────────────────────────── suporte ───────────────────────────────

/// Gera um `BigInt` aleatório com aproximadamente `bits` bits.
fn random_bits(bits: u64, state: &mut u64) -> BigInt {
    let byte_len = usize::try_from(bits.div_ceil(8)).expect("cabe em usize");
    let mut bytes = vec![0_u8; byte_len];
    for chunk in bytes.chunks_mut(8) {
        *state ^= *state << 13;
        *state ^= *state >> 7;
        *state ^= *state << 17;
        let raw = state.to_le_bytes();
        let len = chunk.len().min(8);
        chunk[..len].copy_from_slice(&raw[..len]);
    }
    let mut value = BigInt::from_bytes_be(Sign::Plus, &bytes);
    value.set_bit(bits - 1, true);
    value.set_bit(0, true);
    value
}

fn time<F: Fn(&BigInt, &BigInt) -> BigInt>(pairs: &[(BigInt, BigInt)], rounds: u32, f: F) -> f64 {
    let mut sink = BigInt::zero();
    for (a, b) in pairs {
        sink ^= f(a, b);
    }
    let start = Instant::now();
    for _ in 0..rounds {
        for (a, b) in pairs {
            sink ^= f(a, b);
        }
    }
    let elapsed = start.elapsed();
    std::hint::black_box(&sink);
    elapsed.as_secs_f64() * 1e6 / f64::from(rounds * pairs.len() as u32)
}

fn main() {
    println!("bits\teuclid\tstein\tlehmer\thgcd\t(µs/op)");
    for &bits in &[256_u64, 1024, 2048, 4096, 6144, 8192, 16384, 32768, 65536] {
        let mut state = 0x9E37_79B9_7F4A_7C15_u64 ^ bits;
        let count = if bits >= 16384 { 4 } else { 16 };
        let rounds = if bits >= 16384 { 3 } else { 10 };
        let pairs: Vec<(BigInt, BigInt)> = (0..count)
            .map(|_| (random_bits(bits, &mut state), random_bits(bits, &mut state)))
            .collect();

        for (i, (a, b)) in pairs.iter().enumerate() {
            let expected = gcd_euclid(a, b);
            assert_eq!(gcd_stein(a, b), expected, "stein bits={bits} i={i}");
            assert_eq!(gcd_lehmer(a, b), expected, "lehmer bits={bits} i={i}");
            assert_eq!(gcd_hgcd(a, b), expected, "hgcd bits={bits} i={i}");
        }

        println!(
            "{bits}\t{:.2}\t{:.2}\t{:.2}\t{:.2}",
            time(&pairs, rounds, gcd_euclid),
            time(&pairs, rounds, gcd_stein),
            time(&pairs, rounds, gcd_lehmer),
            time(&pairs, rounds, gcd_hgcd),
        );
    }

    // Crossover em tamanhos muito grandes: só Lehmer vs HGCD.
    println!("\nbits\tlehmer\thgcd\t(µs/op, grande)");
    for &bits in &[65_536_u64, 131_072, 262_144, 524_288, 1_048_576] {
        let mut state = 0xA5A5_5A5A_1234_9876_u64 ^ bits;
        let count = 2;
        let rounds = 2;
        let pairs: Vec<(BigInt, BigInt)> = (0..count)
            .map(|_| (random_bits(bits, &mut state), random_bits(bits, &mut state)))
            .collect();
        for (a, b) in &pairs {
            assert_eq!(gcd_hgcd(a, b), gcd_lehmer(a, b), "hgcd bits={bits}");
        }
        println!(
            "{bits}\t{:.2}\t{:.2}",
            time(&pairs, rounds, gcd_lehmer),
            time(&pairs, rounds, gcd_hgcd),
        );
    }
}
