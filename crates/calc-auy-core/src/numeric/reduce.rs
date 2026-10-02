//! Reduções exatas de sequências de racionais.
//!
//! A aritmética racional é exata, então qualquer ordem de redução produz o
//! mesmo resultado (associatividade/comutatividade). A redução em árvore
//! reduz a profundidade e permite paralelismo determinístico (ADR-010).

use super::Rational;

/// Limiar a partir do qual a redução usa paralelismo (feature `parallel`).
#[cfg(feature = "parallel")]
pub(crate) const PARALLEL_THRESHOLD: usize = 256;

/// Soma sequencial em árvore.
fn sum_sequential(operands: &[Rational]) -> Rational {
    match operands {
        [] => Rational::ZERO,
        [single] => single.clone(),
        _ => {
            let mid = operands.len() / 2;
            let (left, right) = operands.split_at(mid);
            sum_sequential(left).add(&sum_sequential(right))
        }
    }
}

/// Produto sequencial em árvore.
fn prod_sequential(operands: &[Rational]) -> Rational {
    match operands {
        [] => Rational::ONE,
        [single] => single.clone(),
        _ => {
            let mid = operands.len() / 2;
            let (left, right) = operands.split_at(mid);
            prod_sequential(left).mul(&prod_sequential(right))
        }
    }
}

/// Soma paralela em árvore.
#[cfg(feature = "parallel")]
fn sum_parallel(operands: &[Rational]) -> Rational {
    if operands.len() < PARALLEL_THRESHOLD {
        return sum_sequential(operands);
    }
    let mid = operands.len() / 2;
    let (left, right) = operands.split_at(mid);
    let (a, b) = rayon::join(|| sum_parallel(left), || sum_parallel(right));
    a.add(&b)
}

/// Produto paralelo em árvore.
#[cfg(feature = "parallel")]
fn prod_parallel(operands: &[Rational]) -> Rational {
    if operands.len() < PARALLEL_THRESHOLD {
        return prod_sequential(operands);
    }
    let mid = operands.len() / 2;
    let (left, right) = operands.split_at(mid);
    let (a, b) = rayon::join(|| prod_parallel(left), || prod_parallel(right));
    a.mul(&b)
}

/// Soma exata de uma sequência (vazio = `0`).
pub(crate) fn sum_tree(operands: &[Rational]) -> Rational {
    #[cfg(feature = "parallel")]
    {
        sum_parallel(operands)
    }
    #[cfg(not(feature = "parallel"))]
    {
        sum_sequential(operands)
    }
}

/// Produto exato de uma sequência (vazio = `1`).
pub(crate) fn prod_tree(operands: &[Rational]) -> Rational {
    #[cfg(feature = "parallel")]
    {
        prod_parallel(operands)
    }
    #[cfg(not(feature = "parallel"))]
    {
        prod_sequential(operands)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::limits::Limits;

    fn rational(numerator: i64, denominator: i64) -> Rational {
        Rational::new_checked(numerator, denominator, &Limits::default()).expect("racional")
    }

    #[test]
    fn sum_matches_left_fold() {
        let values = [
            rational(1, 2),
            rational(1, 3),
            rational(1, 6),
            rational(5, 7),
        ];
        let expected = values
            .iter()
            .fold(Rational::ZERO, |acc, value| acc.add(value));
        assert_eq!(sum_tree(&values), expected);
    }

    #[test]
    fn product_matches_left_fold() {
        let values = [rational(2, 3), rational(3, 4), rational(4, 5)];
        let expected = values
            .iter()
            .fold(Rational::ONE, |acc, value| acc.mul(value));
        assert_eq!(prod_tree(&values), expected);
    }

    #[test]
    fn empty_identities() {
        assert_eq!(sum_tree(&[]), Rational::ZERO);
        assert_eq!(prod_tree(&[]), Rational::ONE);
    }
}
