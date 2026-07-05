# Especificações Técnicas (Aprofundamento)

Documentos detalhados sobre implementação e algoritmos, contrastados com o código-fonte real. Cada spec referencia os arquivos `src/`, constantes, RFCs e padrões utilizados.

## Catálogo Completo

| # | Documento | Área | Linhas |
|---|-----------|------|-------:|
| 00 | [Visão Panorâmica](./specs/00-Panoramic-Overview.md) | Arquitetura geral | 76 |
| 01 | [RationalNumber — Unidade Básica de Precisão](./specs/01-RationalNumber.md) | Core | 362 |
| 02 | [Estrutura da AST](./specs/02-AST-Structure.md) | Core | 117 |
| 03 | [Gramática do Parser](./specs/03-Parser-Rules.md) | Core | 74 |
| 04 | [Motor de Execução](./specs/04-Calculation-Engine.md) | Core | 82 |
| 05 | [Processadores de Saída](./specs/05-Output-Processors.md) | Output | 296 |
| 06 | [Táticas de Implementação](./specs/06-Implementation-Tactics.md) | Infra | 112 |
| 07 | [Precedência e Associatividade](./specs/07-Precedence-Rules.md) | Core | 121 |
| 08 | [Validação de Input](./specs/08-Input-Strict-Spec.md) | Core | 226 |
| 09 | [Interface de Saída (CalcAUYOutput)](./specs/09-Output-Interface.md) | Output | 401 |
| 10 | [API Fluida (CalcAUYLogic)](./specs/10-Fluent-Calculation-API.md) | API | 359 |
| 11 | [Telemetria e Logs](./specs/11-Telemetry-Logging.md) | Infra | 206 |
| 12 | [Sistema de Erros (RFC 7807)](./specs/12-Error-Handling.md) | Infra | 250 |
| 13 | [Estratégias de Arredondamento](./specs/13-Rounding-Strategies.md) | Core | 288 |
| 14 | [Internacionalização e Moedas](./specs/14-Locales-Currencies.md) | Output | 289 |
| 15 | [Rigor de Código e Performance](./specs/15-Code-Rigor-Performance.md) | Infra | 273 |
| 16 | [Processadores Customizados](./specs/16-Custom-Output-Processors.md) | Ext | 297 |
| 17 | [Proteção de PII](./specs/17-PII-Protection-Policy.md) | Seg | 234 |
| 18 | [Testes Determinísticos](./specs/18-Deterministic-Testing.md) | Testes | 241 |
| 19 | [Assinatura Digital (BLAKE3 + JCS)](./specs/19-Digital-Signature-Integrity.md) | Seg | 417 |
| 20 | [Isolamento de Instâncias](./specs/20-Instance-Isolation-Security.md) | Seg | 190 |
| 21 | [Auditoria Mermaid](./specs/21-Mermaid-Ledger-Auditory.md) | Output | 236 |
| 22 | [Processadores Extras](./specs/22-Pacote-de-Processadores-Extras.md) | Ext | 431 |

**Total: 5.578 linhas de especificação técnica.**

---

## Navegação por Área

- **Core (8):** 00, 01, 02, 03, 04, 07, 08, 13
- **API (1):** 10
- **Output (5):** 05, 09, 14, 16, 21
- **Infra/Segurança (5):** 06, 11, 12, 15, 17, 19, 20
- **Extensibilidade (2):** 16, 22
- **Testes (1):** 18

---

[↑ Voltar ao índice](./index.md)
