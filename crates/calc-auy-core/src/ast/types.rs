//! Tipos fundamentais da AST: identificadores, operações e metadados.

use std::collections::BTreeMap;
use std::num::NonZeroU32;

use serde::{Deserialize, Serialize};

use crate::meta_value::MetaValue;

/// Metadados de auditoria associados a um nó.
///
/// Chaves ordenadas (`BTreeMap`) garantem serialização determinística.
pub type Metadata = BTreeMap<Box<str>, MetaValue>;

/// Identificador de nó na arena [`crate::ast::FlatAst`].
///
/// Guarda `índice + 1` em um [`NonZeroU32`], de modo que `Option<NodeId>`
/// ocupa apenas 4 bytes (aproveitando o *niche* do valor zero).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct NodeId(NonZeroU32);

impl NodeId {
    /// Cria um `NodeId` a partir de um índice baseado em zero.
    #[must_use]
    pub fn from_index(index: usize) -> Option<Self> {
        let raw = u32::try_from(index).ok()?.checked_add(1)?;
        NonZeroU32::new(raw).map(Self)
    }

    /// Retorna o índice baseado em zero na arena.
    #[must_use]
    pub fn index(self) -> usize {
        usize::try_from(self.0.get())
            .unwrap_or(usize::MAX)
            .saturating_sub(1)
    }

    /// Retorna o valor cru (`índice + 1`).
    #[must_use]
    pub const fn get(self) -> u32 {
        self.0.get()
    }
}

/// Tipos de operações matemáticas suportadas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[non_exhaustive]
pub enum OperationType {
    /// Adição.
    Add,
    /// Subtração.
    Sub,
    /// Multiplicação.
    Mul,
    /// Divisão exata.
    Div,
    /// Potenciação.
    Pow,
    /// Resto da divisão.
    Mod,
    /// Divisão inteira.
    DivInt,
    /// Adição entre contextos (custódia).
    CrossContextAdd,
}

impl OperationType {
    /// Retorna `true` se a operação é associativa.
    ///
    /// Apenas operações associativas podem ser agrupadas pelo *flattening*
    /// hierárquico sem alterar o resultado.
    #[must_use]
    pub const fn is_associative(self) -> bool {
        matches!(self, Self::Add | Self::Mul | Self::CrossContextAdd)
    }

    /// Retorna `true` se a operação é comutativa.
    #[must_use]
    pub const fn is_commutative(self) -> bool {
        matches!(self, Self::Add | Self::Mul | Self::CrossContextAdd)
    }

    /// Retorna a precedência da operação (maior = liga mais forte).
    #[must_use]
    pub const fn precedence(self) -> u8 {
        match self {
            Self::Pow => 2,
            Self::Mul | Self::Div | Self::DivInt | Self::Mod => 3,
            Self::Add | Self::Sub | Self::CrossContextAdd => 4,
        }
    }

    /// Retorna `true` se a operação associa à direita.
    #[must_use]
    pub const fn is_right_associative(self) -> bool {
        matches!(self, Self::Pow)
    }

    /// Retorna o nome estável em `snake_case`.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Sub => "sub",
            Self::Mul => "mul",
            Self::Div => "div",
            Self::Pow => "pow",
            Self::Mod => "mod",
            Self::DivInt => "div_int",
            Self::CrossContextAdd => "cross_context_add",
        }
    }
}

/// Calcula o tamanho total em bytes de um mapa de metadados.
#[must_use]
pub fn metadata_size_bytes(metadata: &Metadata) -> usize {
    metadata
        .iter()
        .map(|(key, value)| key.len().saturating_add(value.size_bytes()))
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_id_has_niche() {
        assert_eq!(size_of::<Option<NodeId>>(), 4);
        assert_eq!(size_of::<NodeId>(), 4);
    }

    #[test]
    fn node_id_index_round_trip() {
        for index in [0_usize, 1, 41, 1_000_000] {
            let id = NodeId::from_index(index).expect("índice válido");
            assert_eq!(id.index(), index);
            assert_eq!(id.get(), u32::try_from(index).expect("cabe em u32") + 1);
        }
    }

    #[test]
    fn node_id_rejects_overflow() {
        assert!(NodeId::from_index(usize::MAX).is_none());
    }

    #[test]
    fn operation_associativity() {
        assert!(OperationType::Add.is_associative());
        assert!(OperationType::Mul.is_associative());
        assert!(!OperationType::Sub.is_associative());
        assert!(!OperationType::Div.is_associative());
        assert!(OperationType::Pow.is_right_associative());
    }

    #[test]
    fn operation_serde_snake_case() {
        let json = serde_json::to_string(&OperationType::CrossContextAdd).expect("serializa");
        assert_eq!(json, "\"cross_context_add\"");
        let parsed: OperationType = serde_json::from_str(&json).expect("desserializa");
        assert_eq!(parsed, OperationType::CrossContextAdd);
    }
}
