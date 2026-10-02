//! Erros de renderização visual.

use thiserror::Error;

/// Erro ao renderizar uma saída visual (HTML, SVG ou PNG).
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum RenderError {
    /// A expressão LaTeX não pôde ser analisada/renderizada pelo motor KaTeX (HTML).
    #[error("katex: {0}")]
    Katex(#[from] katex::ParseError),
    /// A expressão LaTeX não pôde ser analisada/renderizada para SVG/PNG.
    #[error("latex: {0}")]
    Latex(#[from] latex_rust::Error),
    /// A fonte matemática embutida não pôde ser carregada.
    #[error("fonte matemática embutida indisponível")]
    FontUnavailable,
}
