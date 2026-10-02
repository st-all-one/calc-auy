//! Log encadeado (Merkle) de commits de custódia.

use serde::{Deserialize, Serialize};

use crate::error::CalcAuyError;

use super::digest::Digest;
use super::salt::Salt;
use super::sign::sign;

/// Elo de um log encadeado: referência ao anterior + traço deste commit.
///
/// O encadeamento torna a sequência inteira à prova de adulteração, detectando
/// reordenação e remoção — não apenas o conteúdo de um commit isolado.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, calc_auy_macros::Canonical)]
pub struct CustodyLink {
    /// Digest do commit anterior (`None` = raiz).
    pub previous: Option<Digest>,
    /// Digest canônico deste commit.
    pub trace: Digest,
}

impl CustodyLink {
    /// Cria um elo a partir do elo anterior e dos bytes canônicos.
    #[must_use]
    pub fn chain(previous: Option<Digest>, canonical: &[u8], salt: &Salt) -> Self {
        Self {
            previous,
            trace: sign(canonical, salt),
        }
    }

    /// Verifica que o traço corresponde aos bytes canônicos.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError::IntegrityViolation`] se o traço não conferir.
    pub fn verify(&self, canonical: &[u8], salt: &Salt) -> Result<(), CalcAuyError> {
        let expected = sign(canonical, salt);
        if expected == self.trace {
            Ok(())
        } else {
            Err(CalcAuyError::IntegrityViolation {
                expected: self.trace.hex(),
                received: expected.hex(),
            })
        }
    }

    /// Retorna o elo anterior.
    #[must_use]
    pub const fn previous(&self) -> Option<Digest> {
        self.previous
    }

    /// Retorna o traço deste commit.
    #[must_use]
    pub const fn trace(&self) -> Digest {
        self.trace
    }
}

/// Encadeia uma sequência de payloads canônicos.
///
/// Retorna os elos na ordem de entrada; cada elo referencia o anterior.
#[must_use]
pub fn chain_log(payloads: &[Vec<u8>], salt: &Salt) -> Vec<CustodyLink> {
    let mut links: Vec<CustodyLink> = Vec::with_capacity(payloads.len());
    let mut previous: Option<Digest> = None;
    for payload in payloads {
        let link = CustodyLink::chain(previous, payload, salt);
        previous = Some(link.trace);
        links.push(link);
    }
    links
}

/// Verifica que uma sequência de elos é íntegra e está na ordem correta.
///
/// # Errors
///
/// Retorna [`CalcAuyError::CustodyViolation`] se algum elo estiver fora de
/// ordem ou [`CalcAuyError::IntegrityViolation`] se o traço não conferir.
pub fn verify_log(
    links: &[CustodyLink],
    payloads: &[Vec<u8>],
    salt: &Salt,
) -> Result<(), CalcAuyError> {
    if links.len() != payloads.len() {
        return Err(CalcAuyError::CustodyViolation {
            reason: "número de elos difere do número de payloads".to_string(),
        });
    }
    let mut previous: Option<Digest> = None;
    for (link, payload) in links.iter().zip(payloads) {
        if link.previous != previous {
            return Err(CalcAuyError::CustodyViolation {
                reason: "elo anterior não corresponde".to_string(),
            });
        }
        link.verify(payload, salt)?;
        previous = Some(link.trace);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payloads() -> Vec<Vec<u8>> {
        vec![b"a".to_vec(), b"b".to_vec(), b"c".to_vec()]
    }

    #[test]
    fn chain_detects_valid_sequence() {
        let salt = Salt::new("sal");
        let payloads = payloads();
        let links = chain_log(&payloads, &salt);
        assert!(verify_log(&links, &payloads, &salt).is_ok());
        assert_eq!(links[0].previous(), None);
        assert_eq!(links[1].previous(), Some(links[0].trace()));
    }

    #[test]
    fn chain_detects_reordering() {
        let salt = Salt::new("sal");
        let payloads = payloads();
        let links = chain_log(&payloads, &salt);
        let reordered = vec![links[1], links[0], links[2]];
        assert!(verify_log(&reordered, &payloads, &salt).is_err());
    }

    #[test]
    fn chain_detects_removal() {
        let salt = Salt::new("sal");
        let payloads = payloads();
        let links = chain_log(&payloads, &salt);
        let shortened = vec![links[0], links[2]];
        assert!(verify_log(&shortened, &payloads, &salt).is_err());
    }

    #[test]
    fn chain_detects_tampering() {
        let salt = Salt::new("sal");
        let payloads = payloads();
        let mut links = chain_log(&payloads, &salt);
        links[1].trace = links[0].trace;
        assert!(verify_log(&links, &payloads, &salt).is_err());
    }
}
