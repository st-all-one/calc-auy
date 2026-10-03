//! Testes de integração das representações visuais (HTML, SVG, PNG).
//!
//! Compilados apenas com a feature `render`.

#![cfg(feature = "render")]

mod common;

use calc_auy_i18n::PtBrRealizer;
use calc_auy_output::{HtmlOptions, Output, OutputOptions, PngOptions, Rgb, SvgOptions};

#[test]
fn html_includes_verbal_aria_label() {
    let committed = common::commit_expression("10000 * (1 + 14.75%) ^ 3", 2);
    let output = Output::new(&committed, OutputOptions::new());
    let html = output
        .to_html(&PtBrRealizer::new(), &HtmlOptions::default())
        .expect("html");
    assert!(html.contains("calc-auy-result"));
    assert!(html.contains("aria-label=\""));
    assert!(html.contains("<style>"));
}

#[test]
fn svg_is_self_contained() {
    let committed = common::commit_expression("10000 * (1 + 14.75%) ^ 3", 2);
    let output = Output::new(&committed, OutputOptions::new());
    let svg = output.to_svg(&SvgOptions::default()).expect("svg");
    assert!(svg.contains("<svg"));
    assert!(svg.contains("</svg>"));
}

#[test]
fn png_has_magic_header() {
    let committed = common::commit_expression("2 + 2", 2);
    let output = Output::new(&committed, OutputOptions::new());
    let png = output
        .to_png(
            &PngOptions::new().with_background(calc_auy_output::PngBackground::Color(Rgb::WHITE)),
        )
        .expect("png");
    assert!(png.starts_with(b"\x89PNG"));
}
