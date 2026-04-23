# CalcAUY: Central de Documentação

Bem-vindo à documentação oficial da **CalcAUY** (Audit + A11y). Esta biblioteca foi projetada para substituir o modelo de ponto flutuante tradicional por um sistema de **Projeção Racional Auditável**, focado em precisão absoluta, segurança forense e acessibilidade universal.

---

## 🧭 Visão Geral do Sistema

A CalcAUY não processa números de forma imediata. Ela constrói uma **Árvore de Sintaxe Abstrata (AST)** imutável que registra a intenção do cálculo, permitindo que o resultado seja auditado, assinado digitalmente e traduzido para diversas linguagens e formatos.

### Fluxo de Operação e Lifetimes

```mermaid
flowchart TD
    subgraph L1 [<b>1. Ingestão (Input Lifetime)</b>]
        direction TB
        Raw[Raw Input: String/BigInt/%] --> Parser[Parser Numérico Estrito]
        Parser --> Rat[RationalNumber n/d]
    end

    subgraph L2 [<b>2. Construção (Build Lifetime)</b>]
        direction TB
        Rat --> Fluent[Fluent API: add/mult/...]
        Fluent --> AST[AST Imutável]
        AST --> Meta[Enriquecimento: setMetadata]
    end

    subgraph L3 [<b>3. Execução (Commit Lifetime)</b>]
        direction TB
        Meta --> Commit[<b>commit()</b>]
        Commit --> Collapse[Colapso Racional MDC]
        Collapse --> Lacre[<b>Lacre Digital BLAKE3</b>]
    end

    subgraph L4 [<b>4. Projeção (Output Lifetime)</b>]
        direction TB
        Lacre --> LaTeX[LaTeX / Imagem / HTML]
        Lacre --> Finance[Monetary / Slicing]
        Lacre --> A11y[Verbal A11y]
    end

    L1 ==> L2 ==> L3 ==> L4

    %% Estilização para Confiança
    style Lacre fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    style Commit fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style L3 fill:#fff9c4,stroke:#fbc02d,stroke-dasharray: 5 5
```
---

## 🗂️ Mapa da Documentação

Para facilitar o aprendizado, a documentação está dividida em camadas de profundidade:

### 1. Fundamentos e Conceitos
Entenda a filosofia por trás do projeto e como os dados são tratados internamente.
*   [**Arquitetura Interna**](./internal-architecture.md): Detalhamento dos 4 ciclos de vida (Lifetimes) do dado.
*   [**Guia de Entradas (Inputs)**](./inputs.md): O rigor do parser de ingestão e tipos permitidos.
*   [**Estratégias de Arredondamento**](./rounding.md): Como a NBR 5891 e outras normas são aplicadas.

### 2. Referência da API (Builder)
A porta de entrada para criar seus cálculos através da classe `CalcAUY`.
*   [**Resumo de Métodos do Builder**](./builder-methods.md): Tabela rápida de funções.
*   **Destaques:**
    *   [`create()`](./builder-methods/create.md): O início obrigatório de qualquer jurisdição de cálculo.
    *   [`from()`](./builder-methods/from.md): Ingestão de valores na instância.
    *   [`addFromExternalInstance()`](./builder-methods/addFromExternalInstance.md): Integração segura entre contextos.
    *   [`hydrate()`](./builder-methods/hydrate.md) & [`checkIntegrity()`](./builder-methods/checkIntegrity.md): Segurança e persistência.

### 3. Referência da API (Output)
Como extrair resultados e provas matemáticas após o `commit()`.
*   [**Resumo de Métodos de Saída**](./output-methods.md): Formatos disponíveis na classe `CalcAUYOutput`.
*   **Destaques:**
    *   [`toMonetary()`](./output-methods/toMonetary.md): Formatação localizada de moeda.
    *   [`toAuditTrace()`](./output-methods/toAuditTrace.md): O rastro técnico definitivo.
    *   [`toVerbalA11y()`](./output-methods/toVerbalA11y.md): Acessibilidade fonética.

### 4. Segurança e Auditoria
Para cenários que exigem blindagem jurídica e técnica de nível militar.
*   [**Segurança e Defesa Jurídica**](./security-audit-deep-dive.md): Como usar a lib para proteção contra fraudes e erros de precisão.

### 5. Tratamento de Erros
Entenda as proteções da engine e como lidar com exceções.
*   [**Guia de Erros**](./errors.md): Tabela rápida e glossário de exceções da engine.

---

## 🛠️ Especificações Técnicas (Rigor de Engenharia)

Se você precisa entender os detalhes profundos de implementação ou contribuir com o core, consulte as **Specs** na pasta `docs/specs/`:

*   [**Spec 00: Visão Panorâmica**](../specs/00-Panoramic-Overview.md): O espelho técnico desta documentação.
*   [**Spec 01: RationalNumber**](../specs/01-RationalNumber.md): A unidade básica de precisão (Numerador/Denominador).
*   [**Spec 19: Assinaturas Digitais**](../specs/19-Digital-Signature-Integrity.md): O protocolo BLAKE3 e K-Sort.

---

## 💡 Por onde começar?

1.  **Novo no projeto?** Comece pela [Arquitetura Interna](./internal-architecture.md).
2.  **Precisa integrar uma API?** Veja os [Métodos do Builder](./builder-methods.md).
3.  **Dúvida sobre arredondamento fiscal?** Consulte o guia de [Arredondamento](./rounding.md).

> **Nota:** A CalcAUY é agnóstica de runtime e pode ser executada em Deno, Node.js ou diretamente no Browser/Front-end.
