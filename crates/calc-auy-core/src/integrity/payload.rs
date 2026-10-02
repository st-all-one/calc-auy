//! Payload assinável, versão de traço e envelope de auditoria.

use std::num::NonZeroU16;

use serde::{Deserialize, Serialize};

use crate::ast::FlatAst;
use crate::canonical::Canonical;
use crate::error::CalcAuyError;
use crate::numeric::{Rational, RoundingStrategy};

use super::digest::Digest;
use super::salt::Salt;
use super::sign::{sign, verify};

/// Versão do schema de traço (`trace_version`), sempre não nula.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TraceVersion(NonZeroU16);

impl TraceVersion {
    /// Versão 1.
    pub const V1: Self = Self(NonZeroU16::MIN);

    /// Cria uma versão a partir de um inteiro, se não nulo.
    #[must_use]
    pub const fn new(value: u16) -> Option<Self> {
        match NonZeroU16::new(value) {
            Some(value) => Some(Self(value)),
            None => None,
        }
    }

    /// Retorna o valor numérico.
    #[must_use]
    pub const fn get(self) -> u16 {
        self.0.get()
    }
}

impl Canonical for TraceVersion {
    fn write_canonical(&self, out: &mut Vec<u8>) {
        self.get().write_canonical(out);
    }
}

/// Conteúdo assinado (v1): AST, resultado, estratégia e versão.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, calc_auy_macros::Canonical)]
pub struct SignaturePayload {
    /// Árvore de cálculo.
    pub ast: FlatAst,
    /// Resultado final.
    pub final_result: Rational,
    /// Estratégia de arredondamento.
    pub round_strategy: RoundingStrategy,
    /// Versão do schema.
    pub trace_version: TraceVersion,
}

impl SignaturePayload {
    /// Cria um payload v1.
    #[must_use]
    pub const fn new(
        ast: FlatAst,
        final_result: Rational,
        round_strategy: RoundingStrategy,
        trace_version: TraceVersion,
    ) -> Self {
        Self {
            ast,
            final_result,
            round_strategy,
            trace_version,
        }
    }

    /// Retorna os bytes canônicos do payload.
    #[must_use]
    pub fn canonical_bytes(&self) -> Vec<u8> {
        let mut out = Vec::new();
        self.write_canonical(&mut out);
        out
    }

    /// Assina o payload com o sal fornecido.
    #[must_use]
    pub fn sign(&self, salt: &Salt) -> Digest {
        sign(&self.canonical_bytes(), salt)
    }
}

/// Payload v2: acrescenta o elo anterior do log Merkle.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, calc_auy_macros::Canonical)]
pub struct SignaturePayloadV2 {
    /// Árvore de cálculo.
    pub ast: FlatAst,
    /// Resultado final.
    pub final_result: Rational,
    /// Digest do commit anterior (`None` = raiz).
    pub previous: Option<Digest>,
    /// Estratégia de arredondamento.
    pub round_strategy: RoundingStrategy,
    /// Versão do schema.
    pub trace_version: TraceVersion,
}

impl SignaturePayloadV2 {
    /// Migra um payload v1 para v2, encadeando o elo anterior.
    #[must_use]
    pub fn from_v1(previous_payload: SignaturePayload, previous: Option<Digest>) -> Self {
        Self {
            ast: previous_payload.ast,
            final_result: previous_payload.final_result,
            previous,
            round_strategy: previous_payload.round_strategy,
            trace_version: TraceVersion::new(2).unwrap_or(TraceVersion::V1),
        }
    }

    /// Retorna os bytes canônicos do payload.
    #[must_use]
    pub fn canonical_bytes(&self) -> Vec<u8> {
        let mut out = Vec::new();
        self.write_canonical(&mut out);
        out
    }

    /// Assina o payload com o sal fornecido.
    #[must_use]
    pub fn sign(&self, salt: &Salt) -> Digest {
        sign(&self.canonical_bytes(), salt)
    }
}

/// Envelope de auditoria: payload assinado + assinatura opcional.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuditTrace {
    /// Conteúdo assinado.
    pub payload: SignaturePayload,
    /// Assinatura (ausente antes do *commit*).
    pub signature: Option<Digest>,
}

impl AuditTrace {
    /// Cria um envelope ainda não assinado.
    #[must_use]
    pub const fn new(payload: SignaturePayload) -> Self {
        Self {
            payload,
            signature: None,
        }
    }

    /// Assina o payload e armazena a assinatura.
    pub fn commit(&mut self, salt: &Salt) {
        self.signature = Some(self.payload.sign(salt));
    }

    /// Verifica a assinatura do envelope.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::CustodyViolation`] se a assinatura estiver
    /// ausente ou [`CalcAuyError::IntegrityViolation`] se não conferir.
    pub fn verify(&self, salt: &Salt) -> Result<(), CalcAuyError> {
        let signature = self
            .signature
            .as_ref()
            .ok_or_else(|| CalcAuyError::CustodyViolation {
                reason: "assinatura ausente".to_string(),
            })?;
        verify(&self.payload.canonical_bytes(), salt, signature)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::{AstBuilder, OperationType};
    use crate::limits::Limits;

    fn sample_payload() -> SignaturePayload {
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
        let ast = builder.finish(sum).expect("árvore");
        SignaturePayload::new(
            ast,
            Rational::from_i64(3),
            RoundingStrategy::Nbr5891,
            TraceVersion::V1,
        )
    }

    #[test]
    fn trace_version_is_non_zero() {
        assert_eq!(TraceVersion::V1.get(), 1);
        assert!(TraceVersion::new(0).is_none());
        assert_eq!(TraceVersion::new(2).map(TraceVersion::get), Some(2));
    }

    #[test]
    fn payload_round_trip_requires_version() {
        let payload = sample_payload();
        let json = serde_json::to_string(&payload).expect("serializa");
        let parsed: SignaturePayload = serde_json::from_str(&json).expect("desserializa");
        assert_eq!(payload, parsed);

        let without_version = json.replace("\"trace_version\":1", "\"trace_version\":null");
        assert!(serde_json::from_str::<SignaturePayload>(&without_version).is_err());
    }

    #[test]
    fn commit_and_verify() {
        let salt = Salt::new("sal");
        let mut trace = AuditTrace::new(sample_payload());
        assert!(trace.verify(&salt).is_err());
        trace.commit(&salt);
        assert!(trace.verify(&salt).is_ok());
    }

    #[test]
    fn tampering_breaks_signature() {
        let salt = Salt::new("sal");
        let mut trace = AuditTrace::new(sample_payload());
        trace.commit(&salt);
        trace.payload.final_result = Rational::from_i64(999);
        assert!(trace.verify(&salt).is_err());
    }

    #[test]
    fn v1_to_v2_migration_sets_version_and_link() {
        let payload = sample_payload();
        let previous = payload.sign(&Salt::new("sal"));
        let migrated = SignaturePayloadV2::from_v1(payload, Some(previous));
        assert_eq!(migrated.trace_version.get(), 2);
        assert_eq!(migrated.previous, Some(previous));
    }
}
