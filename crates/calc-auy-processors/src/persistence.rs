//! Processador de persistência denormalizada (SQL/Prisma).
//!
//! Porta `_REF/processor/persistence/processor.persistence.ts`: achata o rastro
//! selado em colunas prontas para inserção, mantendo a AST *wire* recursiva.

use calc_auy_core::{CalcAuyError, SignaturePayload};
use calc_auy_output::{OutputContext, OutputProcessor};
use serde::{Deserialize, Serialize};

use crate::wire::{WireNode, WirePayload};

/// Registro de persistência denormalizado.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PersistenceRecord {
    /// Assinatura (hex).
    pub signature: String,
    /// Rótulo de contexto.
    pub context_label: String,
    /// Estratégia de arredondamento (identificador estável `snake_case`).
    pub round_strategy: String,
    /// Numerador do resultado.
    pub result_numerator: String,
    /// Denominador do resultado.
    pub result_denominator: String,
    /// Árvore de cálculo na forma *wire* recursiva.
    pub ast: WireNode,
}

impl PersistenceRecord {
    /// Projeta um payload selado em um registro de persistência.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::InvalidInput`] se um `NodeId` for inválido.
    pub fn from_payload(
        payload: &SignaturePayload,
        context_label: &str,
        signature: &str,
    ) -> Result<Self, CalcAuyError> {
        let wire = WirePayload::from_signature(payload)?;
        Ok(Self {
            signature: signature.to_string(),
            context_label: context_label.to_string(),
            round_strategy: payload.round_strategy.as_str().to_string(),
            result_numerator: payload.final_result.numerator(),
            result_denominator: payload.final_result.denominator(),
            ast: wire.ast,
        })
    }
}

/// Processador de saída que produz um [`PersistenceRecord`].
#[derive(Debug, Clone, Copy, Default)]
pub struct PersistenceProcessor;

impl OutputProcessor for PersistenceProcessor {
    type Output = Result<PersistenceRecord, CalcAuyError>;
    type Options = ();

    fn process(&self, context: &OutputContext<'_, '_, ()>) -> Self::Output {
        let output = context.output;
        let committed = output.committed();
        let context_label = output.options().context_label.as_deref().unwrap_or("");
        PersistenceRecord::from_payload(
            committed.payload(),
            context_label,
            &committed.signature().hex(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wire::WireNode;
    use calc_auy_core::{
        AstBuilder, CustodyVerifier, Limits, Rational, RoundingStrategy, TraceVersion,
    };

    #[test]
    fn record_round_trips_through_json() {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let literal = builder
            .literal(Rational::from_i64(42), "42")
            .expect("literal");
        let ast = builder.finish(literal).expect("ast");
        let verified = ast.verify_custody(&AcceptAll, &limits).expect("custody");
        let payload = SignaturePayload::new(
            verified.into_inner(),
            Rational::from_i64(42),
            RoundingStrategy::HalfUp,
            TraceVersion::V1,
        );
        let record = PersistenceRecord::from_payload(&payload, "db-test", "sig").expect("record");
        assert_eq!(record.context_label, "db-test");
        assert_eq!(record.round_strategy, "half_up");
        assert_eq!(record.result_numerator, "42");
        assert_eq!(record.result_denominator, "1");
        assert!(matches!(record.ast, WireNode::Literal { .. }));
        let json = serde_json::to_string(&record).expect("json");
        assert!(json.contains("\"context_label\":\"db-test\""));
    }

    /// Verificador permissivo.
    struct AcceptAll;

    impl CustodyVerifier for AcceptAll {
        fn verify_link(
            &self,
            _label: &str,
            _signature: &str,
            _round: RoundingStrategy,
        ) -> Result<(), CalcAuyError> {
            Ok(())
        }
    }
}
