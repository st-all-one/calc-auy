# 09 — Estratégia de Migração

## Objetivo

Definir um **plano de migração incremental** do TypeScript para Rust, permitindo:
- Migração gradual sem interromper o desenvolvimento
- Compatibilidade de dados entre as duas implementações
- Testes de regressão contínuos

---

## Fases da Migração

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASES DA MIGRAÇÃO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FASE 1: CORE (Semanas 1-4)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Rational (n/d BigInt)                                            │    │
│  │  ✓ AST types                                                        │    │
│  │  ✓ Engine (eval)                                                    │    │
│  │  ✓ Rounding strategies                                             │    │
│  │  ✓ Signature (BLAKE3 + JCS)                                        │    │
│  │  ✓ Error types                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  FASE 2: BUILDER (Semanas 5-6)                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Fluent API (.from, .add, .mult, etc.)                            │    │
│  │  ✓ Instance management                                              │    │
│  │  ✓ Hibernate/Hydrate                                                │    │
│  │  ✓ Metadata validation                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  FASE 3: OUTPUT (Semanas 7-8)                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ toMonetary, toLaTeX, toUnicode                                   │    │
│  │  ✓ toVerbalA11y, toMermaidGraph                                     │    │
│  │  ✓ toSlice, toAuditTrace                                            │    │
│  │  ✓ i18n (8 locales)                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  FASE 4: PARSER (Semana 9)                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Lexer                                                            │    │
│  │  ✓ Parser (descida recursiva)                                       │    │
│  │  ✓ Expression evaluation                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  FASE 5: PROCESSADORES (Semanas 10-11)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Protobuf                                                         │    │
│  │  ✓ CBOR                                                             │    │
│  │  ✓ MessagePack                                                      │    │
│  │  ✓ HTML/Image (opcional)                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  FASE 6: VALIDAÇÃO (Semana 12)                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✓ Testes de compatibilidade TS ↔ Rust                               │    │
│  │  ✓ Benchmarks de performance                                        │    │
│  │  ✓ Documentação final                                               │    │
│  │  ✓ Migração de exemplos                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Compatibilidade de Dados

### Formato de Serialização

Para garantir compatibilidade entre TypeScript e Rust, ambos devem usar o **mesmo formato JSON**:

```json
{
  "ast": {
    "kind": "operation",
    "type": "mul",
    "operands": [
      {
        "kind": "literal",
        "value": { "n": "10000", "d": "1" },
        "originalInput": "10000"
      },
      {
        "kind": "group",
        "child": {
          "kind": "operation",
          "type": "pow",
          "operands": [...]
        }
      }
    ],
    "metadata": {
      "ref": "SELIC, mar/26",
      "timestamp": "2026-04-21T09:00:00.000Z"
    }
  },
  "finalResult": { "n": "96702579", "d": "6400" },
  "roundStrategy": "NBR5891",
  "signature": "b99d38e3726589136134614d4d3734ed469c8a81261d88aba309c278151f1515",
  "contextLabel": "financial"
}
```

### Validação de Compatibilidade

```rust
// tests/compatibility_tests.rs

/// Testa se a implementação Rust gera a mesma assinatura que TypeScript.
#[test]
fn test_signature_compatibility() {
    // Caso de teste gerado pelo TypeScript
    let json = r#"{
        "ast": {...},
        "finalResult": {"n": "96702579", "d": "6400"},
        "roundStrategy": "NBR5891"
    }"#;

    let expected_signature = "b99d38e3726589136134614d4d3734ed469c8a81261d88aba309c278151f1515";
    let salt = "MY-SECRET-SALT-2026";

    let ast: Ast = serde_json::from_str(json).unwrap();
    let signature = Signature::generate(&ast, salt, SignatureEncoder::Hex).unwrap();

    assert_eq!(signature.value, expected_signature);
}
```

---

## Estratégia de Testes

### 1. Testes Unitários

Cada módulo deve ter testes unitários abrangentes:

```bash
cargo test --lib
```

### 2. Testes de Integração

Testes que validam o fluxo completo:

```bash
cargo test --test integration_tests
```

### 3. Testes de Compatibilidade

Testes que comparam saída TypeScript ↔ Rust:

```bash
cargo test --test compatibility_tests
```

### 4. Testes de Performance

Benchmarks comparando TypeScript ↔ Rust:

```bash
cargo bench
```

---

## Plano de Ação Detalhado

### Semana 1-2: Setup e Rational

- [ ] Setup do workspace Cargo
- [ ] Implementação de `Rational` com `num-bigint`
- [ ] Testes unitários para operações básicas
- [ ] Validação de parsing de strings

### Semana 3-4: AST, Engine, Rounding, Signature

- [ ] Definição dos tipos AST
- [ ] Implementação do engine de avaliação
- [ ] Implementação das estratégias de rounding
- [ ] Implementação da assinatura BLAKE3 + JCS
- [ ] Testes de compatibilidade de assinatura

### Semana 5-6: Builder

- [ ] Implementação do fluent API
- [ ] Gerenciamento de instâncias
- [ ] Hibernate/Hydrate
- [ ] Validação de metadados

### Semana 7-8: Output

- [ ] Implementação dos formatos de saída
- [ ] Integração com i18n
- [ ] Testes de formatação

### Semana 9: Parser

- [ ] Implementação do lexer
- [ ] Implementação do parser
- [ ] Testes de expressões complexas

### Semana 10-11: Processadores

- [ ] Implementação Protobuf
- [ ] Implementação CBOR
- [ ] Implementação MessagePack
- [ ] Testes de roundtrip

### Semana 12: Validação Final

- [ ] Testes de compatibilidade completos
- [ ] Benchmarks de performance
- [ ] Documentação final
- [ ] Migração de exemplos

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Divergência de assinatura | Alto | Testes de compatibilidade rigorosos |
| Diferenças de rounding | Alto | Testes com casos de borda |
| Performance inferior | Médio | Benchmarks e otimizações |
| Bugs de parsing | Médio | Testes extensivos de expressões |
| Incompatibilidade de serialização | Alto | Schemas versionados |

---

## Critérios de Aceitação

A migração será considerada completa quando:

- [ ] Todos os testes unitários passam
- [ ] Todos os testes de integração passam
- [ ] Testes de compatibilidade TS ↔ Rust passam
- [ ] Performance é igual ou superior ao TypeScript
- [ ] Documentação está completa
- [ ] Exemplos foram migrados
- [ ] API é equivalente (mesmos métodos, mesmos resultados)

---

## Conclusão

A estratégia de migração proposta permite:
- **Migração gradual**: Cada fase é independente
- **Compatibilidade**: Dados são interoperáveis
- **Qualidade**: Testes abrangentes em cada fase
- **Performance**: Benchmarks garantem melhoria

A próxima seção detalha os benchmarks esperados.
