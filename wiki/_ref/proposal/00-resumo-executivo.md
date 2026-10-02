# Resumo Executivo — Reimplementação CalcAUY em Rust

## A CalcAUY

A **CalcAUY** é uma infraestrutura aritmética que resolve o risco sistêmico do padrão IEEE 754 utilizando:

- **Aritmética racional exata** (frações `n/d` com precisão arbitrária)
- **AST imutável** construída via fluent API
- **Assinatura criptográfica** (BLAKE3 + JCS) para integridade forense
- **Multi-formato de saída** (monetário, LaTeX, Unicode, verbal, Mermaid)

**Problema resolvido**: Imprecisões de ponto flutuante (`0.1 + 0.2 !== 0.3`) que causam rombos financeiros, falhas de compliance e passivos jurídicos.

---

## Por Que Rust?

| Critério | TypeScript/Deno | Rust |
|----------|-----------------|------|
| **Performance** | Baseline | 2-5x mais rápido |
| **Assinatura** | ~1.5ms (async) | ~0.05ms (sync) |
| **Memória** | Baseline | ~2x mais eficiente |
| **Segurança** | Runtime checks | Compile-time checks |
| **Concorrência** | Event loop | Real parallelism |
| **Previsibilidade** | GC pauses | Sem GC |

---

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APLICAÇÃO                      │
│                    (CLI, Server, Library)                       │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE PROCESSADORES                  │
│              (Protobuf, CBOR, MessagePack, HTML)                │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE SAÍDA                          │
│        (Monetary, LaTeX, Unicode, Verbal, Mermaid)              │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE BUILDER                        │
│           (Fluent API, Instance Management)                     │
├─────────────────────────────────────────────────────────────────┤
│                        CAMADA DE PARSER                         │
│                  (Lexer, Parser)                                │
├─────────────────────────────────────────────────────────────────┤
│                        CORE (enxuto)                            │
│     (Rational, AST, Engine, Rounding, Signature)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Crates

```
calc-auy-rs/
├── crates/
│   ├── calc-auy-core/         # Core enxuto (sem I/O)
│   ├── calc-auy-builder/      # Fluent API
│   ├── calc-auy-output/       # Formatos de saída
│   ├── calc-auy-parser/       # Lexer + Parser
│   ├── calc-auy-i18n/         # Internacionalização
│   └── calc-auy-processors/   # Serialização binária
```

---

## Benefícios Esperados

### Performance

| Métrica | Melhoria |
|---------|----------|
| Aritmética racional | 2x mais rápida |
| Assinatura BLAKE3 | 30-100x mais rápida |
| Parser | 5x mais rápida |
| Serialização | 2.5-3.5x mais rápida |

### Qualidade

| Aspecto | Benefício |
|---------|-----------|
| Type safety | Erros em tempo de compilação |
| Imutabilidade | Garantida pelo borrow checker |
| Testabilidade | Módulos isolados e puros |
| Manutenibilidade | Código modular e documentado |

### Segurança

| Aspecto | Benefício |
|---------|-----------|
| Memory safety | Sem buffer overflows |
| Thread safety | Sem data races |
| Type safety | Estados inválidos impossíveis |

---

## Plano de Migração

| Fase | Escopo | Duração |
|------|--------|---------|
| 1 | Core (Rational, AST, Engine, Rounding, Signature) | 4 semanas |
| 2 | Builder (Fluent API) | 2 semanas |
| 3 | Output (formatos de saída) | 2 semanas |
| 4 | Parser (Lexer + Parser) | 1 semana |
| 5 | Processadores (Protobuf, CBOR, MessagePack) | 2 semanas |
| 6 | Validação e Benchmarks | 1 semana |

**Total estimado**: 12 semanas

---

## Compatibilidade

A implementação Rust será **totalmente compatível** com o TypeScript:

- Mesmo formato de serialização JSON
- Mesma assinatura BLAKE3 + JCS
- Mesmos resultados de cálculo
- Mesmas estratégias de rounding

Isso permite **migração gradual** sem interromper o desenvolvimento.

---

## Conclusão

A reimplementação em Rust da CalcAUY oferece:

1. **Performance superior**: 2-5x mais rápida, com assinatura 30-100x mais rápida
2. **Segurança garantida**: Type safety e memory safety em tempo de compilação
3. **Arquitetura modular**: Core enxuto com camadas desacopladas
4. **Compatibilidade total**: Migração gradual sem breaking changes
5. **Manutenibilidade**: Código limpo, testável e documentado

A proposta é **viável, vantajosa e recomendada**.

---

## Próximos Passos

1. **Aprovação** da proposta
2. **Setup** do workspace Cargo
3. **Início** da Fase 1 (Core)
4. **Definição** de milestones e entregáveis
5. **Alocação** de recursos

---

**Data**: 2026
**Autor**: Equipe CalcAUY
**Licença**: MPL-2.0
