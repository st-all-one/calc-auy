//! Corpus de conformidade (T13.1): especificação executável por regra.
//!
//! Os vetores vivem em `tests/corpus/vectors.json` e são exercitados contra a
//! fachada pública. A regra `canonical` guarda o digest BLAKE3 do *trace*; use
//! `CORPUS_UPDATE=1` para regenerá-lo.

use calc_auy_api::{
    CalcAuy, CalcAuyError, ContextLink, CustodyVerifier, InstanceConfig, Limits, OutputOptions,
    Rational, RoundingStrategy, Salt, trace_hash,
};

const CORPUS: &str = include_str!("corpus/vectors.json");

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

/// Verificador que rejeita qualquer elo.
struct RejectAll;

impl CustodyVerifier for RejectAll {
    fn verify_link(
        &self,
        _label: &str,
        _signature: &str,
        _round: RoundingStrategy,
    ) -> Result<(), CalcAuyError> {
        Err(CalcAuyError::CustodyViolation {
            reason: "rejeitado pelo corpus".to_string(),
        })
    }
}

/// Converte o nome da estratégia de arredondamento.
fn rounding(name: &str) -> RoundingStrategy {
    match name {
        "half_up" => RoundingStrategy::HalfUp,
        "half_even" => RoundingStrategy::HalfEven,
        "truncate" => RoundingStrategy::Truncate,
        "ceil" => RoundingStrategy::Ceil,
        "none" => RoundingStrategy::None,
        _ => RoundingStrategy::Nbr5891,
    }
}

/// Cria uma instância com limites e arredondamento.
fn app(limits: Limits, strategy: RoundingStrategy, decimals: u32) -> CalcAuy {
    CalcAuy::new(
        InstanceConfig::new(Salt::new("corpus"))
            .with_limits(limits)
            .with_rounding(strategy, decimals),
    )
}

/// Sela uma expressão e devolve o decimal formatado.
fn render(app: &CalcAuy, expr: &str, decimals: u32) -> Result<String, CalcAuyError> {
    let committed = app.parse(expr)?.commit(&AcceptAll)?;
    Ok(committed
        .output(OutputOptions::new().with_decimals(decimals))
        .to_string_decimal())
}

/// Sela uma expressão e devolve o digest canônico do *trace*.
fn digest(app: &CalcAuy, expr: &str) -> Result<String, CalcAuyError> {
    let committed = app.parse(expr)?.commit(&AcceptAll)?;
    Ok(trace_hash(&committed.payload().ast).hex())
}

/// Carrega o corpus.
fn corpus() -> serde_json::Value {
    serde_json::from_str(CORPUS).expect("corpus JSON válido")
}

/// Lê um campo textual.
fn str_field<'a>(vector: &'a serde_json::Value, key: &str) -> &'a str {
    vector
        .get(key)
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
}

/// Lê um campo `u32`.
fn u32_field(vector: &serde_json::Value, key: &str) -> Option<u32> {
    vector
        .get(key)
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| u32::try_from(value).ok())
}

/// Lê um campo `usize`.
fn usize_field(vector: &serde_json::Value, key: &str) -> Option<usize> {
    vector
        .get(key)
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
}

/// Retorna uma seção do corpus.
fn section(name: &str) -> Vec<serde_json::Value> {
    corpus()
        .get(name)
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default()
}

#[test]
fn corpus_arithmetic() {
    for vector in section("arithmetic") {
        let expr = str_field(&vector, "expr");
        let decimals = u32_field(&vector, "decimals").unwrap_or(2);
        let expected = str_field(&vector, "result");
        let instance = app(Limits::default(), RoundingStrategy::Nbr5891, decimals);
        let actual = render(&instance, expr, decimals).expect("cálculo");
        assert_eq!(actual, expected, "aritmética: {expr}");
    }
}

