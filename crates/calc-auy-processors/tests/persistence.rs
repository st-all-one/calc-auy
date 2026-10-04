//! Teste de integração do processador de persistência via `to_custom_output`.

use calc_auy_core::{CalcAuyError, CustodyVerifier, Limits, RoundingStrategy, Salt, commit};
use calc_auy_i18n::PtBrRealizer;
use calc_auy_output::{Output, OutputOptions};
use calc_auy_parser::parse;
use calc_auy_processors::persistence::{PersistenceProcessor, PersistenceRecord};

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

#[test]
fn persistence_processor_projects_committed_value() {
    let limits = Limits::default();
    let ast = parse("100 * 1.5 + 50", &limits).expect("parse");
    let verified = ast.verify_custody(&AcceptAll, &limits).expect("custody");
    let committed = commit(
        verified,
        RoundingStrategy::HalfUp,
        2,
        &Salt::new("sal"),
        &limits,
    )
    .expect("commit");

    let options = OutputOptions::new().with_context_label("db-test");
    let output = Output::new(&committed, options);
    let record: Result<PersistenceRecord, CalcAuyError> =
        output.to_custom_output(&PersistenceProcessor, (), &PtBrRealizer::new());
    let record = record.expect("record");
    assert_eq!(record.context_label, "db-test");
    assert_eq!(record.round_strategy, "half_up");
    assert_eq!(record.result_numerator, "200");
    assert_eq!(record.result_denominator, "1");
    assert_eq!(record.signature.len(), 64);
    assert!(matches!(
        record.ast,
        calc_auy_processors::WireNode::Operation { .. }
    ));
}
