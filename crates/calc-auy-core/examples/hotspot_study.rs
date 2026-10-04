//! Sonda de hotspots que fundamenta o plano A/B (`plan/AB-plan-otimizacoes.md`).
//!
//! Roda com:
//!
//! ```bash
//! env RUSTUP_TOOLCHAIN=stable cargo run --release -p calc-auy-core --example hotspot_study
//! ```
//!
//! Mede os custos que dominam os workloads de maior tempo absoluto:
//! potências, multiplicação de precisão arbitrária, conversão decimal, soma
//! em árvore e serialização canônica.

use std::time::Instant;

use num_bigint::BigInt;
use num_traits::One;

use calc_auy_core::Limits;
use calc_auy_core::canonical::Canonical;
use calc_auy_core::numeric::Rational;

fn timed<F: FnMut() -> T, T>(rounds: u32, mut f: F) -> f64 {
    let mut sink = f();
    let start = Instant::now();
    for _ in 0..rounds {
        sink = f();
    }
    let elapsed = start.elapsed();
    std::hint::black_box(&sink);
    elapsed.as_secs_f64() * 1e6 / f64::from(rounds)
}

fn main() {
    let limits =
        Limits::new(1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000_000).expect("limites");

    // 1) 2^225000: pow por quadrados vs shift (potência de 2).
    let pow_time = timed(5, || BigInt::from(2).pow(225_000));
    let shift_time = timed(5, || BigInt::one() << 225_000_u64);
    println!("2^225000        pow={pow_time:.1}µs  shift={shift_time:.1}µs");

    // 2) Multiplicação de dois números de 225 kbit.
    let a = BigInt::from(2).pow(225_000);
    let b = a.clone();
    let mul_time = timed(5, || &a * &b);
    println!("225kbit × 225kbit  mul={mul_time:.1}µs");

    // 3) Avaliação atual de mult_avalanche (4× pow + 3 mul) vs dedup DAG.
    let avalanche = timed(3, || {
        let p = BigInt::from(2).pow(225_000);
        let m = &p * &p;
        &m * &m
    });
    let dedup = timed(3, || {
        let p = BigInt::one() << 225_000_u64;
        let m = &p * &p;
        &m * &m
    });
    println!("avalanche pow+3mul={avalanche:.0}µs  shift+3mul={dedup:.0}µs");

    // 4) Rational::pow_int(2, 225000).
    let base = Rational::from_i64(2);
    let exp = Rational::from_i64(225_000);
    let rpow = timed(5, || base.pow(&exp, &limits).expect("pow"));
    println!("Rational 2^225000  ={rpow:.1}µs");

    // 5) Soma de 125k cópias de 10001/10000 (hydra) — uma a uma.
    let leaf = Rational::new_checked(10_001, 10_000, &limits).expect("leaf");
    let sequential = timed(2, || {
        let mut acc = Rational::ZERO;
        for _ in 0..125_000 {
            acc = acc.add(&leaf);
        }
        acc
    });
    println!("soma 125k seq      ={sequential:.0}µs");

    // 6) Igual, mas multiplicando por escalar (50*k) — potencial do fold especializado.
    let scalar = timed(200, || {
        let mut acc = Rational::ZERO;
        for _ in 0..50 {
            acc = acc.add(&leaf);
        }
        acc
    });
    println!(
        "soma 50 seq        ={scalar:.1}µs  (×2500 ≈ {:.0}µs)",
        scalar * 2500.0
    );

    // 7) write_canonical de um literal (alocação por nó).
    let mut buffer = Vec::new();
    let canonical = timed(100_000, || {
        buffer.clear();
        leaf.write_canonical(&mut buffer);
        buffer.len()
    });
    let alloc = timed(100_000, || {
        let mut fresh = Vec::new();
        leaf.write_canonical(&mut fresh);
        fresh.len()
    });
    println!("write_canonical  reuso={canonical:.3}µs  alocando={alloc:.3}µs");

    // 8) Serialização decimal de um número gigante (assinatura/saída).
    let huge = BigInt::one() << 900_000_u64;
    let to_dec = timed(3, || huge.to_string());
    println!("2^900000 -> decimal      ={to_dec:.0}µs");
    let huge_hex = timed(3, || huge.to_str_radix(16));
    println!("2^900000 -> hex          ={huge_hex:.0}µs");
    let huge_bits = timed(1000, || huge.bits());
    println!("2^900000 bits()          ={huge_bits:.4}µs");

    // 9) Mesmo para 225 kbit.
    let mid = BigInt::one() << 225_000_u64;
    let mid_dec = timed(10, || mid.to_string());
    println!("2^225000 -> decimal      ={mid_dec:.1}µs");
}
