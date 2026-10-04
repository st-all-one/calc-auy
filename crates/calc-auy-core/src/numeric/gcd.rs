//! GCD (Máximo Divisor Comum) — híbrido Stein/Lehmer.
//!
//! O algoritmo de Euclides clássico (com `%` de precisão total) é O(n²) em
//! operações de palavra e domina o custo de redução de frações grandes. Este
//! módulo usa duas estratégias complementares:
//!
//! - **Stein binário** (`num-integer`): shifts e subtrações, sem divisão.
//!   Ótimo até ~4 kbit.
//! - **Lehmer** (Knuth, TAOCP 4.5.2, Algoritmo L): simula ~64 passos de
//!   Euclides por vez com as palavras líderes, reduzindo as operações
//!   multiprecisão de O(n) para O(n/word). Vence a partir de ~6 kbit.
//!
//! O resultado é sempre não negativo.

use num_bigint::BigInt;
use num_integer::Integer;
use num_traits::{One, Signed, ToPrimitive, Zero};

/// Limiar (em bits) a partir do qual Lehmer substitui o Stein binário.
///
/// Medido empiricamente: em ~4 kbit os dois empatam; acima disso Lehmer escala
/// melhor (O(n²/word²) vs O(n²/word)).
const LEHMER_THRESHOLD_BITS: u64 = 4096;

/// Binary GCD branchless para u64.
///
/// Este algoritmo usa operações de shift em vez de divisão,
/// o que o torna mais eficiente para números grandes.
#[must_use]
pub const fn gcd_u64(mut left: u64, mut right: u64) -> u64 {
    if left == 0 {
        return right;
    }
    if right == 0 {
        return left;
    }

    // Conta os zeros à direita comuns
    let shift = (left | right).trailing_zeros();
    left >>= left.trailing_zeros();

    loop {
        right >>= right.trailing_zeros();
        if left > right {
            core::mem::swap(&mut left, &mut right);
        }
        right = right.wrapping_sub(left);
        if right == 0 {
            break;
        }
    }

    left << shift
}

/// Binary GCD branchless para u128.
#[must_use]
pub const fn gcd_u128(mut left: u128, mut right: u128) -> u128 {
    if left == 0 {
        return right;
    }
    if right == 0 {
        return left;
    }

    let shift = (left | right).trailing_zeros();
    left >>= left.trailing_zeros();

    loop {
        right >>= right.trailing_zeros();
        if left > right {
            core::mem::swap(&mut left, &mut right);
        }
        right = right.wrapping_sub(left);
        if right == 0 {
            break;
        }
    }

    left << shift
}

/// Matriz 2×2 de uma sequência de passos de Euclides.
///
/// Aplicada a `(a, b)`, produz `(a', b') = (α·a + β·b, γ·a + δ·b)`. Os
/// coeficientes são de palavra (cabem folgadamente em `i128`) porque a
/// simulação roda sobre as palavras líderes.
#[derive(Clone, Copy)]
struct LehmerMatrix {
    alpha: i128,
    beta: i128,
    gamma: i128,
    delta: i128,
}

impl LehmerMatrix {
    /// Matriz identidade (nenhum passo simulado).
    const IDENTITY: Self = Self {
        alpha: 1,
        beta: 0,
        gamma: 0,
        delta: 1,
    };

    /// Quociente que a aproximação `(x, y)` reproduz exatamente, se houver.
    #[allow(
        clippy::arithmetic_side_effects,
        reason = "i128 limitado a ~2^64 pela janela de 64 bits; sem overflow real"
    )]
    const fn matching_quotient(self, x: i128, y: i128) -> Option<i128> {
        let denominator_gamma = y + self.gamma;
        let denominator_delta = y + self.delta;
        if denominator_gamma == 0 || denominator_delta == 0 {
            return None;
        }
        let quotient = (x + self.alpha) / denominator_gamma;
        if quotient != (x + self.beta) / denominator_delta {
            return None;
        }
        Some(quotient)
    }

    /// Simula passos de Euclides sobre as palavras líderes `(x, y)` até a
    /// aproximação deixar de reproduzir exatamente os quocientes verdadeiros.
    ///
    /// Interrompe também se os coeficientes saírem de `i128` (defensivo; não
    /// ocorre na prática porque a simulação dura ~64 passos).
    fn from_leading_words(x: i128, y: i128) -> Self {
        let mut state = (Self::IDENTITY, x, y);
        while let Some(next) = simulate_once(state) {
            state = next;
        }
        state.0
    }

    /// `true` se nenhum passo foi simulado (o quociente real é grande demais).
    const fn is_identity(self) -> bool {
        self.beta == 0
    }

    /// Aplica a matriz a `(big, small)`.
    fn apply(self, big: &BigInt, small: &BigInt) -> (BigInt, BigInt) {
        let next_big = BigInt::from(self.alpha) * big + BigInt::from(self.beta) * small;
        let next_small = BigInt::from(self.gamma) * big + BigInt::from(self.delta) * small;
        (next_big.abs(), next_small.abs())
    }
}

