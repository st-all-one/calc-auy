//! Bindings WASM para o CalcAUY (ADR-012).
//!
//! Expõe a fachada [`calc_auy_api`] ao ecossistema JS (JSR/npm). Números
//! grandes e estruturas (AST, payload assinado) trafegam como `string`/JSON; o
//! núcleo permanece determinístico e sem dependência de threads.
//!
//! O ciclo de vida espelha a fachada: `parse`/`from` produzem um **rascunho**
//! (AST canônica em JSON), `commit` o sela e devolve um **traço de auditoria**
//! assinado, `verify` confere a assinatura e `format`/`monetary`/`scaled`/`json`
//! renderizam a partir do rascunho.

#![allow(
    clippy::disallowed_types,
    clippy::disallowed_macros,
    reason = "a expansão de `#[wasm_bindgen]` usa `Rc` e `panic!` internamente"
)]

use std::collections::BTreeMap;

use calc_auy_api::{
    AuditTrace, CalcAuy, CalcAuyError, Clock, CustodyVerifier, DEFAULT_KEYS, InstanceConfig,
    Locale, OutputOptions, RoundingStrategy, Salt, realizer_for_code,
};
use wasm_bindgen::prelude::{JsValue, wasm_bindgen};

mod clock;

pub use clock::WasmClock;

/// Verificador de custódia baseado em elos registrados pelo host.
///
/// Sem elos registrados, cálculos de contexto único passam (não há nós de
/// controle). Cálculos cross-context exigem `register_context`.
#[derive(Debug, Default)]
struct HostVerifier {
    /// Mapa rótulo → assinatura aceita.
    links: BTreeMap<String, String>,
}

impl CustodyVerifier for HostVerifier {
    fn verify_link(
        &self,
        label: &str,
        signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        match self.links.get(label) {
            Some(expected) if expected == signature => Ok(()),
            _ => Err(CalcAuyError::CustodyViolation {
                reason: format!("elo de custódia não registrado: {label}"),
            }),
        }
    }
}

/// Converte um nome estável de estratégia em [`RoundingStrategy`].
fn parse_strategy(name: &str) -> RoundingStrategy {
    match name {
        "half_up" => RoundingStrategy::HalfUp,
        "half_even" => RoundingStrategy::HalfEven,
        "truncate" => RoundingStrategy::Truncate,
        "ceil" => RoundingStrategy::Ceil,
        "none" => RoundingStrategy::None,
        _ => RoundingStrategy::Nbr5891,
    }
}

/// Serializa um valor para JSON, mapeando falhas para [`CalcAuyError`].
///
/// # Errors
///
/// Retorna [`CalcAuyError::SerializationError`] se a serialização falhar.
fn serialize<T: serde::Serialize>(value: &T) -> Result<String, CalcAuyError> {
    serde_json::to_string(value).map_err(|error| CalcAuyError::SerializationError {
        message: error.to_string(),
    })
}

/// Desserializa JSON, mapeando falhas para [`CalcAuyError`].
///
/// # Errors
///
/// Retorna [`CalcAuyError::InvalidInput`] se o JSON for inválido.
fn deserialize<T: serde::de::DeserializeOwned>(text: &str) -> Result<T, CalcAuyError> {
    serde_json::from_str(text).map_err(|error| CalcAuyError::InvalidInput {
        message: error.to_string(),
    })
}

/// Instância WASM do CalcAUY.
#[wasm_bindgen]
#[derive(Debug)]
pub struct WasmCalc {
    /// Configuração da instância.
    config: InstanceConfig,
    /// Locale de saída.
    locale: Locale,
    /// Relógio do host.
    clock: WasmClock,
    /// Verificador de custódia.
    verifier: HostVerifier,
}

#[wasm_bindgen]
impl WasmCalc {
    /// Cria uma instância.
    ///
    /// `strategy` aceita `nbr5891`, `half_up`, `half_even`, `truncate`, `ceil`
    /// ou `none`; `locale` aceita `pt-BR`, `en-US`, `fr-FR`, `de-DE`, `es-ES`.
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(salt: &str, decimals: u32, strategy: &str, locale: &str) -> Self {
        let config = InstanceConfig::new(Salt::new(salt))
            .with_rounding(parse_strategy(strategy), decimals)
            .with_context_label("wasm");
        Self {
            config,
            locale: Locale::from_code(locale),
            clock: WasmClock::new(),
            verifier: HostVerifier::default(),
        }
    }

    /// Registra a assinatura aceita para um rótulo de contexto anterior.
    pub fn register_context(&mut self, label: &str, signature: &str) {
        self.verifier
            .links
            .insert(label.to_string(), signature.to_string());
    }

    /// Analisa uma expressão e devolve o rascunho (AST canônica em JSON).
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS se a expressão for
    /// inválida ou exceder os limites.
    pub fn parse(&self, expression: &str) -> Result<String, JsValue> {
        self.parse_impl(expression)
            .map_err(|error| self.problem(&error))
    }

