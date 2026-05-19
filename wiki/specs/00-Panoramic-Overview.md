# 00 - Visão Panorâmica da Engenharia CalcAUY

```mermaid
flowchart LR
    Create[CalcAUY.create] --> Ingest[from / parse]
    Ingest --> Build[AST Construction]
    Build --> Commit[commit / Lacre]
    Commit --> Output[toMonetary / toLaTeX / ...]
    
    subgraph Jurisdição
        Ingest
        Build
    end
    
    subgraph Execução
        Commit
        Output
    end
```

> **Nota:** Este documento é um espelho do `docs/PANORAMA.md` e serve como ponto de entrada para as especificações técnicas (specs/01 a specs/14).

## Essência do Projeto
A **CalcAUY** trata o cálculo não como um resultado volátil, mas como um **documento persistente e contextualizado**.

## Fluxo Técnico de Dados e Auditoria

1.  **Entrada (`specs/08`):** Ingestão restritiva de dados.
2.  **Representação (`specs/01`, `specs/02`):** `RationalNumber` para precisão. **Simplificação via MDC (GCD)** automática para otimizar memória e performance.
3.  **Construção e Enriquecimento (`specs/10`):** 
    - **Fluent API:** Construção da árvore AST.
    - **Metadados:** `.setMetadata()` anexa o contexto de negócio a cada operação.
    - **Hibernação:** `.hibernate()` extrai o estado atual selado com assinatura digital.
4.  **Precedência e Execução (`specs/07`, `specs/13`):** O `commit()` aplica regras como **NBR-5891** e assina o resultado.
5.  **Saída e Acessibilidade (`specs/09`, `specs/14`):** Geração de multiformatos com rastro forense.
6.  **Proteção de Dados e Telemetria (`specs/11`, `specs/17`, `specs/19`):** Sistema de proteção de PII (*Security by Default*) e integridade militar via **BLAKE3**.
7.  **Qualidade e Rigor (`specs/15`):** Padrões de tipagem estrita e performance.
8.  **Extensibilidade (`specs/16`):** Processadores de saída customizados e injeção de lógica.
9.  **Testes e Snapshot (`specs/18`):** Protocolo determinístico para validação de assinaturas.
10. **Processamento em Massa (`specs/23`):** Utilitários de *Batch Processing* para evitar o bloqueio do Event Loop.

## Resumo de Métodos Principais

### Classe `CalcAUY` (Factory & Utils)
- **`create({contextLabel, salt, ...})`**: Ponto inicial obrigatório. Gera a jurisdição isolada.
- **`checkIntegrity(ast, {salt})`**: Valida a assinatura de um rastro sem reconstruir a árvore (**Promise<boolean>**).

### Classe `CalcAUYLogic` (Builder)
- `add()`, `sub()`, `mult()`, `div()`, `pow()`, `mod()`, `divInt()`
- `group()`: Agrupamento manual.
- **`fromExternalInstance(ext)`**: Portal de integração entre jurisdições.
- **`hibernate()`**: Serializa a árvore atual selada (**Promise<string>**).
- **`hydrate(ast, {salt})`**: Reconstrói a instância validando assinatura digital (**Promise**).
- **`commit(roundStrategy)`**: Finaliza, colapsa e assina o cálculo (**Promise**).

### Classe `CalcAUYOutput` (Result)
- `toMonetary()`, `toStringNumber()`, `toLaTeX()`, `toUnicode()`, `toMermaidGraph()`
- **`toLiveTrace()`**: Retorna o rastro completo como objeto vivo e tipado (**SerializedCalculation**).
- **`toSlice()` / `toSliceByRatio()`**: Rateio exato de centavos (Algoritmo de Maior Resto).
- `toVerbalA11y()`: Tradução humana da fórmula.
- `toAuditTrace()`: Snapshot JSON completo com metadados e assinatura de integridade.
- **`toJSON(keys?, options?)`**: Exportação consolidada com assinatura injetada.
- **`toCustomOutput(processor)`**: Gateway para processadores modulares (HTML, Imagem, Protobuf).

## Pilares de Performance
1.  **GCD Híbrido:** Uso de atalhos de hardware e operador nativo V8 para simplificação ultra-rápida de frações.
2.  **Sistema de Cache em Três Níveis:**
    - **Session Cache:** Cache escopado para processamento em lote.
    - **Hot Cache:** Referências fortes para valores de alta frequência.
    - **Global WeakRef Cache:** Reuso inteligente de nós AST e números racionais sem impedir o Garbage Collector.
3.  **Hierarchical Flattening (O(log N)):** Aplanamento automático de operações lineares massivas, evitando estouro de pilha e garantindo performance estável.
4.  **Static Asset Inlining:** CSS e Fontes (Base64) embutidos nos processadores modulares garantem renderização instantânea.
