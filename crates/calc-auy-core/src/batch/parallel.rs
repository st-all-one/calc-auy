//! Avaliação de lotes com paralelismo determinístico (resultados indexados).

use crate::engine::eval;
use crate::error::CalcAuyError;
use crate::integrity::VerifiedAst;
use crate::limits::Limits;
use crate::numeric::Rational;

/// Avalia um lote de ASTs verificadas, preservando a ordem de entrada.
///
/// Sob a feature `parallel`, distribui os cálculos entre threads com `rayon`;
/// o resultado é sempre indexado pela posição de entrada (determinismo,
/// ADR-010), nunca pela ordem de conclusão.
#[must_use]
pub fn eval_batch(asts: &[VerifiedAst], limits: &Limits) -> Vec<Result<Rational, CalcAuyError>> {
    #[cfg(feature = "parallel")]
    {
        use rayon::prelude::{IntoParallelRefIterator, ParallelIterator};
        asts.par_iter().map(|ast| eval(ast, limits)).collect()
    }
    #[cfg(not(feature = "parallel"))]
    {
        asts.iter().map(|ast| eval(ast, limits)).collect()
    }
}
