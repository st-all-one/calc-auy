//! Estados do ciclo de vida (*typestate*) e seus dados.

use calc_auy_core::{AstBuilder, Committed as EngineCommitted, NodeId};

/// Dados de um cálculo em rascunho.
#[doc(hidden)]
#[derive(Debug)]
pub struct DraftData<'limits> {
    /// Construtor da arena.
    pub(crate) builder: AstBuilder<'limits>,
    /// Raiz atual.
    pub(crate) root: NodeId,
}

/// Dados de um cálculo já selado.
#[doc(hidden)]
#[derive(Debug)]
pub struct CommittedData {
    /// Resultado selado do núcleo.
    pub(crate) result: EngineCommitted,
}

/// Módulo de selagem dos estados.
mod sealed {
    /// Trait de selagem.
    pub trait Sealed {}
}

/// Estado do ciclo de vida de um [`crate::Calculation`].
///
/// O trait é **selado**: apenas `Draft`, `Committed` e `Verified` o
/// implementam, de modo que estados inválidos não podem ser criados.
pub trait State: sealed::Sealed {
    /// Nome legível do estado.
    #[doc(hidden)]
    const NAME: &'static str;
    /// Dados associados ao estado.
    #[doc(hidden)]
    type Data<'limits>;
}

/// Rascunho: cálculo em construção, sem resultado final.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Draft;

impl sealed::Sealed for Draft {}

impl State for Draft {
    const NAME: &'static str = "Draft";
    type Data<'limits> = DraftData<'limits>;
}

/// Selado: resultado calculado e assinado.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Committed;

impl sealed::Sealed for Committed {}

impl State for Committed {
    const NAME: &'static str = "Committed";
    type Data<'limits> = CommittedData;
}

/// Verificado: custódia conferida após o *commit*.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Verified;

impl sealed::Sealed for Verified {}

impl State for Verified {
    const NAME: &'static str = "Verified";
    type Data<'limits> = CommittedData;
}