    /// Inicia um cálculo a partir de um valor ingerido (ex.: `"2/3"`).
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS se a conversão falhar.
    pub fn from(&self, value: &str) -> Result<String, JsValue> {
        self.ingest_impl(value)
            .map_err(|error| self.problem(&error))
    }

    /// Reabre e normaliza um rascunho hibernado.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS se o JSON for inválido.
    pub fn hydrate(&self, draft_json: &str) -> Result<String, JsValue> {
        self.hydrate_impl(draft_json)
            .map_err(|error| self.problem(&error))
    }

    /// Sela o rascunho e devolve o traço de auditoria assinado (JSON).
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS se a custódia, a avaliação
    /// ou a assinatura falharem.
    pub fn commit(&self, draft_json: &str) -> Result<String, JsValue> {
        self.commit_impl(draft_json)
            .map_err(|error| self.problem(&error))
    }

    /// Confere a assinatura de um traço de auditoria.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS se o JSON for inválido.
    pub fn verify(&self, trace_json: &str) -> Result<bool, JsValue> {
        self.verify_impl(trace_json)
            .map_err(|error| self.problem(&error))
    }

    /// Formata o resultado decimal de um rascunho.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS em caso de falha.
    pub fn format(&self, draft_json: &str, decimals: u32) -> Result<String, JsValue> {
        self.format_impl(draft_json, decimals)
            .map_err(|error| self.problem(&error))
    }

    /// Formata o resultado monetário de um rascunho no locale da instância.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS em caso de falha.
    pub fn monetary(&self, draft_json: &str) -> Result<String, JsValue> {
        self.monetary_impl(draft_json)
            .map_err(|error| self.problem(&error))
    }

    /// Devolve o resultado escalado como inteiro grande em `string`.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS em caso de falha.
    pub fn scaled(&self, draft_json: &str, decimals: u32) -> Result<String, JsValue> {
        self.scaled_impl(draft_json, decimals)
            .map_err(|error| self.problem(&error))
    }

    /// Devolve o resultado como JSON multi-formato no locale da instância.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS em caso de falha.
    pub fn json(&self, draft_json: &str) -> Result<String, JsValue> {
        self.json_impl(draft_json)
            .map_err(|error| self.problem(&error))
    }

    /// Devolve a assinatura (hex) de um rascunho selado.
    ///
    /// # Errors
    ///
    /// Retorna o problema (RFC 7807) como objeto JS em caso de falha.
    pub fn signature(&self, draft_json: &str) -> Result<String, JsValue> {
        self.signature_impl(draft_json)
            .map_err(|error| self.problem(&error))
    }

    /// Retorna o tempo do host em RFC 3339.
    #[must_use]
    pub fn now_rfc3339(&self) -> String {
        self.clock.now_rfc3339()
    }

    /// Retorna o tempo do host em milissegundos desde a época.
    #[must_use]
    pub fn now_millis(&self) -> u64 {
        self.clock.now_millis()
    }
}

impl WasmCalc {
    /// Cria uma instância da fachada com a configuração atual.
    fn app(&self) -> CalcAuy {
        CalcAuy::new(self.config.clone())
    }

