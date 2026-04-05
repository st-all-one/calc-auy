# CalcAUY: Contexto de Engenharia e Desenvolvimento

A **CalcAUY** (Audit + A11y) é uma engine de cálculo matemático de alta precisão baseada em Árvore de Sintaxe Abstrata (AST), desenvolvida em TypeScript para o ecossistema Deno. Ela foca em **auditabilidade forense**, **precisão racional absoluta** e **acessibilidade universal**.

## 🚀 Visão Geral do Projeto

-   **Objetivo:** Substituir `number` (IEEE 754) por um modelo de frações racionais (`n/d`) que suporta 50 casas decimais de precisão interna.
-   **Arquitetura:** AST Imutável. O cálculo é construído como uma árvore e só é "colapsado" (executado) no momento do `commit()`.
-   **Diferenciais:**
    -   **Audit Trace:** Cada operação pode conter metadados de negócio (`setMetadata`).
    -   **Acessibilidade (A11y):** Geração de traduções verbais da fórmula em múltiplos idiomas.
    -   **Persistência (Hibernação):** Métodos `hibernate()` e `hydrate()` para salvar/retomar cálculos complexos via JSON.
    -   **Rateio Exato:** Implementação do Algoritmo de Maior Resto (`toSlice`) para distribuição de centavos.

## 🛠️ Stack Tecnológica

-   **Runtime:** Deno
-   **Linguagem:** TypeScript (Strict Mode)
-   **Logging:** LogTape 2.0 (Zero dependências externas no core)
-   **Gerenciamento de Números:** BigInt nativo (através da classe `RationalNumber`)

## 📜 Convenções de Desenvolvimento (Regras Absolutas)

### 1. Padrão de Testes e Rigor (BDD)
-   **Estrutura:** Todo o código **deve** ser testado utilizando o padrão BDD (`describe` e `it`) da biblioteca padrão (`std`) do Deno.
-   **Estratégia de Evolução:** Os testes existentes devem ser substituídos o **MÍNIMO** possível. A prioridade é sempre a **incrementação** de novos casos de teste.
-   **Revisão:** A lógica de cada novo teste deve ser revisada ao menos uma vez para garantir que reflete o rigor matemático exigido pela especificação.

### 2. Natureza Agnóstica e Portabilidade
-   **Zero Dependências:** O core da biblioteca deve permanecer agnóstico de runtime, sem dependências externas (exceto `logtape` para telemetria).
-   **Universalidade:** O código deve ser capaz de ser executado em qualquer ambiente (Deno, Node.js, Bun) e diretamente no **Browser/Front-end** sem necessidade de polyfills complexos.

### 3. Imutabilidade e Segurança
-   Todas as classes (`CalcAUY`, `RationalNumber`, nós da AST) **devem** ser imutáveis.
-   Utilize `#private` fields para garantir segurança em runtime e encapsulamento rigoroso.
-   O motor de execução deve ser puro e livre de efeitos colaterais.

### 2. Ciclo de Vida do Cálculo
Toda implementação de nova funcionalidade deve respeitar as 4 fases:
1.  **Input:** Ingestão controlada (strings ou números seguros).
2.  **Build:** Fluent API para construção da AST (com auto-agrupamento).
3.  **Commit:** Fase de execução onde a estratégia de arredondamento (ex: NBR-5891) é aplicada.
4.  **Output:** Geração de múltiplos formatos (LaTeX, Monetary, Verbal, Image).

### 3. Performance e Memória
-   **MDC (GCD):** Todas as operações em `RationalNumber` devem aplicar o Máximo Divisor Comum imediatamente para simplificar frações e evitar estouro de memória com BigInts gigantes.

### 4. Telemetry e Erros
-   Logs: Engine (Debug), Output (Info).
-   Erros: Seguir RFC 7807 (Problem Details) com contexto completo da operação falha.

## 🏗️ Comandos Principais (Deno)

-   **Formatação:** `deno task fmt`
-   **Linting:** `deno task lint`
-   **Testes:** `deno task test`
-   **Cobertura:** `deno task coverage:dev`

## 📂 Estrutura de Pastas

-   `specs/`: Especificações técnicas numeradas (00 a 14). **Leia antes de implementar.**
-   `src/`: Código fonte (Engine, Parser, Output Helpers).
-   `tests/`: Testes unitários e de integração (BDD).
-   `docs/`: Documentação de alto nível e panorama.
-   `old_project/`: Referência legada (apenas para análise de contexto).

---
**Importante:** Qualquer modificação na lógica matemática deve ser validada contra os testes de arredondamento fiscal e rastro de auditoria.
