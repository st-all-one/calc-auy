//! Modelo de erro RFC 7807 (Problem Details).
//!
//! Todos os erros do CalcAUY são convertidos em [`ProblemDetails`] para
//! respostas HTTP padronizadas.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use thiserror::Error;
use uuid::Uuid;

use crate::clock::Clock;
use crate::meta_value::MetaValue;

/// Tipos de limite que podem ser excedidos.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LimitKind {
    /// Limite de bits em números grandes.
    MaxBits,
    /// Limite de profundidade da AST.
    MaxDepth,
    /// Limite de nós na AST.
    MaxNodes,
    /// Limite de operandos por operação.
    MaxOperands,
    /// Limite de bytes em metadata.
    MaxMetadataBytes,
    /// Limites customizados inválidos.
    CustomLimits,
}

/// Erros do CalcAUY.
#[derive(Debug, Error)]
pub enum CalcAuyError {
    /// Tentativa de divisão por zero.
    #[error("divisão por zero")]
    DivisionByZero,

    /// Operação produz resultado irracional (raiz não exata).
    #[error("resultado irracional: {base}^{exp}")]
    IrrationalResult {
        /// Base da operação.
        base: String,
        /// Expoente da operação.
        exp: String,
    },

    /// Resultado excede o limite de bits configurado.
    #[error("overflow matemático: {actual} bits excede limite de {max_bits}")]
    MathOverflow {
        /// Limite máximo de bits.
        max_bits: u64,
        /// Número de bits atual.
        actual: u64,
    },

    /// Limite de recurso excedido.
    #[error("limite excedido: {kind:?} (limite: {limit}, atual: {actual})")]
    LimitExceeded {
        /// Tipo de limite excedido.
        kind: LimitKind,
        /// Valor do limite.
        limit: u64,
        /// Valor atual.
        actual: u64,
    },

    /// Assinatura não corresponde ao conteúdo.
    #[error("violação de integridade: esperado {expected}, recebido {received}")]
    IntegrityViolation {
        /// Valor esperado.
        expected: String,
        /// Valor recebido.
        received: String,
    },

    /// Cadeia de custódia inválida.
    #[error("custódia inválida: {reason}")]
    CustodyViolation {
        /// Motivo da violação.
        reason: String,
    },

    /// Entrada inválida fornecida pelo usuário.
    #[error("entrada inválida: {message}")]
    InvalidInput {
        /// Mensagem de erro.
        message: String,
    },

    /// Erro de parsing de expressão.
    #[error("parse error: {message}")]
    ParseError {
        /// Mensagem de erro.
        message: String,
    },

    /// Erro de serialização/desserialização.
    #[error("serialização: {message}")]
    SerializationError {
        /// Mensagem de erro.
        message: String,
    },
}

/// Problem Details conforme RFC 7807.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ProblemDetails {
    /// URI estável do tipo de erro.
    pub r#type: String,
    /// Título legível do erro.
    pub title: String,
    /// Código de status HTTP.
    pub status: u16,
    /// Detalhe específico da ocorrência.
    pub detail: String,
    /// Identificador único da instância do erro.
    pub instance: Uuid,
    /// Contexto adicional do erro.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub context: BTreeMap<String, MetaValue>,
}

impl ProblemDetails {
    /// Cria um novo `ProblemDetails` com o relógio fornecido.
    #[must_use]
    pub fn new(error_type: &str, title: &str, status: u16, detail: &str, instance: Uuid) -> Self {
        Self {
            r#type: error_type.to_string(),
            title: title.to_string(),
            status,
            detail: detail.to_string(),
            instance,
            context: BTreeMap::new(),
        }
    }

    /// Adiciona contexto ao problema.
    #[must_use]
    pub fn with_context(mut self, key: &str, value: MetaValue) -> Self {
        self.context.insert(key.to_string(), value);
        self
    }
}