    /// Implementação de `parse`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn parse_impl(&self, expression: &str) -> Result<String, CalcAuyError> {
        self.app().parse(expression)?.hibernate()
    }

    /// Implementação de `from`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn ingest_impl(&self, value: &str) -> Result<String, CalcAuyError> {
        self.app().from(value)?.hibernate()
    }

    /// Implementação de `hydrate`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn hydrate_impl(&self, draft_json: &str) -> Result<String, CalcAuyError> {
        self.app().hydrate(draft_json)?.hibernate()
    }

    /// Implementação de `commit`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn commit_impl(&self, draft_json: &str) -> Result<String, CalcAuyError> {
        let app = self.app();
        let committed = app.hydrate(draft_json)?.commit(&self.verifier)?;
        let mut trace = AuditTrace::new(committed.payload().clone());
        trace.commit(self.config.salt());
        serialize(&trace)
    }

    /// Implementação de `verify`.
    ///
    /// # Errors
    ///
    /// Retorna erro se o JSON for inválido.
    fn verify_impl(&self, trace_json: &str) -> Result<bool, CalcAuyError> {
        let trace: AuditTrace = deserialize(trace_json)?;
        Ok(trace.verify(self.config.salt()).is_ok())
    }

    /// Sela e verifica um rascunho, devolvendo o resultado já renderizado.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn render(
        &self,
        draft_json: &str,
        options: OutputOptions,
        render: impl FnOnce(calc_auy_api::Output<'_>) -> String,
    ) -> Result<String, CalcAuyError> {
        let app = self.app();
        let verified = app
            .hydrate(draft_json)?
            .commit(&self.verifier)?
            .verify(&self.verifier)?;
        Ok(render(verified.output(options)))
    }

    /// Implementação de `format`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn format_impl(&self, draft_json: &str, decimals: u32) -> Result<String, CalcAuyError> {
        let options = OutputOptions::new()
            .with_locale(self.locale)
            .with_decimals(decimals);
        self.render(draft_json, options, |output| output.to_string_decimal())
    }

    /// Implementação de `monetary`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn monetary_impl(&self, draft_json: &str) -> Result<String, CalcAuyError> {
        let options = OutputOptions::new().with_locale(self.locale);
        self.render(draft_json, options, |output| output.to_monetary())
    }

    /// Implementação de `scaled`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn scaled_impl(&self, draft_json: &str, decimals: u32) -> Result<String, CalcAuyError> {
        let options = OutputOptions::new().with_decimals(decimals);
        self.render(draft_json, options, |output| {
            output.to_scaled_bigint(decimals).to_string()
        })
    }

    /// Implementação de `json`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn json_impl(&self, draft_json: &str) -> Result<String, CalcAuyError> {
        let options = OutputOptions::new().with_locale(self.locale);
        let app = self.app();
        let verified = app
            .hydrate(draft_json)?
            .commit(&self.verifier)?
            .verify(&self.verifier)?;
        let realizer = realizer_for_code(self.locale.code());
        verified
            .output(options)
            .to_json_formats(DEFAULT_KEYS, realizer.as_ref())
    }

    /// Implementação de `signature`.
    ///
    /// # Errors
    ///
    /// Propaga o erro da fachada.
    fn signature_impl(&self, draft_json: &str) -> Result<String, CalcAuyError> {
        let app = self.app();
        let committed = app.hydrate(draft_json)?.commit(&self.verifier)?;
        Ok(committed.signature().hex())
    }

    /// Converte um erro em objeto JS de problema (RFC 7807).
    fn problem(&self, error: &CalcAuyError) -> JsValue {
        let problem = error.to_problem_details(&self.clock);
        serde_wasm_bindgen::to_value(&problem)
            .unwrap_or_else(|_| JsValue::from_str(&error.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Cria uma instância de teste.
    fn calc() -> WasmCalc {
        WasmCalc::new("sal", 2, "nbr5891", "pt-BR")
    }

    #[test]
    fn parse_commit_verify_roundtrip() {
        let calc = calc();
        let draft = calc.parse_impl("1 + 2 * 3").expect("parse");
        let trace = calc.commit_impl(&draft).expect("commit");
        assert!(calc.verify_impl(&trace).expect("verify"));
    }

    #[test]
    fn tampered_trace_is_rejected() {
        use calc_auy_api::Rational;

        let calc = calc();
        let draft = calc.parse_impl("1 + 2").expect("parse");
        let trace = calc.commit_impl(&draft).expect("commit");
        let mut parsed: AuditTrace = deserialize(&trace).expect("trace");
        parsed.payload.final_result = Rational::from_i64(999);
        let tampered = serialize(&parsed).expect("serialize");
        assert!(!calc.verify_impl(&tampered).expect("verify"));
    }

    #[test]
    fn hydrate_is_stable() {
        let calc = calc();
        let draft = calc.parse_impl("10000 * (1 + 14.75%) ^ 3").expect("parse");
        let again = calc.hydrate_impl(&draft).expect("hydrate");
        assert_eq!(draft, again);
    }

    #[test]
    fn format_and_monetary() {
        let calc = calc();
        let draft = calc.parse_impl("10000 * (1 + 14.75%) ^ 3").expect("parse");
        assert_eq!(calc.format_impl(&draft, 2).expect("format"), "15109.78");
        assert_eq!(
            calc.monetary_impl(&draft).expect("monetary"),
            "R$\u{00a0}15.109,78"
        );
        assert_eq!(calc.scaled_impl(&draft, 2).expect("scaled"), "1510978");
    }

    #[test]
    fn json_output_lists_representations() {
        let calc = calc();
        let draft = calc.parse_impl("1 + 2").expect("parse");
        let json = calc.json_impl(&draft).expect("json");
        assert!(json.contains("\"decimal\":\"3.00\""), "json: {json}");
        assert!(json.contains("\"signature\":"), "json: {json}");
    }

    #[test]
    fn from_ingests_rational_text() {
        let calc = calc();
        let draft = calc.ingest_impl("2/3").expect("from");
        assert_eq!(calc.format_impl(&draft, 2).expect("format"), "0.67");
    }

    #[test]
    fn signature_is_deterministic() {
        let calc = calc();
        let draft = calc.parse_impl("7 * 6").expect("parse");
        let first = calc.signature_impl(&draft).expect("signature");
        let second = calc.signature_impl(&draft).expect("signature");
        assert_eq!(first, second);
        assert_eq!(first.len(), 64);
    }

    #[test]
    fn unregistered_cross_context_is_rejected() {
        let verifier = HostVerifier::default();
        let result = verifier.verify_link("outro", "abc", RoundingStrategy::Nbr5891);
        assert!(result.is_err());
    }

    #[test]
    fn registered_cross_context_is_accepted() {
        let mut calc = calc();
        calc.register_context("outro", "abc");
        let result = calc
            .verifier
            .verify_link("outro", "abc", RoundingStrategy::Nbr5891);
        assert!(result.is_ok());
    }

    #[test]
    fn clock_is_available() {
        let calc = calc();
        assert_eq!(calc.now_millis(), 0);
        assert!(calc.now_rfc3339().starts_with("2024-01-01T00:"));
    }
}
