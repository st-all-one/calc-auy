//! Exemplo executável da fachada pública.
//!
//! Rode com: `cargo run -p calc-auy-api --example quickstart`.
#![allow(clippy::print_stdout, reason = "exemplo executável")]

use calc_auy_api::{
    CalcAuy, CalcAuyError, CustodyVerifier, InstanceConfig, OutputOptions, RoundingStrategy, Salt,
};

/// Verificador permissivo para o exemplo.
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

/// Executa o exemplo.
///
/// # Errors
///
/// Retorna erro de domínio se a expressão ou o *commit* falharem.
fn main() -> Result<(), CalcAuyError> {
    let app = CalcAuy::new(
        InstanceConfig::new(Salt::new("demo")).with_rounding(RoundingStrategy::Nbr5891, 2),
    );
    let committed = app.parse("10000 * (1 + 14.75%) ^ 3")?.commit(&AcceptAll)?;
    let output = committed.output(OutputOptions::new());
    println!("decimal:  {}", output.to_string_decimal());
    println!("monetário: {}", output.to_monetary());
    println!("latex:    {}", output.to_latex());
    println!("assinatura: {}", committed.signature().hex());
    Ok(())
}
