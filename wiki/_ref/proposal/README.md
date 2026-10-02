# Proposta de Reimplementação em Rust — CalcAUY

> **Objetivo**: Reimplementar a infraestrutura aritmética CalcAUY em Rust, mantendo um **core enxuto e performático** (aritmética racional + AST + assinatura), com **camadas desacopladas** para representação do resultado (outputs, i18n, processadores).

---

## Índice

1. [Análise do Sistema Original](./01-analise-sistema-original.md)
2. [Arquitetura Proposta](./02-arquitetura-proposta.md)
3. [Core: Aritmética Racional](./03-core-rational.md)
4. [Core: AST e Engine](./04-core-ast-engine.md)
5. [Core: Assinatura e Integridade](./05-core-assinatura.md)
6. [Camada de Saída (Outputs)](./06-camada-output.md)
7. [Camada de Processadores](./07-camada-processadores.md)
8. [Camada de Parser](./08-camada-parser.md)
9. [Estratégia de Migração](./09-estrategia-migracao.md)
10. [Benchmarks e Performance](./10-benchmarks.md)
11. [Preparação do Repositório (Dia 0)](./11-preparacao-repositorio.md)
12. [Core de Performance Extrema](./12-core-performance-extrema.md)
13. [Revisão Crítica da Proposta](./13-revisao-critica.md)
14. [Arquitetura Oficial Rust (Decisões e Resoluções)](./14-arquitetura-oficial-rust.md)
15. [Melhorias Habilitadas pelo Rust Oficial](./15-melhorias-rust-oficial.md)

> ✅ **Fonte de verdade**: os documentos [14 — Arquitetura Oficial Rust](./14-arquitetura-oficial-rust.md)
> e [15 — Melhorias Habilitadas pelo Rust Oficial](./15-melhorias-rust-oficial.md) prevalecem
> sobre os demais em caso de conflito.
>
> 🗺️ **Plano de execução**: épicos e tasks sequenciais em [`../plan/`](../plan/README.md).

---

## Resumo Executivo

A CalcAUY é uma biblioteca TypeScript/Deno que resolve o risco sistêmico do padrão IEEE 754 utilizando **imutabilidade estrita** e **Árvore de Sintaxe Abstrata (AST)** para fundir precisão racional, contextualização e lacre de integridade em um único resultado.

### Pontos Fortes a Preservar

| Aspecto | Implementação Atual | Estratégia Rust |
|---------|---------------------|-----------------|
| **Aritmética Racional** | `BigInt` n/d com GCD | `num-bigint` + `num-traits` |
| **AST Imutável** | Objetos congelados | `enum` + `Box`/`Arc` |
| **Assinatura** | BLAKE3 + JCS (RFC 8785) | `blake3` + `serde` canônico |
| **Cache** | Hot (512) + Cold (WeakRef) | `HashMap` + `OnceLock`/`Lazy` |
| **Saídas** | Métodos na classe `CalcAUYOutput` | Traits + structs separadas |
| **i18n** | 8 locales hardcoded | `fluent` ou tabela estática |
| **Erros** | RFC 7807 com UUID | `thiserror` + `error-stack` |

### Princípios de Design para Rust

1. **Zero-cost abstractions**: Genéricos e traits sem overhead em runtime
2. **Ownership como imutabilidade**: Consumo de `self` para transformações
3. **Type safety**: Estados inválidos representacionalmente impossíveis
4. **Modularidade**: Core mínimo, features opcionais via `Cargo.toml`
5. **Determinismo**: Sem `HashMap` não-determinista em assinaturas (usar `BTreeMap`)

---

## Estrutura de Diretórios Proposta

```
calc-auy-rs/
├── Cargo.toml                    # Workspace root
├── crates/
│   ├── calc-auy-core/            # Core enxuto (sem I/O, sem async)
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── rational.rs       # RationalNumber (n/d)
│   │   │   ├── ast.rs            # AST types
│   │   │   ├── engine.rs         # Evaluator
│   │   │   ├── rounding.rs       # Rounding strategies
│   │   │   ├── signature.rs      # BLAKE3 + canonical
│   │   │   └── error.rs          # Error types
│   │   └── Cargo.toml
│   │
│   ├── calc-auy-builder/         # Fluent API (consome core)
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── builder.rs        # CalcAUYLogic equivalente
│   │   └── Cargo.toml
│   │
│   ├── calc-auy-output/          # Camada de representação
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── monetary.rs       # toMonetary
│   │   │   ├── latex.rs          # toLaTeX
│   │   │   ├── unicode.rs        # toUnicode
│   │   │   ├── verbal.rs         # toVerbalA11y
│   │   │   ├── mermaid.rs        # toMermaidGraph
│   │   │   └── slicer.rs         # toSlice
│   │   └── Cargo.toml
│   │
│   ├── calc-auy-parser/          # Lexer + Parser
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── lexer.rs
│   │   │   └── parser.rs
│   │   └── Cargo.toml
│   │
│   ├── calc-auy-i18n/            # Internacionalização
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── locales/          # 8 locales
│   │   └── Cargo.toml
│   │
│   └── calc-auy-processors/      # Processadores binários
│       ├── src/
│       │   ├── lib.rs
│       │   ├── protobuf.rs
│       │   ├── cbor.rs
│       │   └── msgpack.rs
│       └── Cargo.toml
│
├── examples/
│   └── demo.rs
│
└── tests/
    └── integration_tests.rs
```

---

## Features Opcionais (Cargo.toml)

```toml
[features]
default = ["std", "builder", "output"]
std = []
builder = ["dep:calc-auy-builder"]
output = ["dep:calc-auy-output"]
parser = ["dep:calc-auy-parser"]
i18n = ["dep:calc-auy-i18n"]
processors = ["dep:calc-auy-processors"]
serde = ["dep:serde"]
```

---

## Próximos Passos

1. **Fase 1**: Core (rational + ast + engine + rounding + signature)
2. **Fase 2**: Builder (fluent API)
3. **Fase 3**: Output layer (monetary, latex, unicode, verbal)
4. **Fase 4**: Parser (lexer + parser)
5. **Fase 5**: Processadores (protobuf, cbor, msgpack)
6. **Fase 6**: i18n completo (8 locales)

---

**Licença**: MPL-2.0 (mantendo compatibilidade com o projeto original)
