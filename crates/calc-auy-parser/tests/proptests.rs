//! Fuzz do parser e diferencial de literais contra a referência exata (T05.4).

use calc_auy_core::numeric::parse::parse_rational;
use calc_auy_core::{CustodyVerifier, Limits, Rational, RoundingStrategy, eval};
use calc_auy_parser::parse;
use proptest::prelude::*;

/// Verificador permissivo.
struct AcceptAll;

impl CustodyVerifier for AcceptAll {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), calc_auy_core::CalcAuyError> {
        Ok(())
    }
}

/// Analisa e avalia uma expressão, retornando a mensagem de erro em caso de falha.
fn eval_expression(input: &str) -> Result<Rational, String> {
    let limits = Limits::default();
    let ast = parse(input, &limits).map_err(|error| error.to_string())?;
    let verified = ast
        .verify_custody(&AcceptAll, &limits)
        .map_err(|error| error.to_string())?;
    eval(&verified, &limits).map_err(|error| error.to_string())
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]

    #[test]
    fn parser_never_panics(input in ".{0,64}") {
        let limits = Limits::default();
        drop(parse(&input, &limits));
    }

    #[test]
    fn decimal_literal_matches_reference(integer in -1_000_000_i64..1_000_000, fraction in 0_u32..1000) {
        let text = format!("{integer}.{fraction}");
        let parsed = eval_expression(&text);
        let reference = parse_rational(&text, &Limits::default());
        match (parsed, reference) {
            (Ok(parsed), Ok(reference)) => prop_assert_eq!(parsed, reference),
            (Err(_), Err(_)) => {}
            (parsed, reference) => prop_assert!(false, "divergência para {text}: {parsed:?} vs {reference:?}"),
        }
    }

    #[test]
    fn integer_literal_matches_reference(value in -1_000_000_000_i64..1_000_000_000) {
        let text = value.to_string();
        let parsed = eval_expression(&text);
        let reference = parse_rational(&text, &Limits::default());
        prop_assert_eq!(parsed.expect("inteiro válido"), reference.expect("inteiro válido"));
    }
}
