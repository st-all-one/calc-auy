//! Representação JSON multi-formato do cálculo selado.
//!
//! Espelha o `toJSON(outputs?)` do rascunho original (`_REF/src/output.ts`):
//! seleciona um subconjunto de representações e as serializa em um objeto
//! estável, acrescentando `signature` e, quando presente, `contextLabel`.

use std::collections::BTreeMap;

use calc_auy_core::CalcAuyError;
use calc_auy_nlg::VerbalRealizer;

use crate::output::Output;

/// Chave de representação para [`Output::to_json_formats`].
#[non_exhaustive]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputKey {
    /// Decimal formatado (ciente do arredondamento).
    Decimal,
    /// Inteiro escalado por `10^decimals`.
    Scaled,
    /// Moeda localizada.
    Monetary,
    /// LaTeX.
    Latex,
    /// Unicode (CLI).
    Unicode,
    /// Diagrama Mermaid.
    Mermaid,
    /// Descrição verbal (acessibilidade).
    Verbal,
}

impl OutputKey {
    /// Retorna o identificador estável usado como chave JSON.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Decimal => "decimal",
            Self::Scaled => "scaled",
            Self::Monetary => "monetary",
            Self::Latex => "latex",
            Self::Unicode => "unicode",
            Self::Mermaid => "mermaid",
            Self::Verbal => "verbal",
        }
    }
}

/// Conjunto padrão de representações (todas as textuais).
pub const DEFAULT_KEYS: &[OutputKey] = &[
    OutputKey::Decimal,
    OutputKey::Monetary,
    OutputKey::Latex,
    OutputKey::Unicode,
    OutputKey::Mermaid,
    OutputKey::Verbal,
];

impl Output<'_> {
    /// Serializa um subconjunto de representações como JSON.
    ///
    /// As representações são ordenadas pela posição em `keys`; `signature` (hex)
    /// é sempre incluída e `contextLabel` é incluída quando definido nas
    /// opções. A descrição verbal usa o [`VerbalRealizer`] fornecido.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::SerializationError`] se a serialização falhar.
    ///
    /// # Examples
    ///
    /// ```
    /// use calc_auy_core::{AstBuilder, CustodyVerifier, Limits, OperationType, Rational};
    /// use calc_auy_core::{RoundingStrategy, Salt, commit};
    /// use calc_auy_i18n::PtBrRealizer;
    /// use calc_auy_output::{Output, OutputKey, OutputOptions};
    ///
    /// struct AcceptAll;
    /// impl CustodyVerifier for AcceptAll {
    ///     fn verify_link(
    ///         &self,
    ///         _l: &str,
    ///         _s: &str,
    ///         _r: RoundingStrategy,
    ///     ) -> Result<(), calc_auy_core::CalcAuyError> {
    ///         Ok(())
    ///     }
    /// }
    ///
    /// let limits = Limits::default();
    /// let mut builder = AstBuilder::new(&limits);
    /// let a = builder.literal(Rational::from_i64(1), "1").unwrap();
    /// let b = builder.literal(Rational::from_i64(2), "2").unwrap();
    /// let sum = builder.operation(OperationType::Add, &[a, b]).unwrap();
    /// let ast = builder.finish(sum).unwrap();
    /// let verified = ast.verify_custody(&AcceptAll, &limits).unwrap();
    /// let committed =
    ///     commit(verified, RoundingStrategy::HalfUp, 2, &Salt::new("demo"), &limits).unwrap();
    /// let output = Output::new(&committed, OutputOptions::new());
    /// let json = output
    ///     .to_json_formats(&[OutputKey::Decimal, OutputKey::Latex], &PtBrRealizer::new())
    ///     .unwrap();
    /// assert!(json.contains("\"decimal\":\"3.00\""));
    /// assert!(json.contains("\"signature\":"));
    /// ```
    pub fn to_json_formats(
        &self,
        keys: &[OutputKey],
        realizer: &dyn VerbalRealizer,
    ) -> Result<String, CalcAuyError> {
        let mut map = BTreeMap::new();
        for key in keys {
            let value = match key {
                OutputKey::Decimal => self.to_string_decimal(),
                OutputKey::Scaled => self.to_scaled_bigint(self.effective_decimals()).to_string(),
                OutputKey::Monetary => self.to_monetary(),
                OutputKey::Latex => self.to_latex(),
                OutputKey::Unicode => self.to_unicode(),
                OutputKey::Mermaid => self.to_mermaid_graph(),
                OutputKey::Verbal => self.to_verbal_a11y(realizer),
            };
            map.insert(key.as_str().to_string(), value);
        }
        map.insert("signature".to_string(), self.committed().signature().hex());
        if let Some(label) = self.options().context_label.as_deref() {
            map.insert("contextLabel".to_string(), label.to_string());
        }
        serde_json::to_string(&map).map_err(|error| CalcAuyError::SerializationError {
            message: error.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_have_stable_names() {
        assert_eq!(OutputKey::Decimal.as_str(), "decimal");
        assert_eq!(OutputKey::Verbal.as_str(), "verbal");
        assert_eq!(DEFAULT_KEYS.len(), 6);
    }
}
