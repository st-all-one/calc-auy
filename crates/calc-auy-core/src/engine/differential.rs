//! Differential fuzzing vs. oráculo `BigInt` (`Large`) e soak/stress (T13.2).
//!
//! O oráculo é uma implementação **independente** de aritmética racional sobre
//! `BigInt`; o motor híbrido (`Small`/`Large`) deve concordar com ele. O soak
//! reavalia uma expressão grande muitas vezes e verifica determinismo.

use num_bigint::BigInt;
use num_integer::Integer;
use num_traits::{One, Pow, Signed, ToPrimitive, Zero};
use proptest::prelude::*;

use crate::ast::{AstBuilder, NodeId, OperationType};
use crate::error::CalcAuyError;
use crate::limits::Limits;
use crate::numeric::Rational;

use super::eval::eval_ast;

/// Racional de referência sobre `BigInt`.
#[derive(Clone, Debug, PartialEq, Eq)]
struct Oracle {
    /// Numerador normalizado.
    n: BigInt,
    /// Denominador positivo.
    d: BigInt,
}

impl Oracle {
    /// Normaliza sinal e reduz por `gcd`.
    fn new(n: BigInt, d: BigInt) -> Self {
        let (n, d) = if d.is_negative() { (-n, -d) } else { (n, d) };
        if n.is_zero() {
            return Self {
                n: BigInt::zero(),
                d: BigInt::one(),
            };
        }
        let gcd = n.gcd(&d);
        Self {
            n: &n / &gcd,
            d: &d / &gcd,
        }
    }

    /// Constrói a partir de um inteiro.
    fn from_i64(value: i64) -> Self {
        Self {
            n: BigInt::from(value),
            d: BigInt::one(),
        }
    }

    /// Soma exata.
    fn add(&self, other: &Self) -> Self {
        Self::new(&self.n * &other.d + &other.n * &self.d, &self.d * &other.d)
    }

    /// Subtração exata.
    fn sub(&self, other: &Self) -> Self {
        Self::new(&self.n * &other.d - &other.n * &self.d, &self.d * &other.d)
    }

    /// Multiplicação exata.
    fn mul(&self, other: &Self) -> Self {
        Self::new(&self.n * &other.n, &self.d * &other.d)
    }

    /// Divisão exata, se o divisor não for zero.
    fn div(&self, other: &Self) -> Option<Self> {
        if other.n.is_zero() {
            None
        } else {
            Some(Self::new(&self.n * &other.d, &self.d * &other.n))
        }
    }

    /// Potência inteira, se o expoente for inteiro.
    fn pow_int(&self, exponent: &Self) -> Option<Self> {
        if !exponent.d.is_one() {
            return None;
        }
        let exp: i64 = exponent.n.to_i64()?;
        if exp >= 0 {
            let exp = u32::try_from(exp).ok()?;
            Some(Self::new(self.n.clone().pow(exp), self.d.clone().pow(exp)))
        } else {
            if self.n.is_zero() {
                return None;
            }
            let exp = u32::try_from(-exp).ok()?;
            Some(Self::new(self.d.clone().pow(exp), self.n.clone().pow(exp)))
        }
    }

    /// Converte para o racional do domínio.
    fn to_rational(&self, limits: &Limits) -> Rational {
        Rational::new_bigint_checked(self.n.clone(), self.d.clone(), limits)
            .expect("oráculo dentro dos limites")
    }
}

/// Árvore de referência.
#[derive(Debug, Clone)]
enum Tree {
    /// Folha inteira.
    Leaf(i64),
    /// Operação com filhos.
    Operation(OperationType, Vec<Self>),
    /// Agrupamento.
    Group(Box<Self>),
}

/// Estratégia para operações cobertas pelo oráculo.
fn any_operation() -> impl Strategy<Value = OperationType> {
    prop_oneof![
        Just(OperationType::Add),
        Just(OperationType::Sub),
        Just(OperationType::Mul),
        Just(OperationType::Div),
        Just(OperationType::Pow),
    ]
}