/// `left - quotient * right`, ou `None` em overflow de `i128`.
fn checked_step(left: i128, quotient: i128, right: i128) -> Option<i128> {
    quotient
        .checked_mul(right)
        .and_then(|product| left.checked_sub(product))
}

/// Avança um passo da simulação, ou `None` quando a aproximação deixa de ser
/// exata (ou os coeficientes sairiam de `i128`).
fn simulate_once(state: (LehmerMatrix, i128, i128)) -> Option<(LehmerMatrix, i128, i128)> {
    let (matrix, x, y) = state;
    let quotient = matrix.matching_quotient(x, y)?;
    let (next, next_y) = advance(matrix, x, y, quotient)?;
    Some((next, y, next_y))
}

/// Avança um passo da simulação. `None` se os coeficientes saírem de `i128`.
#[allow(
    clippy::arithmetic_side_effects,
    reason = "i128 limitado a ~2^64 pela janela de 64 bits; sem overflow real"
)]
fn advance(matrix: LehmerMatrix, x: i128, y: i128, quotient: i128) -> Option<(LehmerMatrix, i128)> {
    let next_gamma = checked_step(matrix.alpha, quotient, matrix.gamma)?;
    let next_delta = checked_step(matrix.beta, quotient, matrix.delta)?;
    let next = LehmerMatrix {
        alpha: matrix.gamma,
        beta: matrix.delta,
        gamma: next_gamma,
        delta: next_delta,
    };
    Some((next, x - quotient * y))
}

/// Limiar (em bits) a partir do qual o Half-GCD substitui o Lehmer.
///
/// Crossover medido em ~200 kbit: abaixo dele as constantes menores do Lehmer
/// vencem; acima, a natureza subquadrática do HGCD prevalece (até ~3× a
/// 1 Mbit com a multiplicação Karatsuba do `num-bigint`).
const HGCD_THRESHOLD_BITS: u64 = 200_000;

/// GCD para `BigInt` (híbrido Stein/Lehmer/HGCD).
///
/// O resultado é sempre não negativo.
#[must_use]
pub fn gcd_bigint(left: &BigInt, right: &BigInt) -> BigInt {
    let a = left.abs();
    let b = right.abs();
    if a.is_zero() {
        return b;
    }
    if b.is_zero() {
        return a;
    }
    let bits = a.bits().max(b.bits());
    if bits < LEHMER_THRESHOLD_BITS {
        a.gcd(&b)
    } else if bits < HGCD_THRESHOLD_BITS {
        gcd_lehmer(&a, &b)
    } else {
        gcd_hgcd(&a, &b)
    }
}

/// Lehmer's GCD sobre valores não negativos e não nulos.
fn gcd_lehmer(left: &BigInt, right: &BigInt) -> BigInt {
    let mut big = left.clone();
    let mut small = right.clone();
    if big < small {
        core::mem::swap(&mut big, &mut small);
    }

    loop {
        if small.is_zero() {
            return big;
        }
        if small.bits() <= 64 {
            return finish_with_word(&big, &small);
        }
        let matrix = lehmer_matrix(&big, &small);
        if matrix.is_identity() {
            // Quociente grande demais para a palavra líder: um passo completo.
            let remainder = &big % &small;
            big.clone_from(&small);
            small = remainder;
        } else {
            let (next_big, next_small) = matrix.apply(&big, &small);
            big = next_big;
            small = next_small;
        }
    }
}

/// Extrai as palavras líderes de `(big, small)` e simula Euclides.
fn lehmer_matrix(big: &BigInt, small: &BigInt) -> LehmerMatrix {
    let shift = big.bits().saturating_sub(64);
    let x = (big >> shift).to_u64().unwrap_or(0);
    let y = (small >> shift).to_u64().unwrap_or(0);
    LehmerMatrix::from_leading_words(i128::from(x), i128::from(y))
}

/// Termina o GCD quando o menor operando cabe em uma palavra.
fn finish_with_word(big: &BigInt, small: &BigInt) -> BigInt {
    let word = small.to_u64().unwrap_or(0);
    if word == 0 {
        return big.clone();
    }
    let reduced = (big % BigInt::from(word)).to_u64().unwrap_or(0);
    BigInt::from(gcd_u64(reduced, word))
}

