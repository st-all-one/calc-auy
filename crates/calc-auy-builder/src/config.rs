//! Configuração de instância e estados do ciclo de vida.

use calc_auy_core::{Encoder, Limits, RoundingStrategy, Salt};

/// Configuração de uma instância de cálculo.
///
/// Reúne sal, codificação, estratégia de arredondamento, precisão, limites e
/// rótulo de contexto. É imutável: os métodos `with_*` consomem e devolvem uma
/// nova configuração.
#[derive(Debug, Clone)]
pub struct InstanceConfig {
    /// Limites aplicados.
    limits: Limits,
    /// Sal de assinatura.
    salt: Salt,
    /// Codificação de digests.
    encoder: Encoder,
    /// Estratégia de arredondamento padrão.
    round_strategy: RoundingStrategy,
    /// Número de casas decimais padrão.
    decimals: u32,
    /// Rótulo do contexto atual.
    context_label: Box<str>,
    /// Assinatura do contexto anterior (para custódia).
    context_signature: Box<str>,
}

impl InstanceConfig {
    /// Cria uma configuração com padrões sensatos.
    #[must_use]
    pub fn new(salt: Salt) -> Self {
        Self {
            limits: Limits::default(),
            salt,
            encoder: Encoder::Hex,
            round_strategy: RoundingStrategy::Nbr5891,
            decimals: 2,
            context_label: Box::from("default"),
            context_signature: Box::from("uncommitted"),
        }
    }

    /// Define os limites.
    #[must_use]
    pub const fn with_limits(mut self, limits: Limits) -> Self {
        self.limits = limits;
        self
    }

    /// Define a codificação de digests.
    #[must_use]
    pub const fn with_encoder(mut self, encoder: Encoder) -> Self {
        self.encoder = encoder;
        self
    }

    /// Define a estratégia de arredondamento e a precisão.
    #[must_use]
    pub const fn with_rounding(mut self, strategy: RoundingStrategy, decimals: u32) -> Self {
        self.round_strategy = strategy;
        self.decimals = decimals;
        self
    }

    /// Define o rótulo do contexto atual.
    #[must_use]
    pub fn with_context_label(mut self, label: impl Into<Box<str>>) -> Self {
        self.context_label = label.into();
        self
    }

    /// Define a assinatura do contexto anterior.
    #[must_use]
    pub fn with_context_signature(mut self, signature: impl Into<Box<str>>) -> Self {
        self.context_signature = signature.into();
        self
    }

    /// Retorna os limites.
    #[must_use]
    pub const fn limits(&self) -> &Limits {
        &self.limits
    }

    /// Retorna o sal.
    #[must_use]
    pub const fn salt(&self) -> &Salt {
        &self.salt
    }

    /// Retorna a codificação de digests.
    #[must_use]
    pub const fn encoder(&self) -> Encoder {
        self.encoder
    }

    /// Retorna a estratégia de arredondamento.
    #[must_use]
    pub const fn round_strategy(&self) -> RoundingStrategy {
        self.round_strategy
    }

    /// Retorna o número de casas decimais.
    #[must_use]
    pub const fn decimals(&self) -> u32 {
        self.decimals
    }

    /// Retorna o rótulo do contexto atual.
    #[must_use]
    pub fn context_label(&self) -> &str {
        &self.context_label
    }

    /// Retorna a assinatura do contexto anterior.
    #[must_use]
    pub fn context_signature(&self) -> &str {
        &self.context_signature
    }
}
