//! Renderização LaTeX → PNG (raster) via `latex-rust` (feature `png`).

use latex_rust::{Dim, PngBackground as LxPngBackground, PngOptions as LxPngOptions, latex_to_png};

use crate::error::RenderError;
use crate::options::{MathStyle, Rgb};
use crate::svg::math_font;

/// Fundo da imagem PNG.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum PngBackground {
    /// Totalmente transparente (padrão).
    #[default]
    Transparent,
    /// Preenchimento opaco com a cor dada.
    Color(Rgb),
}

/// Opções de rasterização PNG.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PngOptions {
    /// Tamanho do *em* em pontos.
    pub font_size_pt: i64,
    /// Resolução em pontos por polegada (deve estar em `(0, 2400]`).
    pub dpi: u32,
    /// Estilo tipográfico (bloco ou embutido).
    pub style: MathStyle,
    /// Cor de preenchimento dos glifos.
    pub color: Rgb,
    /// Fundo da imagem.
    pub background: PngBackground,
}

impl Default for PngOptions {
    fn default() -> Self {
        Self {
            font_size_pt: 12,
            dpi: 144,
            style: MathStyle::Display,
            color: Rgb::BLACK,
            background: PngBackground::Transparent,
        }
    }
}

impl PngOptions {
    /// Cria opções padrão (12 pt, 144 dpi, bloco, preto, fundo transparente).
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

    /// Define a resolução em pontos por polegada.
    #[must_use]
    pub const fn with_dpi(mut self, dpi: u32) -> Self {
        self.dpi = dpi;
        self
    }

    /// Define o estilo tipográfico.
    #[must_use]
    pub const fn with_style(mut self, style: MathStyle) -> Self {
        self.style = style;
        self
    }

    /// Define a cor de preenchimento.
    #[must_use]
    pub const fn with_color(mut self, color: Rgb) -> Self {
        self.color = color;
        self
    }

    /// Define o fundo.
    #[must_use]
    pub const fn with_background(mut self, background: PngBackground) -> Self {
        self.background = background;
        self
    }
}

/// Renderiza LaTeX como bytes de um arquivo PNG.
///
/// # Errors
///
/// Retorna [`RenderError::Latex`] se o LaTeX for inválido, se a feature `png`
/// estiver desligada (construto não suportado) ou se o DPI estiver fora do
/// intervalo `(0, 2400]`.
///
/// # Examples
///
/// ```
/// use calc_auy_render::{PngOptions, to_png};
///
/// let result = to_png(r"x", &PngOptions::new());
/// #[cfg(feature = "png")]
/// assert!(result.expect("render").starts_with(b"\x89PNG"));
/// #[cfg(not(feature = "png"))]
/// assert!(result.is_err());
/// ```
pub fn to_png(latex: &str, options: &PngOptions) -> Result<Vec<u8>, RenderError> {
    crate::function_span("calc_auy_render.png");
    let font = math_font()?;
    let latex_options = LxPngOptions {
        font_size_pt: Dim::from_i64(options.font_size_pt),
        dpi: Dim::from_i64(i64::from(options.dpi)),
        color: options.color.to_latex(),
        background: match options.background {
            PngBackground::Transparent => LxPngBackground::Transparent,
            PngBackground::Color(color) => LxPngBackground::Color(color.to_latex()),
        },
        display: options.style.is_display(),
    };
    latex_to_png(latex, font, &latex_options).map_err(RenderError::from)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "png")]
    fn renders_png_bytes() {
        let png = to_png(r"x^2", &PngOptions::new()).expect("render");
        assert!(png.starts_with(b"\x89PNG"));
    }

    #[test]
    #[cfg(feature = "png")]
    fn renders_with_opaque_background() {
        let options = PngOptions::new().with_background(PngBackground::Color(Rgb::WHITE));
        let png = to_png(r"y", &options).expect("render");
        assert!(png.starts_with(b"\x89PNG"));
    }

    #[test]
    fn rejects_invalid_dpi() {
        let result = to_png(r"x", &PngOptions::new().with_dpi(0));
        assert!(result.is_err());
    }
}
