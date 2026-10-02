//! Elos de custódia usados em `cross_context_add`.

use calc_auy_core::{Rational, RoundingStrategy};

/// Referência a um contexto anterior já selado.
///
/// Carrega o valor a ser combinado e os campos de custódia necessários para a
/// verificação do elo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContextLink {
    /// Rótulo do contexto anterior.
    pub label: Box<str>,
    /// Assinatura do resultado anterior.
    pub signature: Box<str>,
    /// Estratégia de arredondamento usada no contexto anterior.
    pub round_strategy: RoundingStrategy,
    /// Valor do resultado anterior.
    pub value: Rational,
}

impl ContextLink {
    /// Cria um elo com a estratégia de arredondamento padrão (`Nbr5891`).
    #[must_use]
    pub fn new(
        label: impl Into<Box<str>>,
        signature: impl Into<Box<str>>,
        value: Rational,
    ) -> Self {
        Self {
            label: label.into(),
            signature: signature.into(),
            round_strategy: RoundingStrategy::Nbr5891,
            value,
        }
    }

    /// Define a estratégia de arredondamento do elo.
    #[must_use]
    pub const fn with_rounding(mut self, strategy: RoundingStrategy) -> Self {
        self.round_strategy = strategy;
        self
    }
}
