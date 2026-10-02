//! Teste end-to-end do ciclo de vida (T06.6).

use calc_auy_builder::{Calculation, ContextLink, InstanceConfig};
use calc_auy_core::{CalcAuyError, CustodyVerifier, Limits, Rational, RoundingStrategy, Salt};

/// Verificador permissivo para os testes.
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

/// Verificador que só aceita o rótulo "finance".
struct OnlyFinance;

impl CustodyVerifier for OnlyFinance {
    fn verify_link(
        &self,
        label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        if label == "finance" {
            Ok(())
        } else {
            Err(CalcAuyError::CustodyViolation {
                reason: format!("rótulo rejeitado: {label}"),
            })
        }
    }
}

fn config() -> InstanceConfig {
    InstanceConfig::new(Salt::new("sal-de-teste"))
        .with_rounding(RoundingStrategy::Nbr5891, 2)
        .with_context_label("finance")
}

#[test]
fn build_commit_verify_and_hydrate() {
    let config = config();
    let draft = Calculation::from(&config, 10_000_i64)
        .expect("literal")
        .mul("0.1475")
        .expect("multiplicação");

    let json = draft.hibernate().expect("hiberna");
    let reopened = Calculation::hydrate(&config, &json).expect("hidrata");

    let committed = reopened.commit(&AcceptAll).expect("commit");
    assert_eq!(
        committed.result(),
        &Rational::new_checked(1_475, 1, &Limits::default()).expect("racional")
    );
    assert!(committed.committed().verify(config.salt()).is_ok());

    let verified = committed.verify(&AcceptAll).expect("verificação");
    assert_eq!(verified.result(), verified.committed().result());
    assert_eq!(verified.signature(), verified.committed().signature());
}

#[test]
fn tampering_is_rejected() {
    let config = config();
    let committed = Calculation::from(&config, 2_i64)
        .expect("literal")
        .add(2)
        .expect("soma")
        .commit(&AcceptAll)
        .expect("commit");
    assert!(committed.committed().verify(&Salt::new("outro")).is_err());
}

#[test]
fn cross_context_add_requires_verifiable_links() {
    let config = config();
    let link = ContextLink::new("finance", "sig-anterior", Rational::from_i64(5));
    let draft = Calculation::from(&config, 10_i64)
        .expect("literal")
        .cross_context_add(&[link])
        .expect("cross-context");
    let committed = draft.commit(&OnlyFinance).expect("commit");
    assert_eq!(committed.result(), &Rational::from_i64(15), "10 + 5 = 15");
}

#[test]
fn cross_context_add_rejects_bad_link() {
    let config = config();
    let link = ContextLink::new("marketing", "sig", Rational::from_i64(5));
    let draft = Calculation::from(&config, 10_i64)
        .expect("literal")
        .cross_context_add(&[link])
        .expect("cross-context");
    assert!(draft.commit(&OnlyFinance).is_err());
}

#[test]
fn metadata_round_trips_through_hibernate() {
    let config = config();
    let draft = Calculation::from(&config, 1_i64)
        .expect("literal")
        .set_metadata("nota", calc_auy_core::MetaValue::Str("venda".to_string()))
        .expect("metadata");
    let json = draft.hibernate().expect("hiberna");
    assert!(json.contains("nota"));
    let reopened = Calculation::hydrate(&config, &json).expect("hidrata");
    let committed = reopened.commit(&AcceptAll).expect("commit");
    assert_eq!(committed.result(), &Rational::ONE);
}