impl CalcAuyError {
    /// Converte o erro em `ProblemDetails` usando o relógio fornecido.
    #[must_use]
    pub fn to_problem_details(&self, clock: &dyn Clock) -> ProblemDetails {
        let instance = clock.next_uuid_v7();
        match self {
            Self::DivisionByZero => Self::division_by_zero(instance),
            Self::IrrationalResult { base, exp } => Self::irrational_result(base, exp, instance),
            Self::MathOverflow { max_bits, actual } => {
                Self::math_overflow(*max_bits, *actual, instance)
            }
            Self::LimitExceeded {
                kind,
                limit,
                actual,
            } => Self::limit_exceeded(*kind, *limit, *actual, instance),
            Self::IntegrityViolation { expected, received } => {
                Self::integrity_violation(expected, received, instance)
            }
            Self::CustodyViolation { reason } => Self::custody_violation(reason, instance),
            Self::InvalidInput { message } => Self::invalid_input(message, instance),
            Self::ParseError { message } => Self::parse_error(message, instance),
            Self::SerializationError { message } => Self::serialization_error(message, instance),
        }
    }

    fn division_by_zero(instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/division-by-zero",
            "Divisão por zero",
            400,
            "A operação tentou dividir por zero.",
            instance,
        )
    }

    fn irrational_result(base: &str, exp: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/irrational-result",
            "Resultado irracional",
            400,
            &format!("A operação {base}^{exp} produz um resultado irracional."),
            instance,
        )
        .with_context("base", MetaValue::Str(base.to_string()))
        .with_context("exp", MetaValue::Str(exp.to_string()))
    }

    fn math_overflow(max_bits: u64, actual: u64, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/math-overflow",
            "Overflow matemático",
            400,
            &format!("O resultado excede o limite de {max_bits} bits."),
            instance,
        )
        .with_context("max_bits", MetaValue::Uint(max_bits))
        .with_context("actual", MetaValue::Uint(actual))
    }

    fn limit_exceeded(kind: LimitKind, limit: u64, actual: u64, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/limit-exceeded",
            "Limite excedido",
            400,
            &format!("Limite {kind:?} excedido: {actual} > {limit}."),
            instance,
        )
        .with_context("kind", MetaValue::Str(format!("{kind:?}")))
        .with_context("limit", MetaValue::Uint(limit))
        .with_context("actual", MetaValue::Uint(actual))
    }

    fn integrity_violation(expected: &str, received: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/integrity-violation",
            "Violação de integridade",
            400,
            "A assinatura não corresponde ao conteúdo.",
            instance,
        )
        .with_context("expected", MetaValue::Str(expected.to_string()))
        .with_context("received", MetaValue::Str(received.to_string()))
    }

    fn custody_violation(reason: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/custody-violation",
            "Custódia inválida",
            400,
            reason,
            instance,
        )
    }

    fn invalid_input(message: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/invalid-input",
            "Entrada inválida",
            400,
            message,
            instance,
        )
    }

    fn parse_error(message: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/parse-error",
            "Erro de parsing",
            400,
            message,
            instance,
        )
    }

    fn serialization_error(message: &str, instance: Uuid) -> ProblemDetails {
        ProblemDetails::new(
            "https://calc-auy.dev/errors/serialization-error",
            "Erro de serialização",
            500,
            message,
            instance,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clock::MockClock;

    #[test]
    fn division_by_zero_maps_to_problem() {
        let clock = MockClock::new();
        let err = CalcAuyError::DivisionByZero;
        let problem = err.to_problem_details(&clock);

        assert_eq!(problem.status, 400);
        assert!(problem.r#type.contains("division-by-zero"));
        assert_eq!(problem.title, "Divisão por zero");
    }

    #[test]
    fn limit_exceeded_maps_to_problem() {
        let clock = MockClock::new();
        let err = CalcAuyError::LimitExceeded {
            kind: LimitKind::MaxBits,
            limit: 1000,
            actual: 2000,
        };
        let problem = err.to_problem_details(&clock);

        assert_eq!(problem.status, 400);
        assert!(problem.r#type.contains("limit-exceeded"));
        assert!(problem.context.contains_key("limit"));
        assert!(problem.context.contains_key("actual"));
    }

    #[test]
    fn instance_is_deterministic_with_mock_clock() {
        let clock = MockClock::new();
        let err = CalcAuyError::DivisionByZero;

        let problem1 = err.to_problem_details(&clock);
        let problem2 = err.to_problem_details(&clock);

        // UUIDs são diferentes (incrementais)
        assert_ne!(problem1.instance, problem2.instance);
    }
}