/// Matriz 2×2 em SL(2,ℤ): `(x, y) ↦ (α·x + β·y, γ·x + δ·y)`.
///
/// Representa uma sequência de passos de Euclides como uma única
/// transformação linear — a base algébrica do Half-GCD.
#[derive(Clone)]
struct GcdMatrix {
    alpha: BigInt,
    beta: BigInt,
    gamma: BigInt,
    delta: BigInt,
}

impl GcdMatrix {
    /// Matriz identidade.
    fn identity() -> Self {
        Self {
            alpha: BigInt::one(),
            beta: BigInt::zero(),
            gamma: BigInt::zero(),
            delta: BigInt::one(),
        }
    }

    /// Produto de matrizes (`self` aplicada após `other`).
    #[allow(
        clippy::suspicious_operation_groupings,
        reason = "produto de matrizes 2×2 correto: linhas de `self`, colunas de `other`"
    )]
    fn mul(&self, other: &Self) -> Self {
        Self {
            alpha: &self.alpha * &other.alpha + &self.beta * &other.gamma,
            beta: &self.alpha * &other.beta + &self.beta * &other.delta,
            gamma: &self.gamma * &other.alpha + &self.delta * &other.gamma,
            delta: &self.gamma * &other.beta + &self.delta * &other.delta,
        }
    }

    /// Aplica a matriz ao par `(x, y)`.
    fn apply(&self, x: &BigInt, y: &BigInt) -> (BigInt, BigInt) {
        (
            &self.alpha * x + &self.beta * y,
            &self.gamma * x + &self.delta * y,
        )
    }
}

/// Matriz de um passo de Euclides `(x, y) ↦ (y, x - q·y)`.
fn euclid_step(quotient: BigInt) -> GcdMatrix {
    GcdMatrix {
        alpha: BigInt::zero(),
        beta: BigInt::one(),
        gamma: BigInt::one(),
        delta: -quotient,
    }
}

/// Matriz que reduz `(left, right)` até `right` ficar abaixo de `left/2`.
///
/// Parar na metade é essencial: reduzir até o GCD completo dobraria o tamanho
/// dos coeficientes a cada nível da recursão.
fn half_matrix(left: &BigInt, right: &BigInt) -> GcdMatrix {
    let target = left.bits().saturating_div(2);
    let mut matrix = GcdMatrix::identity();
    let mut x = left.clone();
    let mut y = right.clone();
    while !y.is_zero() && y.bits() > target {
        let quotient = &x / &y;
        let remainder = &x - &quotient * &y;
        matrix = euclid_step(quotient).mul(&matrix);
        x = y;
        y = remainder;
    }
    matrix
}

/// Half-GCD: matriz que reduz `(left, right)` a ~metade do tamanho.
///
/// Requer `left >= right >= 0`. Resolve a metade alta primeiro e depois a
/// baixa (divisão-e-conquista), combinando as matrizes por multiplicação
/// rápida.
fn hgcd(left: &BigInt, right: &BigInt) -> GcdMatrix {
    if right.is_zero() || left <= right {
        return GcdMatrix::identity();
    }
    let bits = left.bits();
    if bits <= 64 {
        return half_matrix(left, right);
    }
    if right.bits().saturating_mul(2) <= bits {
        return GcdMatrix::identity();
    }
    let half = bits.saturating_div(2);
    let first = hgcd(&(left >> half), &(right >> half));
    let (reduced_left, reduced_right) = first.apply(left, right);
    if reduced_right.is_zero() || reduced_right.bits() <= half {
        return first;
    }
    let quotient = &reduced_left / &reduced_right;
    let next_left = reduced_right.clone();
    let next_right = &reduced_left - &quotient * &reduced_right;
    let second = hgcd(&(next_left >> half), &(next_right >> half));
    second.mul(&euclid_step(quotient).mul(&first))
}

