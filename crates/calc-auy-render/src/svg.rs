//! Renderização LaTeX → SVG (documento 1.1 auto-contido) via `latex-rust`.

use std::sync::OnceLock;

use latex_rust::{Dim, MathFont, SvgOptions as LxSvgOptions, latex_to_svg};

use crate::error::RenderError;
use crate::options::{MathStyle, Rgb};

/// Opções de renderização SVG.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SvgOptions {
    /// Tamanho do *em* em pontos.
    pub font_size_pt: i64,
    /// Estilo tipográfico (bloco ou embutido).
    pub style: MathStyle,
    /// Cor de preenchimento padrão dos glifos.
    pub color: Rgb,
}

impl Default for SvgOptions {
    fn default() -> Self {
        Self {
            font_size_pt: 12,
            style: MathStyle::Display,
            color: Rgb::BLACK,
        }
    }
}

impl SvgOptions {
    /// Cria opções padrão (12 pt, bloco, preto).
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Define o tamanho do *em* em pontos.
    #[must_use]
    pub const fn with_font_size_pt(mut self, points: i64) -> Self {
        self.font_size_pt = points;
        self
    }

    /// Define o estilo tipográfico.
    #[must_use]
    pub const fn with_style(mut self, style: MathStyle) -> Self {
        self.style = style;
        self
    }

    /// Define a cor padrão.
    #[must_use]
    pub const fn with_color(mut self, color: Rgb) -> Self {
        self.color = color;
        self
    }
}

/// Retorna a fonte matemática embutida, carregada uma única vez.
///
/// # Errors
///
/// Retorna [`RenderError::Latex`] se a fonte embutida não puder ser carregada.
pub(crate) fn math_font() -> Result<&'static MathFont, RenderError> {
    static FONT: OnceLock<Result<MathFont, latex_rust::Error>> = OnceLock::new();
    FONT.get_or_init(MathFont::stix_two_math)
        .as_ref()
        .map_err(|error| RenderError::Latex(error.clone()))
}

/// Renderiza LaTeX como um documento SVG 1.1 auto-contido.
///
/// # Errors
///
/// Retorna [`RenderError::Latex`] se o LaTeX for inválido, se algum construto
/// não for suportado ou se a fonte embutida falhar.
///
/// # Examples
///
/// ```
/// use calc_auy_render::{SvgOptions, to_svg};
///
/// let svg = to_svg(r"\frac{1}{2}", &SvgOptions::default()).expect("render");
/// assert!(svg.contains("<svg"));
/// assert!(svg.contains("<path"));
/// ```
pub fn to_svg(latex: &str, options: &SvgOptions) -> Result<String, RenderError> {
    crate::function_span("calc_auy_render.svg");
    let font = math_font()?;
    let latex_options = LxSvgOptions {
        font_size_pt: Dim::from_i64(options.font_size_pt),
        color: options.color.to_latex(),
        display: options.style.is_display(),
    };
    latex_to_svg(latex, font, &latex_options).map_err(RenderError::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_svg_document() {
        let svg = to_svg(r"x^2 + y^2 = z^2", &SvgOptions::default()).expect("render");
        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
        assert!(svg.contains("<path"));
    }

    #[test]
    fn rejects_unknown_command() {
        let result = to_svg(r"\naoexiste{1}", &SvgOptions::default());
        assert!(result.is_err());
    }
}
