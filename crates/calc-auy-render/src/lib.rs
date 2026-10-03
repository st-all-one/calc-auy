//! Renderização visual de cálculos selados: HTML (`KaTeX`), SVG e PNG.
//!
//! O crate é um **motor puro sobre LaTeX**: recebe a expressão LaTeX já
//! produzida por [`Output::to_latex`](https://docs.rs/calc-auy-output) e
//! devolve a representação visual. Isso mantém o crate desacoplado da camada
//! de saída e reutilizável por HTML, SVG, PNG, CLI e WASM.
//!
//! # Formatos
//!
//! - [`to_html`] — fragmento HTML auto-contido via `KaTeX` (com CSS embutido) e
//!   rótulo ARIA para acessibilidade.
//! - [`to_svg`] — documento SVG 1.1 auto-contido via `latex-rust`.
//! - [`to_png`] — rasterização PNG (feature `png`, ligada por padrão).
//!
//! # Performance
//!
//! O contexto do `KaTeX` e a fonte matemática (STIX Two Math) são carregados
//! uma única vez e reutilizados por todas as renderizações através de
//! [`OnceLock`](std::sync::OnceLock) — o custo de inicialização não recai sobre
//! o caminho quente (ver `E08`).
//!
//! # Examples
//!
//! ```
//! use calc_auy_render::{HtmlOptions, to_html};
//!
//! let html = to_html(r"x = \frac{1}{2}", "x igual a um meio", &HtmlOptions::default())
//!     .expect("render");
//! assert!(html.contains("calc-auy-result"));
//! assert!(html.contains("aria-label=\"x igual a um meio\""));
//! ```

pub mod error;
pub mod html;
pub mod options;
pub mod png;
pub mod svg;

pub use error::RenderError;
pub use html::{HtmlOptions, KATEX_CSS, to_html};
pub use options::{CssMode, ErrorPolicy, MathStyle, Rgb};
pub use png::{PngBackground, PngOptions, to_png};
pub use svg::{SvgOptions, to_svg};

/// Emite um span de instrumentação de função, quando a feature está ativa.
///
/// Sem `feature = "instrument"` isto é um no-op inlined, conforme a política de
/// custo zero do projeto.
#[inline]
#[cfg_attr(
    not(feature = "instrument"),
    allow(
        clippy::missing_const_for_fn,
        reason = "com `instrument` a função emite um evento e não pode ser `const`"
    )
)]
pub(crate) fn function_span(function: &'static str) {
    #[cfg(feature = "instrument")]
    {
        let _span = calc_auy_core::diag::Span::start_function(
            calc_auy_core::diag::Level::Debug,
            calc_auy_core::diag::events::CALC_AUY_FN,
            function,
            &[],
        );
    }
    #[cfg(not(feature = "instrument"))]
    {
        let _ = function;
    }
}
