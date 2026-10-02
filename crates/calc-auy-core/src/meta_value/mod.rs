//! Valor de metadata sem `f64`.
//!
//! Este tipo é a prevenção estrutural do bug A7 e do risco A3:
//! ao remover `f64` do domínio assinado, a canonicalização de números
//! deixa de ser ambígua e o tipo se torna `Eq + Hash`.

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeMap;

/// Valor permitido em metadata.
///
/// **Não existe variante de ponto flutuante.** Isso torna a canonicalização
/// trivial, determinística e `Eq + Hash`. Decimais devem ser representados
/// como string (ex.: "14.75") ou racional.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum MetaValue {
    /// Valor nulo.
    Null,
    /// Booleano.
    Bool(bool),
    /// Inteiro com sinal.
    Int(i64),
    /// Inteiro sem sinal.
    Uint(u64),
    /// String.
    Str(String),
    /// Array de valores.
    Array(Vec<Self>),
    /// Objeto com chaves ordenadas.
    Object(BTreeMap<String, Self>),
}

impl MetaValue {
    /// Retorna `true` se o valor é nulo.
    #[must_use]
    pub const fn is_null(&self) -> bool {
        matches!(self, Self::Null)
    }

    /// Retorna `true` se o valor é um booleano.
    #[must_use]
    pub const fn is_bool(&self) -> bool {
        matches!(self, Self::Bool(_))
    }

    /// Retorna `true` se o valor é um inteiro.
    #[must_use]
    pub const fn is_int(&self) -> bool {
        matches!(self, Self::Int(_) | Self::Uint(_))
    }

    /// Retorna `true` se o valor é uma string.
    #[must_use]
    pub const fn is_str(&self) -> bool {
        matches!(self, Self::Str(_))
    }

    /// Retorna `true` se o valor é um array.
    #[must_use]
    pub const fn is_array(&self) -> bool {
        matches!(self, Self::Array(_))
    }

    /// Retorna `true` se o valor é um objeto.
    #[must_use]
    pub const fn is_object(&self) -> bool {
        matches!(self, Self::Object(_))
    }

    /// Retorna o tamanho em bytes do valor (para limites).
    #[must_use]
    pub fn size_bytes(&self) -> usize {
        match self {
            Self::Null | Self::Bool(_) => 1,
            Self::Int(_) | Self::Uint(_) => 8,
            Self::Str(s) => s.len(),
            Self::Array(arr) => arr
                .iter()
                .map(Self::size_bytes)
                .sum::<usize>()
                .saturating_add(8),
            Self::Object(map) => map
                .iter()
                .map(|(k, v)| k.len().saturating_add(v.size_bytes()))
                .sum::<usize>()
                .saturating_add(8),
        }
    }

    /// Retorna o número de nós (para limites de profundidade).
    #[must_use]
    pub fn node_count(&self) -> usize {
        match self {
            Self::Array(arr) => {
                1_usize.saturating_add(arr.iter().map(Self::node_count).sum::<usize>())
            }
            Self::Object(map) => {
                1_usize.saturating_add(map.values().map(Self::node_count).sum::<usize>())
            }
            _ => 1,
        }
    }

    /// Retorna a profundidade máxima (para limites).
    #[must_use]
    pub fn depth(&self) -> usize {
        match self {
            Self::Array(arr) => {
                1_usize.saturating_add(arr.iter().map(Self::depth).max().unwrap_or(0))
            }
            Self::Object(map) => {
                1_usize.saturating_add(map.values().map(Self::depth).max().unwrap_or(0))
            }
            _ => 1,
        }
    }
}

impl From<bool> for MetaValue {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}

impl From<i64> for MetaValue {
    fn from(value: i64) -> Self {
        Self::Int(value)
    }
}

impl From<u64> for MetaValue {
    fn from(value: u64) -> Self {
        Self::Uint(value)
    }
}

impl From<String> for MetaValue {
    fn from(value: String) -> Self {
        Self::Str(value)
    }
}

