//! Formatadores de saída sobre cálculos selados.
//!
//! Todos os formatos derivam de um [`calc_auy_core::Committed`] (estado selado):
//! decimal, monetário, LaTeX, Unicode, Mermaid, rateio e rastro de auditoria.
//! A descrição verbal usa o *seam* de NLG (`VerbalRealizer`).

pub mod decimal;
pub mod json;
pub mod latex;
pub mod mermaid;
pub mod monetary;
pub mod options;
pub mod output;
pub mod processor;
#[cfg(feature = "render")]
pub mod render;
pub mod slicer;
pub mod unicode;

pub use decimal::{MAX_DECIMALS, format_decimal};
pub use json::{DEFAULT_KEYS, OutputKey};
pub use options::{
    Currency, CurrencyPosition, Locale, LocaleData, MermaidTerms, OutputOptions, Sensitivity,
};
pub use output::Output;
pub use processor::{OutputContext, OutputProcessor};
#[cfg(feature = "render")]
pub use render::{
    CssMode, ErrorPolicy, HtmlOptions, KATEX_CSS, MathStyle, PngBackground, PngOptions,
    RenderError, Rgb, SvgOptions,
};
