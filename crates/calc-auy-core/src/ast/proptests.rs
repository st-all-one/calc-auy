//! Testes de propriedade dos invariantes da arena (T02.7).

use proptest::prelude::*;

use super::builder::AstBuilder;
use super::flat::{FlatAst, NodeData};
use super::types::OperationType;
use crate::error::CalcAuyError;
use crate::limits::Limits;
use crate::numeric::Rational;

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
    ]
}

/// Estratégia recursiva para árvores de referência.
fn any_tree() -> impl Strategy<Value = Tree> {
    let leaf = (-1_000_i64..1_000).prop_map(Tree::Leaf);
    leaf.prop_recursive(4, 32, 4, |inner| {
        prop_oneof![
            (any_operation(), prop::collection::vec(inner.clone(), 1..=4))
                .prop_map(|(op, children)| Tree::Operation(op, children)),
            inner.prop_map(|child| Tree::Group(Box::new(child))),
        ]
    })
}

/// Constrói a arena a partir da árvore de referência.
fn build(builder: &mut AstBuilder<'_>, tree: &Tree) -> Result<super::types::NodeId, CalcAuyError> {
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

/// Verifica que todo `NodeId` referenciado existe e as profundidades são coerentes.
fn check_invariants(ast: &FlatAst) {
    for (_, node) in ast.iter_nodes() {
        match node {
            NodeData::Operation { operands, .. } => {
                assert!(operands.iter().all(|id| ast.contains(*id)));
            }
            NodeData::Group { child } | NodeData::Control { child, .. } => {
                assert!(ast.contains(*child));
            }
            NodeData::Literal { .. } => {}
        }
    }

    for (id, node) in ast.iter_nodes() {
        let expected = match node {
            NodeData::Literal { .. } => 1,
            NodeData::Operation { operands, .. } => operands
                .iter()
                .filter_map(|child| ast.depth(*child))
                .max()
                .unwrap_or(0)
                .saturating_add(1),
            NodeData::Group { child } | NodeData::Control { child, .. } => {
                ast.depth(*child).unwrap_or(0).saturating_add(1)
            }
        };
        assert_eq!(ast.depth(id), Some(expected));
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(256))]

    #[test]
    fn arena_invariants_hold(tree in any_tree()) {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let root = build(&mut builder, &tree).expect("construção");
        let ast = builder.finish(root).expect("árvore");

        check_invariants(&ast);
        prop_assert!(ast.len() <= limits.max_nodes);
        prop_assert!(ast.max_depth() <= limits.max_depth);
        prop_assert!(!ast.is_empty());
    }

    #[test]
    fn round_trip_preserves_arena(tree in any_tree()) {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let root = build(&mut builder, &tree).expect("construção");
        let ast = builder.finish(root).expect("árvore");

        let json = ast.to_json_string().expect("serializa");
        let parsed = FlatAst::from_json_str(&json, &limits).expect("desserializa");
        let again = parsed.to_json_string().expect("serializa");

        prop_assert_eq!(json, again);
        prop_assert_eq!(ast.len(), parsed.len());
        prop_assert_eq!(ast.max_depth(), parsed.max_depth());
        check_invariants(&parsed);
    }
}
