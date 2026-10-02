# Introdução

O **CalcAUY** é uma calculadora determinística, auditável e exata para
contextos financeiros. O núcleo é um **racional híbrido** (`Small`/`Large`)
que preserva exatidão, com assinatura BLAKE3 *keyed* e cadeia de custódia.

## Princípios

- **Exatidão**: nenhuma operação de domínio usa `f64`.
- **Determinismo**: a mesma entrada produz a mesma assinatura e os mesmos bytes.
- **Custódia**: a avaliação só ocorre sobre uma AST **verificada**.
- **Limites como invariantes**: todo recurso é limitado na construção/desserialização.
- **Erros RFC 7807**: toda falha vira um `ProblemDetails`.

## Início rápido

```rust,ignore
use calc_auy_api::{CalcAuy, CustodyVerifier, InstanceConfig, OutputOptions, RoundingStrategy, Salt, CalcAuyError};

struct AcceptAll;
impl CustodyVerifier for AcceptAll {
    fn verify_link(&self, _l: &str, _s: &str, _r: RoundingStrategy) -> Result<(), CalcAuyError> {
        Ok(())
    }
}

let app = CalcAuy::new(
    InstanceConfig::new(Salt::new("demo")).with_rounding(RoundingStrategy::Nbr5891, 2),
);
let committed = app.parse("10000 * (1 + 14.75%) ^ 3")?.commit(&AcceptAll)?;
assert_eq!(committed.output(OutputOptions::new()).to_string_decimal(), "15109.78");
```

O exemplo executável completo está em
`crates/calc-auy-api/examples/quickstart.rs`:

```console
$ cargo run -p calc-auy-api --example quickstart
decimal:  15109.78
monetário: R$ 15.109,78
```
