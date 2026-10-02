//! Teste de compilação: o derive `Canonical` rejeita campos `f64`.

#[test]
fn canonical_rejects_f64() {
    let cases = trybuild::TestCases::new();
    cases.compile_fail("tests/ui/canonical_rejects_f64.rs");
}