/// GCD por Half-GCD com finalização de palavra.
fn gcd_hgcd(left: &BigInt, right: &BigInt) -> BigInt {
    let mut big = left.clone();
    let mut small = right.clone();
    if big < small {
        core::mem::swap(&mut big, &mut small);
    }
    while !small.is_zero() {
        if small.bits() <= 64 {
            return finish_with_word(&big, &small);
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

/// GCD para i64 (com sinal).
///
/// # Panics
///
/// Nunca deve panicar: o GCD de dois valores `i64` cabe em `i64`.
#[must_use]
pub fn gcd_i64(left: i64, right: i64) -> i64 {
    let result = gcd_u64(left.unsigned_abs(), right.unsigned_abs());
    i64::try_from(result).unwrap_or(i64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;
    use num_traits::One;

    /// Euclides ingênuo: oráculo independente para os testes.
    fn gcd_oracle(left: &BigInt, right: &BigInt) -> BigInt {
        let mut current = left.abs();
        let mut divisor = right.abs();
        while !divisor.is_zero() {
            let remainder = &current % &divisor;
            current.clone_from(&divisor);
            divisor = remainder;
        }
        current
    }

    fn random_bigint(bits: u64, state: &mut u64) -> BigInt {
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
        let mut value = BigInt::from_bytes_be(num_bigint::Sign::Plus, &bytes);
        value.set_bit(bits - 1, true);
        value.set_bit(0, true);
        value
    }

    #[test]
    fn gcd_u64_basic() {
        assert_eq!(gcd_u64(12, 8), 4);
        assert_eq!(gcd_u64(8, 12), 4);
        assert_eq!(gcd_u64(0, 5), 5);
        assert_eq!(gcd_u64(5, 0), 5);
        assert_eq!(gcd_u64(0, 0), 0);
        assert_eq!(gcd_u64(7, 7), 7);
        assert_eq!(gcd_u64(1, 1), 1);
    }

    #[test]
    fn gcd_u64_large() {
        assert_eq!(gcd_u64(u64::MAX, 1), 1);
        assert_eq!(gcd_u64(u64::MAX, u64::MAX), u64::MAX);
        assert_eq!(gcd_u64(1_000_000_000_000, 1_000_000), 1_000_000);
    }

    #[test]
    fn gcd_u128_basic() {
        assert_eq!(gcd_u128(12, 8), 4);
        assert_eq!(gcd_u128(0, 5), 5);
        assert_eq!(gcd_u128(5, 0), 5);
    }

    #[test]
    fn gcd_bigint_basic() {
        let left = BigInt::from(12);
        let right = BigInt::from(8);
        assert_eq!(gcd_bigint(&left, &right), BigInt::from(4));
    }

    #[test]
    fn gcd_bigint_large() {
        let left = BigInt::from(1_000_000_000_000u64);
        let right = BigInt::from(1_000_000u64);
        assert_eq!(gcd_bigint(&left, &right), BigInt::from(1_000_000u64));
    }

    #[test]
    fn gcd_bigint_matches_oracle_across_sizes() {
        let mut state = 0xDEAD_BEEF_CAFE_1234_u64;
        for &bits in &[64_u64, 256, 1024, 4096, 6144, 8192, 12288] {
            for _ in 0..8 {
                let left = random_bigint(bits, &mut state);
                let right = random_bigint(bits, &mut state);
                assert_eq!(
                    gcd_bigint(&left, &right),
                    gcd_oracle(&left, &right),
                    "divergiu em {bits} bits"
                );
            }
        }
    }

    #[test]
    fn gcd_bigint_lehmer_matches_oracle_with_common_factor() {
        let mut state = 0x1234_5678_9ABC_DEF0_u64;
        let factor = random_bigint(2048, &mut state);
        for _ in 0..6 {
            let left = &factor * random_bigint(6144, &mut state);
            let right = &factor * random_bigint(6144, &mut state);
            assert_eq!(
                gcd_bigint(&left, &right),
                gcd_oracle(&left, &right),
                "divergiu com fator comum"
            );
        }
    }

    #[test]
    fn gcd_bigint_uses_hgcd_above_threshold() {
        // Acima de ~200 kbit o dispatcher usa Half-GCD; valida contra Lehmer.
        let mut state = 0xABCD_1234_5678_9012_u64;
        let left = random_bigint(250_000, &mut state);
        let right = random_bigint(250_000, &mut state);
        assert_eq!(gcd_bigint(&left, &right), gcd_lehmer(&left, &right));
    }

    #[test]
    fn gcd_bigint_edge_cases() {
        let big = BigInt::one() << 9000_u64;
        assert_eq!(gcd_bigint(&big, &BigInt::one()), BigInt::one());
        assert_eq!(gcd_bigint(&big, &big), big);
        assert_eq!(gcd_bigint(&BigInt::zero(), &big), big);
        assert_eq!(gcd_bigint(&-big.clone(), &big), big);
    }

    #[test]
    fn gcd_i64_basic() {
        assert_eq!(gcd_i64(12, 8), 4);
        assert_eq!(gcd_i64(-12, 8), 4);
        assert_eq!(gcd_i64(12, -8), 4);
        assert_eq!(gcd_i64(-12, -8), 4);
    }
}
