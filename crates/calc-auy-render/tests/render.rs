//! Testes de integração dos renderizadores com a expressão LaTeX real do core.

use calc_auy_render::{
    HtmlOptions, PngBackground, PngOptions, Rgb, SvgOptions, to_html, to_png, to_svg,
};

/// LaTeX equivalente ao snapshot `latex.snap` do crate `calc-auy-output`.
const FULL_LATEX: &str = r"\text{round}_{\text{nbr5891}}(10000 \times \left( 1 + 14.75 \times \frac{1}{100} \right)^{3}, 2) = 15109.78";

#[test]
fn html_renders_full_expression() {
    let html = to_html(
        FULL_LATEX,
        "dez mil vezes um mais quatorze vírgula setenta e cinco por cento ao cubo",
        &HtmlOptions::default(),
    )
    .expect("html");
    assert!(html.contains("katex"));
    assert!(html.contains("aria-label="));
}

#[test]
fn svg_renders_full_expression() {
    let svg = to_svg(FULL_LATEX, &SvgOptions::default()).expect("svg");
    assert!(svg.contains("<svg"));
    assert!(svg.contains("<path"));
}

#[test]
#[cfg(feature = "png")]
fn png_renders_full_expression() {
    let png = to_png(
        FULL_LATEX,
        &PngOptions::new().with_background(PngBackground::Color(Rgb::WHITE)),
    )
    .expect("png");
    assert!(png.starts_with(b"\x89PNG"));
}

#[test]
fn renders_are_deterministic() {
    let first = to_svg(FULL_LATEX, &SvgOptions::default()).expect("svg");
    let second = to_svg(FULL_LATEX, &SvgOptions::default()).expect("svg");
    assert_eq!(first, second);
}
