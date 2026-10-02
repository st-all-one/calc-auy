# E03 — Integridade

> **Depende de**: [E02](./E02-expressao-ast.md).
> **Entrega**: canonicalização v1, `Digest`/`Salt`, assinatura keyed, custódia, hashes de conteúdo.
> **Gate**: G3.

## Objetivo

Garantir o **lacre forense**: serialização canônica determinística, assinatura BLAKE3 keyed, e a
**verificação de custódia** que se torna um passo obrigatório antes da avaliação.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T03.1 | code | Crate `calc-auy-macros` com `#[derive(Canonical)]` que rejeita campos `f64` (trait bound) | T02 | Teste de compilação: struct com `f64` falha (`trybuild`) |
| T03.2 | code | Canonicalização v1 para todos os tipos de wire (`MetaValue`, repr de `Rational`, `Node`, `SignaturePayload`) | T03.1 | Vetores golden canônicos; ordem de chaves determinística |
| T03.3 | code | `Digest([u8;32])` + encoders (`hex`, `base32`, `base64`, `base58`); `Salt(SecretString)` + `zeroize` | T00 | Salt nunca em `Debug`/`Serialize`; teste de redação |
| T03.4 | code | `sign`/`verify` com BLAKE3 keyed (`derive_key("calc-auy/v1 signature", salt)` + `keyed_hash`) | T03.3 | Determinismo (mesma entrada → mesmo digest); mutação → digest diferente |
| T03.5 | code | `SignaturePayload` + `AuditTrace` v1 com `trace_version`; serialização/parse com limites | T03.2 | Roundtrip; versão obrigatória |
| T03.6 | code | Custódia: `CustodyVerifier`, `VerifiedAst`, `verify_custody` (parse-don't-validate), `cross_context_add` | T03.5 | `eval` só aceita `VerifiedAst` (E04); teste de elo inválido |
| T03.7 | code | Merkle log (`CustodyLink`: `previous` + `trace`) — `trace_version` 2 + migração v1→v2 | T03.6 | Cadeia detecta reordenação/remoção; teste de migração |
| T03.8 | code | `value_hash` (sem metadata) e `trace_hash` (com metadata) por subárvore | T03.2 | Base para memoização (E04) e dedup (E08) |
| T03.9 | test | `cargo-fuzz` no desserializador e no canonicalizador; `cargo miri test` no crate | T03.5 | Sem crash/UB; `evidence/E03/T03.9.txt` |

---

## Notas

- **Prevenção (A3/A5)**: `VerifiedAst` torna impossível avaliar um `Control` sem conferir a
  assinatura; a canonicalização é derivada do tipo (sem `f64` por construção).
- **Determinismo**: o payload assinado não contém tempo/UUID; o `Clock` só alimenta `instance` de erro.
- **Merkle log** é a evolução da custódia: detém ordem e completude, não só conteúdo.

## Gate G3 — critérios

- [ ] Assinatura determinística, keyed e versionada; golden vectors.
- [ ] `VerifiedAst` como único caminho para `eval`.
- [ ] Cadeia Merkle com migração v1→v2.
- [ ] Fuzz e Miri verdes.
- [ ] Evidência: `plan/evidence/G3.md`.

## Rastreabilidade

- **ADRs**: 003 (canonical/sign), 005 (custódia), 013 (schema), 014 (determinismo).
- **Docs**: 05 (superado), 15 (A3/A4/A6/C1/C2).
