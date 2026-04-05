# 00 - Visão Panorâmica da Engenharia CalcAUY

> **Nota:** Este documento é um espelho do `docs/PANORAMA.md` e serve como ponto de entrada para as especificações técnicas (specs/01 a specs/14).

## Essência do Projeto
A **CalcAUY** trata o cálculo não como um resultado volátil, mas como um **documento persistente e contextualizado**.

## Fluxo Técnico de Dados e Auditoria

1.  **Entrada (`specs/08`):** Ingestão restritiva de dados.
2.  **Representação (`specs/01`, `specs/02`):** `RationalNumber` para precisão. **Simplificação via MDC (GCD)** automática para otimizar memória e performance.
3.  **Construção e Enriquecimento (`specs/10`):** 
    - **Fluent API:** Construção da árvore AST.
    - **Metadados:** `.setMetadata()` anexa o contexto de negócio a cada operação.
    - **Hibernação:** `.hibernate()` (ou `.getAST()`) extrai o estado atual para armazenamento persistente.
4.  **Precedência e Execução (`specs/07`, `specs/13`):** O `commit()` aplica regras como **NBR-5891**.
5.  **Saída e Acessibilidade (`specs/09`, `specs/14`):** Geração de multiformatos com rastro forense.
6.  **Qualidade e Rigor (`specs/15`):** Padrões de tipagem estrita e performance.
7.  **Extensibilidade (`specs/16`):** Processadores de saída customizados e injeção de lógica.

## Resumo de Métodos Principais

### Classe `CalcAUY` (Builder)
- `add()`, `sub()`, `mult()`, `div()`, `pow()`, `mod()`, `divInt()`
- `group()`: Agrupamento manual.
- **`parseExpression(str)`**: Parser de strings matemáticas complexas (com auto-agrupamento).
- **`setMetadata(key, val)`**: O pilar da auditoria.
- **`hibernate()`**: Serializa a árvore atual (JSON). Alias: `getAST()`.
- **`static hydrate(ast)`**: Reconstrói a instância (com auto-agrupamento inteligente).
- `commit(strategy)`: Finaliza e congela o cálculo.

### Classe `CalcAUYOutput` (Result)
- `toMonetary()`, `toString()`, `toLaTeX()`, `toHTML()`, `toUnicode()`, `toImageBuffer()`
- **`toSlice()` / `toSliceByRatio()`**: Rateio exato de centavos (Algoritmo de Maior Resto).
- `toVerbalA11y()`: Tradução humana da fórmula.
- `toAuditTrace()`: Snapshot JSON completo com metadados e valores intermediários.

---
*Para detalhes de implementação, consulte os arquivos numerados de 01 a 14 neste diretório.*
