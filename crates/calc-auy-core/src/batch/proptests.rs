//! Propriedades do motor de lotes (T08.1–T08.4).

use proptest::prelude::*;

use crate::ast::{AstBuilder, FlatAst, OperationType};
use crate::batch::{SmallBatch, eval_batch};
use crate::engine::eval;
use crate::error::CalcAuyError;
use crate::integrity::VerifiedAst;
use crate::limits::Limits;
use crate::numeric::Rational;

/// Verificador permissivo.
struct AcceptAll;

impl crate::integrity::CustodyVerifier for AcceptAll {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: crate::numeric::RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        Ok(())
    }
}

/// Estratégia de pares `(n, d)` pequenos, não negativos e não nulos.
///
/// O caminho `Small` só representa componentes `u64`; valores negativos caem
/// em `Large` (por construção do racional híbrido).
fn rationals() -> impl Strategy<Value = Vec<Rational>> {
    proptest::collection::vec((0_i64..1000, 1_i64..1000), 0..64).prop_map(|pairs| {
        let limits = Limits::default();
        pairs
            .into_iter()
            .map(|(numerator, denominator)| {
                Rational::new_checked(numerator, denominator, &limits).expect("racional")
            })
            .collect()
    })
}

/// Constrói uma AST de soma sobre literais.
fn sum_ast(values: &[Rational], limits: &Limits) -> FlatAst {
    let mut builder = AstBuilder::with_capacity(limits, values.len().saturating_add(1));
    let operands: Vec<_> = values
        .iter()
        .map(|value| {
            builder
                .literal(value.clone(), value.to_string())
                .expect("literal")
        })
        .collect();
    let root = builder
        .flattened_operation(OperationType::Add, &operands)
        .expect("soma");
    builder.finish(root).expect("árvore")
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(128))]

    #[test]
    fn small_batch_round_trips(values in rationals()) {
        let limits = Limits::default();
        let batch = SmallBatch::from_rationals(&values).expect("small");
        prop_assert_eq!(batch.len(), values.len());
        prop_assert_eq!(batch.to_rationals(&limits).expect("conversão"), values);
    }

    #[test]
    fn tiled_sum_equals_plain(values in rationals(), tile in 1_usize..64) {
        let limits = Limits::default();
        let batch = SmallBatch::from_rationals(&values).expect("small");
        let plain = batch.sum(&limits).expect("soma");
        let tiled = batch.sum_tiled(tile, &limits).expect("soma tiled");
        prop_assert_eq!(tiled, plain);
    }

    #[test]
    fn batch_sum_matches_ast_eval(values in rationals()) {
        let limits = Limits::default();
        let batch = SmallBatch::from_rationals(&values).expect("small");
        let ast = sum_ast(&values, &limits);
        let verified = ast.verify_custody(&AcceptAll, &limits).expect("custódia");
        let evaluated = eval(&verified, &limits).expect("avaliação");
        prop_assert_eq!(batch.sum(&limits).expect("soma"), evaluated);
    }

    #[test]
    fn eval_batch_matches_scalar(values in rationals()) {
        let limits = Limits::default();
        let asts: Vec<VerifiedAst> = values
            .iter()
            .map(|value| {
                let ast = sum_ast(std::slice::from_ref(value), &limits);
                ast.verify_custody(&AcceptAll, &limits).expect("custódia")
            })
            .collect();
        let batched = eval_batch(&asts, &limits);
        prop_assert_eq!(batched.len(), asts.len());
        for (index, result) in batched.iter().enumerate() {
            let scalar = eval(&asts[index], &limits).expect("escalar");
            prop_assert_eq!(result.as_ref().expect("batch"), &scalar);
        }
    }

    #[test]
    fn tree_reduction_is_order_independent(values in rationals()) {
        let mut reversed = values.clone();
        reversed.reverse();
        let batch = SmallBatch::from_rationals(&values).expect("small");
        let reversed_batch = SmallBatch::from_rationals(&reversed).expect("small");
        prop_assert_eq!(
            batch.sum(&Limits::default()).expect("soma"),
            reversed_batch.sum(&Limits::default()).expect("soma")
        );
    }

    #[test]
    fn flat_ast_round_trip(values in rationals()) {
        let limits = Limits::default();
        let batch = SmallBatch::from_rationals(&values).expect("small");
        let ast = batch.to_flat_ast(OperationType::Add, &limits).expect("ast");
        let verified = ast.verify_custody(&AcceptAll, &limits).expect("custódia");
        let evaluated = eval(&verified, &limits).expect("avaliação");
        prop_assert_eq!(batch.sum(&limits).expect("soma"), evaluated);
    }
}