/// Estratégia recursiva para árvores.
fn any_tree() -> impl Strategy<Value = Tree> {
    let leaf = (-20_i64..20).prop_map(Tree::Leaf);
    leaf.prop_recursive(3, 32, 3, |inner| {
        prop_oneof![
            (any_operation(), prop::collection::vec(inner.clone(), 1..=3))
                .prop_map(|(op, children)| Tree::Operation(op, children)),
            inner.prop_map(|child| Tree::Group(Box::new(child))),
        ]
    })
}

/// Constrói a arena a partir da árvore.
fn build(builder: &mut AstBuilder<'_>, tree: &Tree) -> Result<NodeId, CalcAuyError> {
    match tree {
        Tree::Leaf(value) => builder.literal(Rational::from_i64(*value), value.to_string()),
        Tree::Operation(op, children) => {
            let ids = children
                .iter()
                .map(|child| build(builder, child))
                .collect::<Result<Vec<_>, _>>()?;
            builder.operation(*op, &ids)
        }
        Tree::Group(child) => {
            let id = build(builder, child)?;
            builder.group(id)
        }
    }
}

/// Avalia a árvore com o oráculo independente.
fn oracle_eval(tree: &Tree) -> Option<Oracle> {
    match tree {
        Tree::Leaf(value) => Some(Oracle::from_i64(*value)),
        Tree::Group(child) => oracle_eval(child),
        Tree::Operation(op, children) => {
            let values: Option<Vec<_>> = children.iter().map(oracle_eval).collect();
            let values = values?;
            let (first, rest) = values.split_first()?;
            match op {
                OperationType::Add => Some(rest.iter().fold(first.clone(), |acc, v| acc.add(v))),
                OperationType::Sub => Some(rest.iter().fold(first.clone(), |acc, v| acc.sub(v))),
                OperationType::Mul => Some(rest.iter().fold(first.clone(), |acc, v| acc.mul(v))),
                OperationType::Div => rest.iter().try_fold(first.clone(), |acc, v| acc.div(v)),
                OperationType::Pow => {
                    let exponent = rest.first()?;
                    first.pow_int(exponent)
                }
                _ => None,
            }
        }
    }
}

/// Constrói a arena a partir de uma árvore.
fn build_ast(tree: &Tree) -> crate::ast::FlatAst {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let root = build(&mut builder, tree).expect("construção");
    builder.finish(root).expect("árvore")
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]

    #[test]
    fn engine_matches_bigint_oracle(tree in any_tree()) {
        let ast = build_ast(&tree);
        let limits = Limits::default();
        let engine = eval_ast(&ast, &limits);
        let oracle = oracle_eval(&tree);
        if let (Ok(engine), Some(oracle)) = (engine, oracle) {
            prop_assert_eq!(engine, oracle.to_rational(&limits));
        }
    }
}

#[test]
fn soak_stress_is_deterministic() {
    // Expressão grande e aninhada, reavaliada muitas vezes.
    let tree = Tree::Operation(
        OperationType::Mul,
        vec![
            Tree::Operation(OperationType::Add, (1..=8).map(Tree::Leaf).collect()),
            Tree::Group(Box::new(Tree::Operation(
                OperationType::Pow,
                vec![Tree::Leaf(3), Tree::Leaf(7)],
            ))),
            Tree::Operation(
                OperationType::Sub,
                (1..=8).map(|value| Tree::Leaf(value * 3)).collect(),
            ),
        ],
    );
    let ast = build_ast(&tree);
    let limits = Limits::default();
    let expected = eval_ast(&ast, &limits).expect("avaliação");
    let iterations = 20_000;
    for _ in 0..iterations {
        let actual = eval_ast(&ast, &limits).expect("avaliação");
        assert_eq!(actual, expected);
    }
}
