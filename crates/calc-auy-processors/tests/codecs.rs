//! Testes de roundtrip, determinismo, conformidade e limites dos codecs.

use calc_auy_core::{
    AstBuilder, CalcAuyError, CustodyVerifier, Limits, MetaValue, Metadata, OperationType,
    Rational, RoundingStrategy, Salt, SignaturePayload, commit,
};
use calc_auy_parser::parse;
use calc_auy_processors::Format;

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

/// Sela uma AST já construída.
fn seal(ast: calc_auy_core::FlatAst, round: RoundingStrategy) -> SignaturePayload {
    let limits = Limits::default();
    let verified = ast.verify_custody(&AcceptAll, &limits).expect("custódia");
    commit(verified, round, 2, &Salt::new("sal"), &limits)
        .expect("commit")
        .payload()
        .clone()
}

/// Payload de exemplo (expressão composta).
fn sample_payload() -> SignaturePayload {
    let limits = Limits::default();
    let ast = parse("10000 * (1 + 14.75%) ^ 3", &limits).expect("parse");
    seal(ast, RoundingStrategy::Nbr5891)
}

/// Payload com metadata aninhada.
fn payload_with_metadata() -> SignaturePayload {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let one = builder
        .literal(Rational::from_i64(1), "1")
        .expect("literal");
    let two = builder
        .literal(Rational::from_i64(2), "2")
        .expect("literal");
    let sum = builder
        .operation(OperationType::Add, &[one, two])
        .expect("op");
    let mut metadata = Metadata::new();
    metadata.insert("autor".into(), MetaValue::Str("ana".into()));
    metadata.insert("revisao".into(), MetaValue::Int(3));
    metadata.insert(
        "tags".into(),
        MetaValue::Array(vec![MetaValue::Str("a".into()), MetaValue::Null]),
    );
    metadata.insert(
        "extra".into(),
        MetaValue::Object(std::collections::BTreeMap::from([(
            "peso".to_string(),
            MetaValue::Int(-2),
        )])),
    );
    builder.set_metadata(sum, metadata).expect("metadata");
    let ast = builder.finish(sum).expect("finish");
    seal(ast, RoundingStrategy::HalfEven)
}

/// Payload com nó de controle (custódia).
fn payload_with_control() -> SignaturePayload {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let one = builder
        .literal(Rational::from_i64(7), "7")
        .expect("literal");
    let control = builder
        .control(one, "ctx", "assinatura", RoundingStrategy::Ceil)
        .expect("controle");
    let ast = builder.finish(control).expect("finish");
    seal(ast, RoundingStrategy::Nbr5891)
}

/// Todos os formatos.
const FORMATS: [Format; 4] = [
    Format::Json,
    Format::Cbor,
    Format::MsgPack,
    Format::Protobuf,
];

#[test]
fn roundtrip_all_formats() {
    let limits = Limits::default();
    for payload in [
        sample_payload(),
        payload_with_metadata(),
        payload_with_control(),
    ] {
        for format in FORMATS {
            let bytes = format.encode(&payload).expect("encode");
            let decoded = format.decode(&bytes, &limits).expect("decode");
            assert_eq!(decoded, payload, "formato {}", format.as_str());
        }
    }
}

#[test]
fn encoding_is_deterministic() {
    let payload = sample_payload();
    for format in FORMATS {
        let first = format.encode(&payload).expect("encode");
        let second = format.encode(&payload).expect("encode");
        assert_eq!(first, second, "formato {}", format.as_str());
    }
}

#[test]
fn cross_format_conformance() {
    let limits = Limits::default();
    let payload = sample_payload();
    let canonical = Format::Json
        .decode(&Format::Json.encode(&payload).expect("json"), &limits)
        .expect("json");
    for format in FORMATS {
        let bytes = format.encode(&payload).expect("encode");
        let decoded = format.decode(&bytes, &limits).expect("decode");
        assert_eq!(decoded, canonical, "formato {}", format.as_str());
    }
}

#[test]
fn limits_are_enforced_on_decode() {
    let payload = sample_payload();
    let bytes = Format::Cbor.encode(&payload).expect("encode");
    let tiny = Limits::new(1_000_000, 500, 1, 100, 16_384).expect("limites");
    assert!(Format::Cbor.decode(&bytes, &tiny).is_err());
}

#[test]
fn protobuf_rejects_missing_required_fields() {
    // Mensagem vazia: sem `ast` nem `final_result`.
    assert!(Format::Protobuf.decode(&[], &Limits::default()).is_err());
}

#[test]
fn format_codes_roundtrip() {
    for format in FORMATS {
        assert_eq!(Format::from_code(format.as_str()), Some(format));
    }
    assert_eq!(Format::from_code("desconhecido"), None);
}

#[test]
fn golden_bytes_are_stable() {
    let payload = sample_payload();
    for format in FORMATS {
        let bytes = format.encode(&payload).expect("encode");
        let hex = to_hex(&bytes);
        let path = format!("tests/golden/{}.hex", format.as_str());
        if std::env::var("UPDATE_GOLDEN").is_ok() {
            std::fs::create_dir_all("tests/golden").expect("criar tests/golden");
            std::fs::write(&path, format!("{hex}\n")).expect("escrever golden");
        } else {
            let expected = std::fs::read_to_string(&path).unwrap_or_default();
            assert_eq!(hex, expected.trim(), "golden divergente: {path}");
        }
    }
}

/// Codifica bytes em hexadecimal minúsculo.
fn to_hex(bytes: &[u8]) -> String {
    use std::fmt::Write as _;
    let mut out = String::with_capacity(bytes.len().saturating_mul(2));
    for byte in bytes {
        let _ = write!(out, "{byte:02x}");
    }
    out
}

#[test]
fn unsigned_normalizes_to_signed_across_codecs() {
    let limits = Limits::default();
    let mut builder = AstBuilder::new(&limits);
    let one = builder
        .literal(Rational::from_i64(1), "1")
        .expect("literal");
    let mut metadata = Metadata::new();
    metadata.insert("n".into(), MetaValue::Uint(3));
    metadata.insert("grande".into(), MetaValue::Uint(u64::MAX));
    builder.set_metadata(one, metadata).expect("metadata");
    let ast = builder.finish(one).expect("finish");
    let payload = seal(ast, RoundingStrategy::Nbr5891);
    for format in FORMATS {
        let bytes = format.encode(&payload).expect("encode");
        let decoded = format.decode(&bytes, &limits).expect("decode");
        let metadata = decoded.ast.metadata(decoded.ast.root()).expect("metadata");
        assert_eq!(metadata.get("n"), Some(&MetaValue::Int(3)));
        assert_eq!(metadata.get("grande"), Some(&MetaValue::Uint(u64::MAX)));
    }
}
