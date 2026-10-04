//! Seam de processadores de saída customizados.
//!
//! Espelha o `toCustomOutput(processor)` do rascunho original
//! (`_REF/src/output.ts`): um processador recebe um [`OutputContext`] com a
//! visão de saída, os rastros pré-renderizados (LaTeX, Unicode, verbal) e
//! opções específicas, podendo produzir qualquer tipo.
//!
//! O contexto é **preguiçoso**: LaTeX e Unicode são emprestados do cache (sem
//! cópia) e a descrição verbal só é realizada se o processador a solicitar.

use std::fmt;
use std::sync::OnceLock;

use calc_auy_nlg::VerbalRealizer;

use crate::output::Output;

/// Contexto entregue a um [`OutputProcessor`].
pub struct OutputContext<'a, 'c, O> {
    /// Visão de saída (acesso a todos os formatos e ao estado selado).
    pub output: &'a Output<'c>,
    /// LaTeX pré-renderizado, emprestado do cache (sem cópia).
    pub latex: &'a str,
    /// Unicode pré-renderizado, emprestado do cache (sem cópia).
    pub unicode: &'a str,
    /// Descrição verbal memoizada sob demanda.
    verbal: OnceLock<String>,
    /// Realizador usado para produzir a descrição verbal.
    realizer: &'a dyn VerbalRealizer,
    /// Opções específicas do processador.
    pub options: O,
}

impl<O> OutputContext<'_, '_, O> {
    /// Retorna a descrição verbal (acessibilidade), computando-a na primeira
    /// chamada.
    pub fn verbal(&self) -> &str {
        self.verbal
            .get_or_init(|| self.realizer.realize(self.output.srl_ref()))
    }
}

impl<O: fmt::Debug> fmt::Debug for OutputContext<'_, '_, O> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OutputContext")
            .field("latex", &self.latex)
            .field("unicode", &self.unicode)
            .field("options", &self.options)
            .finish_non_exhaustive()
    }
}

/// Processador de saída customizado.
///
/// Implemente este trait para estender a saída com novos formatos (XML, CSV,
/// persistência denormalizada, etc.) sem alterar o núcleo.
pub trait OutputProcessor {
    /// Tipo produzido pelo processador.
    type Output;
    /// Opções específicas do processador.
    type Options: Default;

    /// Processa o contexto e produz o resultado.
    fn process(&self, context: &OutputContext<'_, '_, Self::Options>) -> Self::Output;
}

impl Output<'_> {
    /// Aplica um processador de saída customizado.
    ///
    /// O contexto empresta os rastros LaTeX e Unicode já memoizados e só
    /// realiza a descrição verbal se o processador a pedir.
    pub fn to_custom_output<P: OutputProcessor>(
        &self,
        processor: &P,
        options: P::Options,
        realizer: &dyn VerbalRealizer,
    ) -> P::Output {
        let context = OutputContext {
            output: self,
            latex: self.latex_ref(),
            unicode: self.unicode_ref(),
            verbal: OnceLock::new(),
            realizer,
            options,
        };
        processor.process(&context)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Processador que devolve o LaTeX em maiúsculas.
    struct UpperLatex;

    impl OutputProcessor for UpperLatex {
        type Output = String;
        type Options = ();

        fn process(&self, context: &OutputContext<'_, '_, ()>) -> Self::Output {
            context.latex.to_uppercase()
        }
    }

    #[test]
    fn processor_receives_rendered_traces() {
        // O comportamento é exercitado no teste de integração `render.rs`
        // (requer um `Committed`); aqui só validamos o contrato do trait.
        let _ = UpperLatex;
    }
}
