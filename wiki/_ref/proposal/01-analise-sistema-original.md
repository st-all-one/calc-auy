# 01 — Análise do Sistema Original (calc-auy-ts)

## Visão Geral

A **CalcAUY** é uma infraestrutura aritmética em TypeScript/Deno que trata cálculos como **artefatos auditáveis e imutáveis**, resolvendo o risco sistêmico do padrão IEEE 754 (ponto flutuante binário) através de:

- **Aritmética racional exata** (frações `n/d` com `BigInt`)
- **AST imutável** construída via fluent API
- **Assinatura criptográfica** (BLAKE3 + JCS) para integridade
- **Multi-formato de saída** (monetário, LaTeX, Unicode, verbal, Mermaid)

---

## Arquitetura em 4 Lifetimes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE VIDA DO CÁLCULO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ENTRADA (Input)                                                         │
│     ┌──────────┐    ┌─────────────┐    ┌─────────────────────────────────┐  │
│     │ String   │───▶│ Lexer/      │───▶│ RationalNumber (n/d BigInt)     │  │
│     │ Number   │    │ Validator   │    │ Cache: Hot(512) + Cold(WeakRef) │  │
│     │ BigInt   │    └─────────────┘    └─────────────────────────────────┘  │
│     └──────────┘                                                            │
│                                                                             │
│  2. CONSTRUÇÃO (AST)                                                        │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │  Fluent Builder: .from() .add() .mult() .group() .setMetadata()   │  │
│     │  ↓                                                                 │  │
│     │  AST Imutável: LiteralNode | OperationNode | GroupNode | Control   │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  3. COLAPSO (Commit)                                                        │
│     ┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌────────────────┐  │
│     │ evaluate │───▶│ Rounding    │───▶│ GCD      │───▶│ BLAKE3 Sign    │  │
│     │ (pós-    │    │ (NBR5891/   │    │ Simplify │    │ + JCS          │  │
│     │  ordem)  │    │  HALF_UP..) │    │          │    │                │  │
│     └──────────┘    └─────────────┘    └──────────┘    └────────────────┘  │
│                                                                             │
│  4. SAÍDA (Output)                                                          │
│     ┌────────────────────────────────────────────────────────────────────┐  │
│     │  toMonetary()  toLaTeX()  toUnicode()  toVerbalA11y()             │  │
│     │  toMermaidGraph()  toSlice()  toAuditTrace()  toCustomOutput()    │  │
│     └────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Detalhados

### 1. `RationalNumber` (`src/core/rational.ts`)

**Responsabilidade**: Representar números racionais exatos como frações `n/d` com `BigInt`.

**Características**:
- **Imutabilidade**: Campos privados `#n` e `#d`, sem setters
- **Simplificação automática**: GCD (algoritmo de Euclides) aplicado em toda operação
- **Normalização de sinal**: Denominador sempre positivo
- **Cache de dois níveis**:
  - **Hot Cache**: `Map<string, RationalNumber>` com 512 entradas (referências fortes)
  - **Cold Cache**: `Map<string, WeakRef<RationalNumber>>` com `FinalizationRegistry`
- **Safety monitor**: Limite de 1 milhão de bits para prevenir DoS

**Operações suportadas**:
| Operação | Método | Complexidade |
|----------|--------|--------------|
| Adição | `add()` | O(1) amortizado |
| Subtração | `sub()` | O(1) amortizado |
| Multiplicação | `mul()` | O(1) amortizado |
| Divisão | `div()` | O(1) amortizado |
| Potenciação | `pow()` | O(log n) com estimativa de bits |
| Módulo | `mod()` | O(1) |
| Divisão inteira | `divInt()` | O(1) |
| Valor absoluto | `abs()` | O(1) |
| Negação | `negate()` | O(1) |
| Comparação | `compare()` | O(1) |
| Conversão | `toDecimalString()` | O(precision) |

**Pontos de atenção para Rust**:
- `BigInt` do JS é arbitrário como `num-bigint::BigInt`
- O cache de dois níveis pode ser simplificado com `OnceLock` ou removido (alocações são baratas em Rust)
- O GCD pode usar `num_integer::gcd`

---

### 2. AST (`src/ast/types.ts`, `src/ast/engine.ts`)