impl From<&str> for MetaValue {
    fn from(value: &str) -> Self {
        Self::Str(value.to_string())
    }
}

impl Serialize for MetaValue {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Null => serializer.serialize_unit(),
            Self::Bool(b) => serializer.serialize_bool(*b),
            Self::Int(i) => serializer.serialize_i64(*i),
            Self::Uint(u) => serializer.serialize_u64(*u),
            Self::Str(s) => serializer.serialize_str(s),
            Self::Array(arr) => arr.serialize(serializer),
            Self::Object(map) => map.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for MetaValue {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        use serde::de::Error;

        // Usa serde_json::Value como intermediário, mas rejeita f64
        let value = serde_json::Value::deserialize(deserializer)?;
        Self::from_json_value(&value).map_err(D::Error::custom)
    }
}

impl MetaValue {
    /// Converte um número JSON em `MetaValue`, rejeitando `f64`.
    ///
    /// # Errors
    ///
    /// Retorna erro se o valor for `f64`.
    fn number_from_json(n: &serde_json::Number) -> Result<Self, String> {
        n.as_i64().map_or_else(
            || {
                n.as_u64().map_or_else(
                    || Err("f64 não é suportado em MetaValue".to_string()),
                    |u| Ok(Self::Uint(u)),
                )
            },
            |i| Ok(Self::Int(i)),
        )
    }

    /// Converte um `serde_json::Value` em `MetaValue`, rejeitando `f64`.
    ///
    /// # Errors
    ///
    /// Retorna erro se o valor contiver `f64` ou tipo não suportado.
    fn from_json_value(value: &serde_json::Value) -> Result<Self, String> {
        match value {
            serde_json::Value::Null => Ok(Self::Null),
            serde_json::Value::Bool(b) => Ok(Self::Bool(*b)),
            serde_json::Value::Number(n) => Self::number_from_json(n),
            serde_json::Value::String(s) => Ok(Self::Str(s.clone())),
            serde_json::Value::Array(arr) => {
                let result: Result<Vec<_>, _> = arr.iter().map(Self::from_json_value).collect();
                result.map(Self::Array)
            }
            serde_json::Value::Object(map) => {
                let result: Result<BTreeMap<_, _>, _> = map
                    .iter()
                    .map(|(k, v)| Self::from_json_value(v).map(|v| (k.clone(), v)))
                    .collect();
                result.map(Self::Object)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meta_value_is_eq_and_hash() {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let v1 = MetaValue::Str("test".to_string());
        let v2 = MetaValue::Str("test".to_string());

        assert_eq!(v1, v2);

        let mut hasher1 = DefaultHasher::new();
        let mut hasher2 = DefaultHasher::new();
        v1.hash(&mut hasher1);
        v2.hash(&mut hasher2);
        assert_eq!(hasher1.finish(), hasher2.finish());
    }

    #[test]
    fn meta_value_rejects_f64() {
        let json = r#"{"value": 3.14}"#;
        let result: Result<MetaValue, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn meta_value_accepts_valid_types() {
        let json = r#"{"int": 42, "str": "hello", "bool": true, "null": null}"#;
        let result: Result<MetaValue, _> = serde_json::from_str(json);
        assert!(result.is_ok());
    }

    #[test]
    fn meta_value_size_bytes() {
        let v = MetaValue::Str("hello".to_string());
        assert_eq!(v.size_bytes(), 5);

        let v = MetaValue::Array(vec![MetaValue::Int(1), MetaValue::Int(2)]);
        assert_eq!(v.size_bytes(), 24); // 8 (array) + 8 (int) + 8 (int)
    }

    #[test]
    fn meta_value_depth() {
        let v = MetaValue::Array(vec![
            MetaValue::Int(1),
            MetaValue::Array(vec![MetaValue::Int(2)]),
        ]);
        assert_eq!(v.depth(), 3);
    }
}
