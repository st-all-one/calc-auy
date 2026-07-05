# Testes Determinísticos

Para garantir que assinaturas BLAKE3 sejam reproduzíveis em testes, a CalcAUY suporta timestamps fixos via `BIRTH_TICKET_MOCK`.

## BIRTH_TICKET_MOCK

O timestamp de nascimento de cada instância (`birthTicket`) normalmente usa `Date.now()`. Em testes, isso quebraria snapshots de assinatura. O mock substitui o timestamp por um valor fixo:

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";
import { BIRTH_TICKET_MOCK } from "@st-all-one/calc-auy/constants";

const calc = CalcAUY.create({
  contextLabel: "test",
  salt: "test-salt",
  [BIRTH_TICKET_MOCK]: "2026-01-01T00:00:00Z",
});

// Assinatura será sempre a mesma para os mesmos dados
const trace = calc.from("1/3").commit().toAuditTrace();
```

## Boas Práticas

1. Use `BIRTH_TICKET_MOCK` + salt fixo em testes de snapshot
2. **Nunca** use timestamps mock em produção
3. Testes de integridade devem validar que assinaturas mudam se o salt mudar

> **Nota:** `BIRTH_TICKET_MOCK` é exportado com tag `@internal` — use com cautela.

---

[↑ Voltar ao índice](../index.md)
