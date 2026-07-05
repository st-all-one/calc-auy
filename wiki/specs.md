# Especificações Técnicas (Aprofundamento)

Documentos detalhados sobre implementação e algoritmos. Para documentação de uso prático, veja os guias na [raiz da wiki](./index.md).

## Mantidos em `specs/`

| # | Documento | Área |
|---|-----------|------|
| 00 | [Visão Panorâmica](./specs/00-Panoramic-Overview.md) | Arquitetura geral |
| 02 | [Estrutura da AST](./specs/02-AST-Structure.md) | Core |
| 03 | [Gramática do Parser](./specs/03-Parser-Rules.md) | Core |
| 04 | [Motor de Execução](./specs/04-Calculation-Engine.md) | Core |
| 06 | [Táticas de Implementação](./specs/06-Implementation-Tactics.md) | Infra |
| 07 | [Precedência e Associatividade](./specs/07-Precedence-Rules.md) | Core |
| 08 | [Validação de Input](./specs/08-Input-Strict-Spec.md) | Core |
| 11 | [Telemetria e Logs](./specs/11-Telemetry-Logging.md) | Infra |
| 12 | [Sistema de Erros](./specs/12-Error-Handling.md) | Infra |
| 13 | [Estratégias de Arredondamento](./specs/13-Rounding-Strategies.md) | Core |
| 15 | [Rigor de Código](./specs/15-Code-Rigor-Performance.md) | Infra |

## Cobertos pela documentação principal

| Spec | Conteúdo | Documento equivalente |
|------|----------|----------------------|
| 01 | RationalNumber | [architecture.md](./architecture.md) |
| 05 | Processadores de saída | [api/output-methods.md](./api/output-methods.md) |
| 09 | Interface de saída | [api/output-methods.md](./api/output-methods.md) |
| 10 | API fluida | [api/builder-methods.md](./api/builder-methods.md) |
| 14 | Internacionalização | [i18n.md](../features/i18n.md) |
| 16 | Processadores customizados | [custom-processors.md](../features/custom-processors.md) |
| 17 | Proteção PII | [pii-protection.md](../security/pii-protection.md) |
| 18 | Testes determinísticos | [deterministic-testing.md](../features/deterministic-testing.md) |
| 19 | Assinatura digital | [security.md](../security/security.md) + [canonical-string.md](../security/canonical-string.md) |
| 20 | Isolamento de instâncias | [security.md](../security/security.md) + [cross-context.md](../security/cross-context.md) |
| 21 | Mermaid ledger | [audit-traces.md](../features/audit-traces.md) |
| 22 | Processadores extras | [processor-packages.md](../features/processor-packages.md) |

---

[↑ Voltar ao índice](../index.md)
