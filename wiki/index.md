# CalcAUY — Documentação Oficial

**Matemática racional exata com rastro forense assinado.** BigInt puro, sem `number` IEEE 754.

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const calc = CalcAUY.create({ contextLabel: "minha-app", salt: "dev" });
const resultado = calc.from("1/3").add("0.5").commit();
console.log(resultado.toMonetary()); // R$ 0,8333
```

---

## Primeiros Passos

| Documento | O que cobre |
|-----------|-------------|
| [**getting-started.md**](./getting-started.md) | Tutorial de 5 minutos, instalação, primeiro cálculo |
| [**api/factory.md**](./api/factory.md) | `CalcAUY.create()` — parâmetros, defaults, isolamento |

## Conceitos

| Documento | O que cobre |
|-----------|-------------|
| [**architecture.md**](./architecture.md) | Ciclo de vida, cache 2 níveis, RationalNumber |
| [**features/inputs.md**](./features/inputs.md) | Tipos aceitos e rejeitados, validação rigorosa |
| [**features/rounding.md**](./features/rounding.md) | 6 estratégias: NBR5891, HALF_UP, HALF_EVEN, TRUNCATE, CEIL, NONE |

## API Reference

| Documento | O que cobre |
|-----------|-------------|
| [**api/factory.md**](./api/factory.md) | `CalcAUY.create()`, `CalcAUY.checkIntegrity()` |
| [**api/builder-methods.md**](./api/builder-methods.md) | `from()`, `add()`, `sub()`, `mult()`, `div()`, `pow()`, `group()`, `commit()`, `hibernate()`, `hydrate()`, `fromExternalInstance()` |
| [**api/output-methods.md**](./api/output-methods.md) | `toStringNumber()`, `toMonetary()`, `toSlice()`, `toLaTeX()`, `toAuditTrace()`, `toCustomOutput()` |
| [**errors/errors.md**](./errors/errors.md) | Catálogo de erros (RFC 7807) com causas e resolução |

## Segurança e Auditoria

| Documento | O que cobre |
|-----------|-------------|
| [**security/calculation-signature.md**](./security/calculation-signature.md) | **A assinatura do cálculo — o que é assinado, como o hash é gerado, como verificar** |
| [**security/security.md**](./security/security.md) | Modelo de ameaças, BLAKE3 + JCS, PII, isolamento, UUIDv7 |
| [**security/canonical-string.md**](./security/canonical-string.md) | RFC 8785 (JCS) — regras de formatação, type guards, interop |
| [**features/audit-traces.md**](./features/audit-traces.md) | Estrutura do rastro assinado, ciclo de vida, Mermaid ledger |
| [**security/pii-protection.md**](./security/pii-protection.md) | 3 camadas de proteção de dados sensíveis |
| [**security/cross-context.md**](./security/cross-context.md) | Integração entre jurisdições via `fromExternalInstance()` |

## Persistência

| Documento | O que cobre |
|-----------|-------------|
| [**features/persistence.md**](./features/persistence.md) | `hibernate()` / `hydrate()`, assinatura, schema SQL/Prisma |
| [**features/schemas.md**](./features/schemas.md) | Todos os schemas: JSON, CDDL, Proto, SQL, OpenAPI, GraphQL, MsgPack |

## Internacionalização

| Documento | O que cobre |
|-----------|-------------|
| [**features/i18n.md**](./features/i18n.md) | 9 locales, formatação monetária, acessibilidade verbal |

## Extensibilidade

| Documento | O que cobre |
|-----------|-------------|
| [**features/custom-processors.md**](./features/custom-processors.md) | Interface `CalcAUYCustomOutput`, criação de processadores |
| [**features/processor-packages.md**](./features/processor-packages.md) | Processadores oficiais: Protobuf, CBOR, MsgPack, HTML, Image, Persistence |

## Performance e Testes

| Documento | O que cobre |
|-----------|-------------|
| [**features/performance.md**](./features/performance.md) | Cache hot+cold, hierarchical flattening, late rounding |
| [**features/deterministic-testing.md**](./features/deterministic-testing.md) | `BIRTH_TICKET_MOCK`, snapshots de assinatura |

## Receitas

| Documento | O que cobre |
|-----------|-------------|
| [**recipes/financial-calc.md**](./recipes/financial-calc.md) | Juros compostos, rateio, parcelamento |
| [**recipes/tax-calc.md**](./recipes/tax-calc.md) | Substituição tributária, alíquotas, DRE |
| [**recipes/cross-context-workflows.md**](./recipes/cross-context-workflows.md) | Auditoria multi-empresa, handover |
| [**recipes/legal-audit.md**](./recipes/legal-audit.md) | Prova matemática, verificação de integridade |

## Especificações Técnicas (Detalhamento)

Documentos aprofundados em `specs/`:

| # | Documento |
|---|-----------|
| 00 | [Panorama Geral](./specs/00-Panoramic-Overview.md) |
| 02 | [Estrutura da AST](./specs/02-AST-Structure.md) |
| 03 | [Gramática do Parser](./specs/03-Parser-Rules.md) |
| 04 | [Motor de Execução](./specs/04-Calculation-Engine.md) |
| 06 | [Táticas de Implementação](./specs/06-Implementation-Tactics.md) |
| 07 | [Precedência e Associatividade](./specs/07-Precedence-Rules.md) |
| 08 | [Validação de Input](./specs/08-Input-Strict-Spec.md) |
| 11 | [Telemetria e Logs](./specs/11-Telemetry-Logging.md) |
| 12 | [Sistema de Erros](./specs/12-Error-Handling.md) |
| 13 | [Estratégias de Arredondamento](./specs/13-Rounding-Strategies.md) |
| 15 | [Rigor de Código](./specs/15-Code-Rigor-Performance.md) |

---

[↑ Voltar ao índice](./index.md)