#[test]
fn corpus_rounding() {
    for vector in section("rounding") {
        let expr = str_field(&vector, "expr");
        let decimals = u32_field(&vector, "decimals").unwrap_or(2);
        let strategy = rounding(str_field(&vector, "rounding"));
        let expected = str_field(&vector, "result");
        let instance = app(Limits::default(), strategy, decimals);
        let actual = render(&instance, expr, decimals).expect("cálculo");
        assert_eq!(actual, expected, "arredondamento {strategy:?}: {expr}");
    }
}

#[test]
fn corpus_pow() {
    for vector in section("pow") {
        let expr = str_field(&vector, "expr");
        let decimals = u32_field(&vector, "decimals").unwrap_or(2);
        let instance = app(Limits::default(), RoundingStrategy::Nbr5891, decimals);
        match vector.get("error").and_then(serde_json::Value::as_str) {
            Some(expected) => {
                let error = render(&instance, expr, decimals).expect_err("deveria falhar");
                assert!(
                    format!("{error:?}").starts_with(expected),
                    "pow {expr}: {error:?}"
                );
            }
            None => {
                let expected = str_field(&vector, "result");
                let actual = render(&instance, expr, decimals).expect("cálculo");
                assert_eq!(actual, expected, "pow: {expr}");
            }
        }
    }
}

#[test]
fn corpus_limits() {
    for vector in section("limits") {
        let expr = str_field(&vector, "expr");
        let limits = Limits::new(
            1_000_000,
            usize_field(&vector, "max_depth").unwrap_or(500),
            usize_field(&vector, "max_nodes").unwrap_or(1000),
            100,
            16_384,
        )
        .expect("limites válidos");
        let instance = app(limits, RoundingStrategy::Nbr5891, 2);
        let expected = str_field(&vector, "error");
        let error = render(&instance, expr, 2).expect_err("deveria exceder");
        assert!(
            format!("{error:?}").starts_with(expected),
            "limites {expr}: {error:?}"
        );
    }
}

#[test]
fn corpus_canonical() {
    let mut root = corpus();
    let update = std::env::var("CORPUS_UPDATE").is_ok();
    let entries = root
        .get("canonical")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();
    let instance = app(Limits::default(), RoundingStrategy::Nbr5891, 2);
    let mut changed = false;
    for (index, vector) in entries.iter().enumerate() {
        let expr = str_field(vector, "expr");
        let actual = digest(&instance, expr).expect("digest");
        if update {
            if let Some(slot) = root
                .get_mut("canonical")
                .and_then(|value| value.get_mut(index))
                .and_then(|value| value.get_mut("digest"))
            {
                *slot = serde_json::Value::String(actual);
                changed = true;
            }
        } else {
            let expected = str_field(vector, "digest");
            assert_eq!(actual, expected, "canonical: {expr}");
        }
    }
    if changed {
        let text = serde_json::to_string_pretty(&root).expect("serializar") + "\n";
        std::fs::write("tests/corpus/vectors.json", text).expect("escrever corpus");
    }
}

#[test]
fn corpus_div_int_and_custody() {
    let instance = app(Limits::default(), RoundingStrategy::Nbr5891, 2);

    // Divisão inteira via builder (não há token `//`).
    let committed = instance
        .from("10")
        .expect("from")
        .div_int("3")
        .expect("div_int")
        .commit(&AcceptAll)
        .expect("commit");
    assert_eq!(committed.result(), &Rational::from_i64(3));

    // Custódia: permissivo aceita; restritivo rejeita o elo.
    let link = ContextLink::new("ctx", "assinatura", Rational::from_i64(5));
    let accepted = instance
        .from("10")
        .expect("from")
        .cross_context_add(&[link.clone()])
        .expect("cross")
        .commit(&AcceptAll);
    assert!(accepted.is_ok());
    let rejected = instance
        .from("10")
        .expect("from")
        .cross_context_add(&[link])
        .expect("cross")
        .commit(&RejectAll);
    assert!(matches!(
        rejected,
        Err(CalcAuyError::CustodyViolation { .. })
    ));
}
