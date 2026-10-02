//! Limites de segurança e recursos.
//!
//! Os limites são aplicados como invariantes de construtor e desserializador,
//! garantindo que nenhum payload hostil possa causar `DoS`.

use crate::error::{CalcAuyError, LimitKind};

/// Limites de segurança para operações do CalcAUY.
///
/// Estes limites previnem ataques de negação de serviço por meio de
/// payloads maliciosos ou expressões excessivamente complexas.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(clippy::struct_field_names)]
pub struct Limits {
    /// Máximo de bits em números grandes (1.000.000).
    pub max_bits: u64,
    /// Profundidade máxima da AST (500).
    pub max_depth: usize,
    /// Número máximo de nós na AST (1000).
    pub max_nodes: usize,
    /// Número máximo de operandos por operação (100).
    pub max_operands: usize,
    /// Tamanho máximo de metadata em bytes (16384).
    pub max_metadata_bytes: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self::default()
    }
}

impl Limits {
    /// Cria limites com valores padrão do documento 11.
    #[must_use]
    pub const fn default() -> Self {
        Self {
            max_bits: 1_000_000,
            max_depth: 500,
            max_nodes: 1000,
            max_operands: 100,
            max_metadata_bytes: 16_384,
        }
    }

    /// Cria limites customizados com validação.
    ///
    /// # Errors
    ///
    /// Retorna erro se qualquer limite for zero.
    pub const fn new(
        max_bits: u64,
        max_depth: usize,
        max_nodes: usize,
        max_operands: usize,
        max_metadata_bytes: usize,
    ) -> Result<Self, CalcAuyError> {
        if max_bits == 0
            || max_depth == 0
            || max_nodes == 0
            || max_operands == 0
            || max_metadata_bytes == 0
        {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::CustomLimits,
                limit: 0,
                actual: 0,
            });
        }
        Ok(Self {
            max_bits,
            max_depth,
            max_nodes,
            max_operands,
            max_metadata_bytes,
        })
    }

    /// Verifica se um tamanho em bits está dentro do limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o tamanho exceder o limite.
    pub const fn check_bits(&self, bits: u64) -> Result<(), CalcAuyError> {
        if bits > self.max_bits {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxBits,
                limit: self.max_bits,
                actual: bits,
            });
        }
        Ok(())
    }

    /// Verifica se uma profundidade está dentro do limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se a profundidade exceder o limite.
    pub fn check_depth(&self, depth: usize) -> Result<(), CalcAuyError> {
        if depth > self.max_depth {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxDepth,
                limit: u64::try_from(self.max_depth).unwrap_or(u64::MAX),
                actual: u64::try_from(depth).unwrap_or(u64::MAX),
            });
        }
        Ok(())
    }

    /// Verifica se um número de nós está dentro do limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o número de nós exceder o limite.
    pub fn check_nodes(&self, nodes: usize) -> Result<(), CalcAuyError> {
        if nodes > self.max_nodes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxNodes,
                limit: u64::try_from(self.max_nodes).unwrap_or(u64::MAX),
                actual: u64::try_from(nodes).unwrap_or(u64::MAX),
            });
        }
        Ok(())
    }

    /// Verifica se um número de operandos está dentro do limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o número de operandos exceder o limite.
    pub fn check_operands(&self, operands: usize) -> Result<(), CalcAuyError> {
        if operands > self.max_operands {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxOperands,
                limit: u64::try_from(self.max_operands).unwrap_or(u64::MAX),
                actual: u64::try_from(operands).unwrap_or(u64::MAX),
            });
        }
        Ok(())
    }

    /// Verifica se um tamanho em bytes está dentro do limite.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::LimitExceeded`] se o tamanho exceder o limite.
    pub fn check_metadata_bytes(&self, bytes: usize) -> Result<(), CalcAuyError> {
        if bytes > self.max_metadata_bytes {
            return Err(CalcAuyError::LimitExceeded {
                kind: LimitKind::MaxMetadataBytes,
                limit: u64::try_from(self.max_metadata_bytes).unwrap_or(u64::MAX),
                actual: u64::try_from(bytes).unwrap_or(u64::MAX),
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_limits_are_valid() {
        let limits = Limits::default();
        assert_eq!(limits.max_bits, 1_000_000);
        assert_eq!(limits.max_depth, 500);
        assert_eq!(limits.max_nodes, 1000);
        assert_eq!(limits.max_operands, 100);
        assert_eq!(limits.max_metadata_bytes, 16_384);
    }

    #[test]
    fn custom_limits_validation() {
        // Limites válidos
        let limits = Limits::new(1000, 100, 50, 10, 1024);
        assert!(limits.is_ok());

        // Limites inválidos (zero)
        let limits = Limits::new(0, 100, 50, 10, 1024);
        assert!(limits.is_err());
    }

    #[test]
    fn check_bits_within_limit() {
        let limits = Limits::default();
        assert!(limits.check_bits(1000).is_ok());
        assert!(limits.check_bits(1_000_000).is_ok());
        assert!(limits.check_bits(1_000_001).is_err());
    }

    #[test]
    fn check_depth_within_limit() {
        let limits = Limits::default();
        assert!(limits.check_depth(100).is_ok());
        assert!(limits.check_depth(500).is_ok());
        assert!(limits.check_depth(501).is_err());
    }
}
