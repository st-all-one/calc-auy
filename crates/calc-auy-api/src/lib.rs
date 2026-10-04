//! Fachada pública única do CalcAUY.
//!
//! Reexporta a superfície de todos os crates internos e oferece [`CalcAuy`],
//! o ponto de entrada com configuração de instância. A ingestão é feita via
//! [`IntoRational`], que **não** aceita `f64`.

#[allow(
    clippy::wildcard_imports,
    reason = "a fachada reexporta intencionalmente toda a superfície do núcleo"
)]
pub use calc_auy_core::*;
// Reexportações explícitas têm precedência sobre o *glob* acima; `Committed`
// aqui é o estado do typestate, não o resultado do motor.
pub use calc_auy_builder::{
    Calculation, Committed, ContextLink, Draft, InstanceConfig, IntoRational, State, Verified,
};
pub use calc_auy_i18n::{Language, PtBrRealizer, realizer, realizer_for_code};
pub use calc_auy_nlg::{Srl, SrlNode, VerbalRealizer};
pub use calc_auy_output::{
    Currency, CurrencyPosition, DEFAULT_KEYS, Locale, LocaleData, MermaidTerms, Output,
    OutputContext, OutputKey, OutputOptions, OutputProcessor, Sensitivity,
};
#[cfg(feature = "render")]
pub use calc_auy_output::{
    HtmlOptions, KATEX_CSS, PngBackground, PngOptions, RenderError, Rgb, SvgOptions,
};

/// Instância configurada do CalcAUY.
///
/// Guarda a [`InstanceConfig`] e cria cálculos que a tomam emprestada.
///
/// # Examples
///
/// ```
/// use calc_auy_api::{CalcAuy, InstanceConfig};
/// use calc_auy_core::Salt;
///
/// let app = CalcAuy::new(InstanceConfig::new(Salt::new("demo")));
/// let _draft = app.parse("1 + 2 * 3").unwrap();
/// ```
#[derive(Debug, Clone)]
pub struct CalcAuy {
    /// Configuração da instância.
    config: InstanceConfig,
}

impl CalcAuy {
    /// Cria uma instância a partir de uma configuração.
    #[must_use]
    pub const fn new(config: InstanceConfig) -> Self {
        Self { config }
    }

    /// Retorna a configuração.
    #[must_use]
    pub const fn config(&self) -> &InstanceConfig {
        &self.config
    }

    /// Inicia um cálculo a partir de um valor ingerido.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    pub fn from(&self, value: impl IntoRational) -> Result<Calculation<'_, Draft>, CalcAuyError> {
        Calculation::from(&self.config, value)
    }

    /// Inicia um cálculo a partir de uma expressão textual.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a expressão for inválida ou exceder os
    /// limites.
    pub fn parse(&self, expression: &str) -> Result<Calculation<'_, Draft>, CalcAuyError> {
        let ast = calc_auy_parser::parse(expression, self.config.limits())?;
        Ok(Calculation::from_flat_ast(&self.config, ast))
    }

    /// Reabre um cálculo previamente hibernado.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se o JSON for inválido ou exceder os limites.
    pub fn hydrate(&self, json: &str) -> Result<Calculation<'_, Draft>, CalcAuyError> {
        Calculation::hydrate(&self.config, json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use calc_auy_core::{CustodyVerifier, Rational, RoundingStrategy, Salt};

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
    fn facade_parses_and_commits() {
        let config =
            InstanceConfig::new(Salt::new("sal")).with_rounding(RoundingStrategy::Nbr5891, 2);
        let app = CalcAuy::new(config);
        let committed = app
            .parse("10000 * (1 + 0.1475)")
            .expect("parse")
            .commit(&AcceptAll)
            .expect("commit");
        assert_eq!(
            committed.result(),
            &Rational::new_checked(11475, 1, &Limits::default()).expect("racional")
        );
    }

    #[test]
    fn facade_ingests_without_f64() {
        let app = CalcAuy::new(InstanceConfig::new(Salt::new("sal")));
        let committed = app
            .from("2/3")
            .expect("from")
            .commit(&AcceptAll)
            .expect("commit");
        assert_eq!(
            committed.result(),
            &Rational::new_checked(67, 100, &Limits::default()).expect("racional")
        );
    }

    #[test]
    fn facade_outputs_after_verification() {
        let config =
            InstanceConfig::new(Salt::new("sal")).with_rounding(RoundingStrategy::Nbr5891, 2);
        let app = CalcAuy::new(config);
        let verified = app
            .parse("10000 * (1 + 14.75%) ^ 3")
            .expect("parse")
            .commit(&AcceptAll)
            .expect("commit")
            .verify(&AcceptAll)
            .expect("verify");
        let output = verified.output(OutputOptions::new().with_locale(Locale::PtBr));
        assert_eq!(output.to_string_decimal(), "15109.78");
        assert_eq!(output.to_monetary(), "R$\u{00a0}15.109,78");
    }
}
