# CalcAUY

Calculadora **determinística, auditável e exata** para contextos financeiros.

- **Exatidão**: racional híbrido (`Small`/`Large`), sem `f64` no domínio.
- **Determinismo**: mesma entrada → mesma assinatura (BLAKE3 *keyed*) e bytes.
- **Custódia**: avaliação só sobre AST verificada (`VerifiedAst`).
- **Limites**: invariantes de construção e desserialização.
- **Erros**: RFC 7807 (`ProblemDetails`).

## Uso rápido

```console
$ calc-auy "1 + 2"
3.00

$ calc-auy --params '{"mode":"monetary","locale":"pt-BR"}' "10000 * (1 + 14.75%) ^ 3"
R$ 15.109,78

$ echo "1/3" | calc-auy --params '{"rounding":"half_up","decimals":4}'
0.3333

$ calc-auy --params '{"mode":"json"}' "1 + 2"     # múltiplas representações
$ calc-auy --params '{"mode":"html"}' "1/2 + 3"   # fragmento KaTeX
$ calc-auy --params '{"mode":"svg"}' "1/2 + 3"    # documento SVG
```

O único argumento posicional é o `BODY` (padrão: stdin); a configuração vai em
`--params='{...}'`; há lote NDJSON via `--batch`.

## Camadas

| Crate | Papel |
|-------|-------|
| `calc-auy-core` | racional, AST, integridade, engine, lotes |
| `calc-auy-parser` | lexer + parser Pratt |
| `calc-auy-builder` | typestate `Draft → Committed → Verified` |
| `calc-auy-output` | decimal, monetário, LaTeX, Unicode, Mermaid, JSON multi-formato |
| `calc-auy-render` | HTML (`KaTeX`), SVG e PNG (feature `render`) |
| `calc-auy-nlg` / `calc-auy-i18n` | SRL + realizers (9 idiomas) |
| `calc-auy-processors` | Protobuf, CBOR, MessagePack, persistência |
| `calc-auy-api` | fachada única |
| `calc-auy-wasm` | bindings WASM (`cdylib`) |
| `calc-auy` | binário CLI |

## Verificação

```console
$ make check        # fmt + clippy + test
$ make deny audit   # licenças/advisories
$ make doc          # rustdoc sem warnings
$ cargo test -p calc-auy-api --test corpus   # corpus de conformidade
$ cargo run -p xtask -- bench-report         # orçamentos de performance
```

## Documentação

- Livro do produto: `docs/book/` (mdBook).
- ADRs: `docs/adr/`.
- Plano e evidências: `wiki/_ref/plan/` e `plan/evidence/`.
- Changelog: [`CHANGELOG.md`](CHANGELOG.md).

## Licença

MPL-2.0 — veja [`LICENSE`](LICENSE).
