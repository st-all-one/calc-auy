//! Compilação negativa do typestate e da ingestão sem `f64` (T06.1, T06.3).

#[test]
fn ui() {
    let cases = trybuild::TestCases::new();
    cases.compile_fail("tests/ui/*.rs");
}
