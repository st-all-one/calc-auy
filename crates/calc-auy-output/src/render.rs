//! Representações visuais (HTML, SVG e PNG) do cálculo selado.
//!
//! Requer a feature `render`. Todas as representações partem do LaTeX canônico
//! produzido por [`Output::to_latex`], garantindo que a imagem seja fiel à
//! mesma expressão usada nos demais formatos. O HTML recebe ainda a descrição
//! verbal como rótulo ARIA (acessibilidade).

use calc_auy_nlg::VerbalRealizer;

use crate::output::Output;

pub use calc_auy_render::{
    CssMode, ErrorPolicy, HtmlOptions, KATEX_CSS, MathStyle, PngBackground, PngOptions,
    RenderError, Rgb, SvgOptions,
};

impl Output<'_> {
    /// Renderiza o cálculo como um fragmento HTML auto-contido via `KaTeX`.
    ///
    /// O `realizer` produz a descrição verbal usada no `aria-label`.
    ///
    /// # Errors
    ///
    /// Retorna [`RenderError`] se o LaTeX for inválido.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use calc_auy_output::{HtmlOptions, Output, OutputOptions};
    /// # use calc_auy_i18n::PtBrRealizer;
    /// # fn demo(output: Output<'_>) {
    /// let html = output
    ///     .to_html(&PtBrRealizer::new(), &HtmlOptions::default())
    ///     .expect("render");
    /// # let _ = html;
    /// # }
    /// ```
    pub fn to_html(
        &self,
        realizer: &dyn VerbalRealizer,
        options: &HtmlOptions,
    ) -> Result<String, RenderError> {
        let latex = self.to_latex();
        let verbal = self.to_verbal_a11y(realizer);
        calc_auy_render::to_html(&latex, &verbal, options)
    }

    /// Renderiza o cálculo como um documento SVG 1.1 auto-contido.
    ///
    /// # Errors
    ///
    /// Retorna [`RenderError`] se o LaTeX for inválido ou não suportado.
    pub fn to_svg(&self, options: &SvgOptions) -> Result<String, RenderError> {
        calc_auy_render::to_svg(&self.to_latex(), options)
    }

    /// Renderiza o cálculo como bytes PNG.
    ///
    /// # Errors
    ///
    /// Retorna [`RenderError`] se o LaTeX for inválido, não suportado, ou se o
    /// DPI estiver fora do intervalo `(0, 2400]`.
    pub fn to_png(&self, options: &PngOptions) -> Result<Vec<u8>, RenderError> {
        calc_auy_render::to_png(&self.to_latex(), options)
    }
}
