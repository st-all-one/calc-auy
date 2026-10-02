//! Testes de robustez (substituto de fuzz) do desserializador e canonicalizador.
//!
//! `cargo-fuzz` e `cargo miri` não estão disponíveis no toolchain pinado; estes
//! testes alimentam entradas arbitrárias e garantem ausência de *panic*.

use proptest::prelude::*;

use crate::ast::FlatAst;
use crate::canonical::Canonical;
use crate::limits::Limits;
use crate::meta_value::MetaValue;

/// Estratégia para árvores de `MetaValue`.
fn any_meta() -> impl Strategy<Value = MetaValue> {
    let leaf = prop_oneof![
        Just(MetaValue::Null),
        any::<bool>().prop_map(MetaValue::Bool),
        any::<i64>().prop_map(MetaValue::Int),
        any::<u64>().prop_map(MetaValue::Uint),
        ".{0,16}".prop_map(MetaValue::Str),
    ];
    leaf.prop_recursive(4, 32, 8, |inner| {
        prop_oneof![
            prop::collection::vec(inner.clone(), 0..4).prop_map(MetaValue::Array),
            prop::collection::btree_map(".{0,8}", inner, 0..4).prop_map(MetaValue::Object),
        ]
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]

    #[test]
    fn ast_deserializer_never_panics(bytes in prop::collection::vec(any::<u8>(), 0..4096)) {
        let limits = Limits::default();
        drop(FlatAst::from_json_slice(&bytes, &limits));
    }

    #[test]
    fn meta_deserializer_never_panics(text in ".{0,512}") {
        drop(serde_json::from_str::<MetaValue>(&text));
    }

    #[test]
    fn canonical_output_is_valid_json(value in any_meta()) {
        let mut out = Vec::new();
        value.write_canonical(&mut out);
        let parsed: serde_json::Value = serde_json::from_slice(&out).expect("JSON canônico válido");
        prop_assert!(parsed.is_null() || parsed.is_boolean() || parsed.is_number() || parsed.is_string() || parsed.is_array() || parsed.is_object());
    }
}
