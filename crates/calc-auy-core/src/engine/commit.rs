//! Pipeline de *commit*: avaliação → arredondamento → assinatura.

use crate::error::CalcAuyError;
use crate::integrity::{Digest, Salt, SignaturePayload, TraceVersion, VerifiedAst, verify};
use crate::limits::Limits;
use crate::numeric::{Rational, RoundingStrategy};

use super::eval::eval;

/// Resultado selado de um cálculo.
///
/// Só pode ser produzido por [`commit`], que exige uma [`VerifiedAst`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Committed {
    /// Payload assinado.
    payload: SignaturePayload,
    /// Assinatura do payload.
    signature: Digest,
}

impl Committed {
    /// Retorna o resultado final (já arredondado).
    #[must_use]
    pub const fn result(&self) -> &Rational {
        &self.payload.final_result
    }

    /// Retorna a assinatura.
    #[must_use]
    pub const fn signature(&self) -> Digest {
        self.signature
    }

    /// Retorna o payload assinado.
    #[must_use]
    pub const fn payload(&self) -> &SignaturePayload {
        &self.payload
    }

    /// Verifica a assinatura contra o sal.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::IntegrityViolation`] se a assinatura não
    /// conferir.
    pub fn verify(&self, salt: &Salt) -> Result<(), CalcAuyError> {
        verify(&self.payload.canonical_bytes(), salt, &self.signature)
    }

    /// Consome o resultado, devolvendo payload e assinatura.
    #[must_use]
    pub fn into_parts(self) -> (SignaturePayload, Digest) {
        (self.payload, self.signature)
    }
}

/// Avalia, arredonda, canonicaliza e assina um cálculo.
///
/// # Errors
///
/// Retorna erro se a avaliação falhar, o resultado exceder os limites ou o
/// arredondamento/assinatura falhar.
pub fn commit(
    verified: VerifiedAst,
    round: RoundingStrategy,
    decimals: u32,
    salt: &Salt,
    limits: &Limits,
) -> Result<Committed, CalcAuyError> {
    let value = eval(&verified, limits)?;
    let rounded = round.apply(&value, decimals);
    limits.check_bits(rounded.bits())?;

    let payload = SignaturePayload::new(verified.into_inner(), rounded, round, TraceVersion::V1);
    let signature = payload.sign(salt);
    Ok(Committed { payload, signature })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::{AstBuilder, OperationType};
    use crate::integrity::CustodyVerifier;

    /// Verificador permissivo (sem nós de controle).
    struct NoopVerifier;

    impl CustodyVerifier for NoopVerifier {
        fn verify_link(
            &self,
            _label: &str,
            _signature: &str,
            _round: RoundingStrategy,
        ) -> Result<(), CalcAuyError> {
            Ok(())
        }
    }

    fn verified_ast() -> VerifiedAst {
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let one = builder
            .literal(Rational::from_i64(1), "1")
            .expect("literal");
        let two = builder
            .literal(Rational::from_i64(2), "2")
            .expect("literal");
        let three = builder
            .literal(Rational::from_i64(3), "3")
            .expect("literal");
        let sum = builder
            .operation(OperationType::Add, &[one, two])
            .expect("soma");
        let product = builder
            .operation(OperationType::Mul, &[sum, three])
            .expect("produto");
        let ast = builder.finish(product).expect("árvore");
        ast.verify_custody(&NoopVerifier, &limits)
            .expect("custódia")
    }

    #[test]
    fn commit_produces_signed_result() {
        let salt = Salt::new("sal");
        let committed = commit(
            verified_ast(),
            RoundingStrategy::Nbr5891,
            0,
            &salt,
            &Limits::default(),
        )
        .expect("commit");
        assert_eq!(committed.result(), &Rational::from_i64(9));
        assert!(committed.verify(&salt).is_ok());
        assert_eq!(committed.payload().trace_version, TraceVersion::V1);
    }

    #[test]
    fn commit_applies_rounding() {
        let salt = Salt::new("sal");
        let limits = Limits::default();
        let mut builder = AstBuilder::new(&limits);
        let one = builder
            .literal(Rational::from_i64(1), "1")
            .expect("literal");
        let three = builder
            .literal(Rational::from_i64(3), "3")
            .expect("literal");
        let quotient = builder
            .operation(OperationType::Div, &[one, three])
            .expect("divisão");
        let ast = builder.finish(quotient).expect("árvore");
        let verified = ast
            .verify_custody(&NoopVerifier, &limits)
            .expect("custódia");

        let committed =
            commit(verified, RoundingStrategy::HalfUp, 2, &salt, &limits).expect("commit");
        assert_eq!(
            committed.result(),
            &Rational::new_checked(33, 100, &limits).expect("racional")
        );
    }

    #[test]
    fn wrong_salt_fails_verification() {
        let committed = commit(
            verified_ast(),
            RoundingStrategy::None,
            0,
            &Salt::new("sal"),
            &Limits::default(),
        )
        .expect("commit");
        assert!(committed.verify(&Salt::new("outro")).is_err());
    }
}
