//! Equivalência entre o motor iterativo e o oráculo recursivo (T04.6).

use proptest::prelude::*;

use crate::ast::{AstBuilder, FlatAst, NodeData, NodeId, OperationType};
use crate::error::CalcAuyError;
use crate::integrity::{CustodyVerifier, VerifiedAst};
use crate::limits::Limits;
use crate::numeric::{Rational, RoundingStrategy};

use super::cache::EvalCache;
use super::eval::{apply_operation, eval_ast, eval_memoized};

/// Árvore de referência gerada pelas estratégias.
#[derive(Debug, Clone)]
enum Tree {
    /// Folha com valor inteiro.
    Leaf(i64),
    /// Operação com filhos.
    Operation(OperationType, Vec<Self>),
    /// Agrupamento.
    Group(Box<Self>),
}

/// Estratégia para tipos de operação.
fn any_operation() -> impl Strategy<Value = OperationType> {
    prop_oneof![
        Just(OperationType::Add),
        Just(OperationType::Sub),
        Just(OperationType::Mul),
        Just(OperationType::Div),
        Just(OperationType::Pow),
        Just(OperationType::Mod),
        Just(OperationType::DivInt),
    ]
}

/// Estratégia recursiva para árvores de referência.
fn any_tree() -> impl Strategy<Value = Tree> {
    let leaf = (-50_i64..50).prop_map(Tree::Leaf);
    leaf.prop_recursive(5, 64, 4, |inner| {
        prop_oneof![
            (any_operation(), prop::collection::vec(inner.clone(), 1..=3))
                .prop_map(|(op, children)| Tree::Operation(op, children)),
            inner.prop_map(|child| Tree::Group(Box::new(child))),
        ]
    })
}

/// Constrói a arena a partir da árvore de referência.
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

/// Oráculo recursivo simples.
fn eval_recursive(ast: &FlatAst, id: NodeId, limits: &Limits) -> Result<Rational, CalcAuyError> {
    match ast.node(id) {
        Some(NodeData::Literal { value, .. }) => Ok(value.clone()),
        Some(NodeData::Group { child } | NodeData::Control { child, .. }) => {
            eval_recursive(ast, *child, limits)
        }
        Some(NodeData::Operation { op, operands }) => {
            let values = operands
                .iter()
                .map(|operand| eval_recursive(ast, *operand, limits))
                .collect::<Result<Vec<_>, _>>()?;
            apply_operation(*op, &values, limits)
        }
        None => Err(CalcAuyError::InvalidInput {
            message: "NodeId inválido".to_string(),
        }),
    }
}

/// Verificador permissivo.
struct NoopVerifier;

impl CustodyVerifier for NoopVerifier {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        Ok(())
    }
}

/// Constrói a arena e devolve `(ast, verified)`.
fn build_ast(tree: &Tree) -> (FlatAst, VerifiedAst) {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let root = build(&mut builder, tree).expect("construção");
    let ast = builder.finish(root).expect("árvore");
    let verified = ast
        .clone()
        .verify_custody(&NoopVerifier, &limits)
        .expect("custódia");
    (ast, verified)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(256))]

    #[test]
    fn iterative_matches_recursive(tree in any_tree()) {
        let (ast, _) = build_ast(&tree);
        let limits = Limits::default();
        let iterative = eval_ast(&ast, &limits);
        let recursive = eval_recursive(&ast, ast.root(), &limits);
        match (iterative, recursive) {
            (Ok(iterative), Ok(recursive)) => prop_assert_eq!(iterative, recursive),
            (Err(_), Err(_)) => {}
            (iterative, recursive) => prop_assert!(false, "divergência: {iterative:?} vs {recursive:?}"),
        }
    }

    #[test]
    fn memoized_matches_plain(tree in any_tree()) {
        let (ast, verified) = build_ast(&tree);
        let limits = Limits::default();
        let plain = eval_ast(&ast, &limits);
        let mut cache = EvalCache::new(64);
        let memoized = eval_memoized(&verified, &limits, &mut cache);
        prop_assert_eq!(plain.is_ok(), memoized.is_ok());
        match (plain, memoized) {
            (Ok(plain), Ok(memoized)) => prop_assert_eq!(plain, memoized),
            _ => {}
        }
    }
}
