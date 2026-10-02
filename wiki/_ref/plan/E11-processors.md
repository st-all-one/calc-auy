# E11 — Processors (Serialização Binária)

> **Depende de**: [E03](./E03-integridade.md).
> **Entrega**: Protobuf, CBOR, MessagePack gerados do schema.
> **Gate**: G11.

## Objetivo

Oferecer serializações binárias determinísticas e **conformes ao schema versionado**, geradas — não
escritas à mão — para evitar divergência.

---

## Tasks

| # | Tipo | Task | Depende | Aceite / Evidência |
|---|------|------|---------|--------------------|
| T11.1 | code | Finalizar `schema/calc_auy.cddl` + JSON Schema; `xtask schema` gera tipos/`.proto` | T03 | `cargo xtask schema` idempotente; schema versionado |
| T11.2 | code | Protobuf (`prost`) com roundtrip e conformidade | T11.1 | Testes de roundtrip + golden bytes |
| T11.3 | code | CBOR (`ciborium`) determinístico (chaves ordenadas) | T11.1 | Roundtrip + golden |
| T11.4 | code | MessagePack (`rmp-serde`) determinístico | T11.1 | Roundtrip + golden |
| T11.5 | test | Conformidade cruzada (JSON ↔ binário) e limites na desserialização | T11.2 | `evidence/E11/T11.5.txt` |

---

## Notas

- **ADR-013**: processadores derivam do schema; campos aditivos, nunca remoção silenciosa.
- Serializações binárias devem ser **determinísticas** (ordenação canônica) para uso em assinatura.

## Gate G11 — critérios

- [ ] Todos os formatos roundtrip e conformes ao schema.
- [ ] Golden bytes estáveis.
- [ ] Evidência: `plan/evidence/G11.md`.

## Rastreabilidade

- **ADRs**: 013 (schema).
- **Docs**: 07.