**Responsabilidade**: Representar a estrutura do cálculo como árvore imutável.

**Tipos de nós**:
```typescript
type CalculationNode = 
  | LiteralNode      // { kind: "literal", value: {n, d}, originalInput: string }
  | OperationNode    // { kind: "operation", type: OperationType, operands: [] }
  | GroupNode        // { kind: "group", child: CalculationNode }
  | ControlNode      // { kind: "control", type: "reanimation_event", metadata: {...} }
```

**Operações**:
- `add`, `sub`, `mul`, `div`, `pow`, `mod`, `divInt`, `crossContextAdd`

**Engine de avaliação**:
- **Percurso pós-ordem iterativo** (stack-based, não recursivo)
- **Limite de profundidade**: 500 níveis (`MAX_RECURSION_DEPTH`)
- **Validação de nós**: Detecção de ciclos, limite de 1000 nós

**Pontos de atenção para Rust**:
- Usar `enum` com `Box<CalculationNode>` para recursão
- O percurso iterativo pode ser mantido ou substituído por recursão com stack explícita
- Validação pode ser feita em tempo de construção (type state pattern)

---

### 3. Builder (`src/builder.ts`)

**Responsabilidade**: Fluent API para construção da AST.

**Métodos principais**:
| Método | Descrição |
|--------|-----------|
| `from(value)` | Inicia cálculo a partir de valor |
| `parseExpression(str)` | Parser de expressão string |
| `add/sub/mult/div/pow/mod/divInt(value)` | Operações binárias |
| `group()` | Agrupa expressão atual |
| `setMetadata(key, value)` | Anexa metadados |
| `hibernate()` | Serializa AST com assinatura |
| `hydrate(ast)` | Reconstrói de estado serializado |
| `fromExternalInstance(ext)` | Importa de outro contexto |
| `commit()` | Finaliza e avalia |

**Características**:
- **Imutabilidade**: Cada método retorna nova instância
- **Validação de instância**: Símbolo único por contexto
- **Hierarchical Flattening**: Aplanamento automático quando > 100 operandos

**Pontos de atenção para Rust**:
- O builder pode consumir `self` e retornar `Self` (ownership transfer)
- Validação de instância pode usar `TypeId` ou token de instância
- O flattening pode ser feito com `Vec` e `chunks`

---

### 4. Assinatura e Integridade (`src/utils/security.ts`)

**Responsabilidade**: Garantir integridade do cálculo via assinatura criptográfica.

**Pipeline**:
```
Data → JCS (RFC 8785) → TextEncoder → BLAKE3 → Encoder (HEX/BASE64/BASE58/BASE32)
```

**JCS (JSON Canonicalization Scheme)**:
- Chaves ordenadas por UTF-8 code point
- Sem whitespace
- Números sem expoente, sem zeros à esquerda/direita
- Strings com escape JSON padrão

**Codificações suportadas**:
- `HEX` (padrão)
- `BASE64`
- `BASE58`
- `BASE32`

**Pontos de atenção para Rust**:
- Usar `blake3` crate (implementação oficial)
- Serialização canônica com `serde` + ordenação de chaves (`BTreeMap`)
- A codificação BASE58 pode precisar de crate externa (`bs58`)

---

### 5. Rounding (`src/core/rounding.ts`)

**Estratégias**:
| Estratégia | ID Visual | Descrição |
|------------|-----------|-----------|
| `NBR5891` | NBR-5891 | Norma brasileira (0.5 → par mais próximo) |
| `HALF_UP` | HALF-UP | Comercial (0.5 → cima) |
| `HALF_EVEN` | HALF-EVEN | Bancário (0.5 → par) |
| `TRUNCATE` | TRUNCATE | Corte seco |
| `CEIL` | CEIL | Teto |
| `NONE` | NONE | Sem arredondamento |

**Cache de potências**: Array de 128 elementos para `10^n` e `10^n / 2`

**Pontos de atenção para Rust**:
- Implementar como `enum` com métodos
- Cache pode ser `const` array ou `lazy_static`

---

### 6. Output (`src/output.ts`)

