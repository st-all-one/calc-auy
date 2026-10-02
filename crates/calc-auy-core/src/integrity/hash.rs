//! Hashes de conteúdo por subárvore.
//!
//! - [`value_hash`] ignora metadados → chave de memoização/dedup.
//! - [`trace_hash`] inclui metadados → chave de integridade.

use crate::ast::FlatAst;

use super::digest::Digest;

/// Calcula o hash canônico **sem** metadados de uma árvore.
#[must_use]
pub fn value_hash(ast: &FlatAst) -> Digest {
    let mut canonical = Vec::new();
    ast.write_canonical_value(&mut canonical);
    Digest::from_bytes(*blake3::hash(&canonical).as_bytes())
}

/// Calcula o hash canônico **com** metadados de uma árvore.
#[must_use]
pub fn trace_hash(ast: &FlatAst) -> Digest {
    let mut canonical = Vec::new();
    ast.write_canonical_trace(&mut canonical);
    Digest::from_bytes(*blake3::hash(&canonical).as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::{AstBuilder, OperationType};
    use crate::limits::Limits;
    use crate::meta_value::MetaValue;
    use crate::numeric::Rational;

    fn ast_with_metadata(metadata: Option<&str>) -> FlatAst {
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
            .expect("soma");
        if let Some(value) = metadata {
            builder
                .insert_metadata(one, "ref", MetaValue::Str(value.to_string()))
                .expect("metadata");
        }
        builder.finish(sum).expect("árvore")
    }

    #[test]
    fn value_hash_ignores_metadata() {
        let without = ast_with_metadata(None);
        let with = ast_with_metadata(Some("SELIC"));
        assert_eq!(value_hash(&without), value_hash(&with));
        assert_ne!(trace_hash(&without), trace_hash(&with));
    }

    #[test]
    fn hashes_are_deterministic() {
        let ast = ast_with_metadata(Some("SELIC"));
        assert_eq!(value_hash(&ast), value_hash(&ast));
        assert_eq!(trace_hash(&ast), trace_hash(&ast));
    }
}