**Formatos de saída**:
| Método | Formato | Uso |
|--------|---------|-----|
| `toStringNumber()` | String decimal | Geral |
| `toScaledBigInt()` | BigInt escalado | Persistência |
| `toMonetary()` | Moeda localized | Financeiro |
| `toLaTeX()` | LaTeX | Documentação |
| `toUnicode()` | Unicode com subscritos | CLI |
| `toVerbalA11y()` | Linguagem natural | Acessibilidade |
| `toMermaidGraph()` | Mermaid sequence | Visualização |
| `toSlice()` | Array de strings | Rateio |
| `toAuditTrace()` | JSON assinado | Auditoria |
| `toCustomOutput()` | Extensível | Processadores |

**Pontos de atenção para Rust**:
- Separar em traits: `Monetary`, `Latex`, `Unicode`, `Verbal`, `Mermaid`
- Cada trait implementa um método `format(&self) -> String`
- Cache de resultados com `OnceCell`

---

### 7. Parser (`src/parser/`)

**Lexer**: Tokeniza números, operadores, parênteses
**Parser**: Descida recursiva com precedência (PEMDAS)

**Gramática**:
```
expression → term (('+' | '-') term)*
term       → power (('*' | '/' | '//' | '%') power)*
power      → primary ('^' power)?
primary    → NUMBER | '(' expression ')'
```

**Pontos de atenção para Rust**:
- Usar `nom` ou `pest` para parser
- Ou implementar manualmente (lexer + parser recursivo)

---

### 8. i18n (`src/output_internal/i18n.ts`)

**Locales suportados**:
- `pt-BR`, `en-US`, `en-EU`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`, `zh-CN`, `ja-JP`

**Estrutura por locale**:
- Separadores (decimal, milhar, falado)
- Símbolos de moeda
- Operadores traduzidos
- Frases (isEqual, rounding, for, decimalPlaces)
- Termos Mermaid

**Pontos de atenção para Rust**:
- Usar `fluent` crate (padrão Mozilla)
- Ou tabela estática com `match`

---

### 9. Processadores (`processor/`)

**Processadores binários**:
- `protobuf`: Protobuf v3 com `prost`
- `cbor`: CBOR com `ciborium`
- `msgpack`: MessagePack with `rmp-serde`

**Processadores de saída**:
- `html`: Renderização KaTeX
- `image-buffer`: Geração de SVG
- `persistence`: Mapeamento para banco de dados

**Pontos de atenção para Rust**:
- `prost` para Protobuf
- `ciborium` para CBOR
- `rmp-serde` para MessagePack

---

## Pontos Críticos para Reimplementação

### 1. Determinismo da Assinatura
- **Problema**: `HashMap` em JS não tem ordem garantida
- **Solução**: Usar `BTreeMap` ou ordenar chaves antes de serializar

### 2. Cache de Literais
- **Problema**: `WeakRef` e `FinalizationRegistry` são específicos de JS
- **Solução**: Em Rust, alocações são baratas; cache pode ser removido ou simplificado

### 3. Async/Sync
- **Problema**: `commit()` é async por causa de `crypto.subtle.digest`
- **Solução**: Em Rust, BLAKE3 é síncrono; API pode ser síncrona

### 4. Metadados com Prototype Chain
- **Problema**: JS usa `Object.create()` para herança de metadados
- **Solução**: Usar `HashMap<String, MetadataValue>` ou estrutura plana

### 5. Erros RFC 7807
- **Problema**: Formato específico com UUID
- **Solução**: Struct com `thiserror` e `uuid` crate

---

## Métricas do Projeto Original

| Métrica | Valor |
|---------|-------|
| Linhas de código | ~5.253 |
| Testes | ~3.428 linhas |
| Coverage | 96.3% |
| Locales | 8 |
| Estratégias de rounding | 6 |
| Processadores | 6 |
| Tempo de cálculo simples | ~0.003ms |
| Tempo de cálculo complexo | ~5.4ms |

---

## Conclusão da Análise

A CalcAUY é um sistema bem arquitetado com clara separação de responsabilidades. A reimplementação em Rust deve:

1. **Manter a semântica** dos 4 lifetimes (Input → AST → Commit → Output)
2. **Simplificar o cache** (alocações em Rust são baratas)
3. **Tornar síncrono** (BLAKE3 é síncrono em Rust)
4. **Usar type safety** para garantir invariantes em tempo de compilação
5. **Modularizar** com features opcionais

A próxima seção detalha a arquitetura proposta em Rust.
