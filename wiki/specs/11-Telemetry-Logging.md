# 11 - Telemetria e Logs Estruturados (LogTape 2.0)

```mermaid
flowchart TD
    Op[Operation Trigger] --> Capture[Event Capture]
    Capture --> Sanitize["PII Sanitizer (Redaction)"]
    Sanitize --> LogTape[LogTape Driver]
    LogTape --> Stream["Console / Remote / File"]
```

## Objetivo
Definir o padrão de instrumentação da biblioteca, garantindo que desenvolvedores e auditores possam monitorar o fluxo de execução, diagnosticar falhas e verificar a integridade da AST sem comprometer a performance ou a privacidade na CalcAUY.

## Configuração Global
A biblioteca utiliza o LogTape 2.0 de forma agnóstica.
- **ID Global:** `getLogger(["calc-auy"])`
- **Namespaces:** Os logs devem ser organizados em sub-categorias para filtragem granular:
  - `["calc-auy", "engine", "..."]`: Para operações de construção da AST e colapso matemático.
  - `["calc-auy", "output", "..."]`: Para processos de formatação, renderização e arredondamento.
  - `["calc-auy", "parser"]`: Para validação e entrada de dados.

## Níveis de Log e Gatilhos

### 1. Fase de Cálculo (Engine)
- **Nível:** `Debug`
- **Gatilho:** Cada operação de anexação na AST (`add`, `sub`, `pow`, etc.).
- **Conteúdo Requerido:**
  - `operation`: Nome da operação (ex: "add").
  - `ast_structure`: Representação estrutural da AST (tipos de nós e hierarquia, **sem valores literais ou metadados**).
  - `input_type`: Tipo do valor de entrada (string, number, CalcAUY).
- **Restrição de PII:** É proibido logar o conteúdo de `RationalValue` ou `MetadataValue`.
- **Exemplo:** `getLogger(["calc-auy", "engine", "add"]).debug("Node appended to AST", { structure: getSanitizedAST(currentAST) })`

### 2. Fase de Saída (Output)
- **Nível:** `Info`
- **Gatilho:** Chamada de qualquer método de exportação em `CalcAUYOutput`.
- **Conteúdo Requerido:**
  - `output_method`: O método chamado (ex: "toMonetary").
  - `options`: Parâmetros passados ao método (ex: `decimalPrecision`).
- **Restrição de PII:** Não deve logar o `final_ast` completo nem o `internal_value` real. O log serve apenas para métricas de uso e performance.

### 3. Fase de Erro
- **Nível:** `Error` ou `Warn`
- **Gatilho:** Exceções disparadas (`CalcAUYError`).
- **Conteúdo Requerido:**
  - `error_type`: Categoria do erro (ex: "division-by-zero").
  - `partial_ast_structure`: Estrutura da árvore no momento da falha (sanitizada).
  - `operation_context`: Dados técnicos da falha (sanitizados).

## Segurança e Anonimização (PII)
Para garantir conformidade com LGPD/GDPR e proteger dados sensíveis:
1. **Redação Obrigatória:** Todos os logs devem passar por um utilitário de sanitização que substitui valores numéricos e metadados por `[REDACTED]`.
2. **Máscara de Valores:** Embora o rastro matemático seja público no output da lib para o usuário, nos logs de infraestrutura ele deve ser ocultado.

## Estrutura Visual do Log no Console
```text
[DEBUG] calc-auy.engine.pow: Exponenciação adicionada à AST. { assoc: "right", nodes: 3 }
[INFO]  calc-auy.output.latex: LaTeX gerado com sucesso. { formula: "\frac{x}{y}", duration: "2ms" }
```

## Benefícios para Auditoria
Ao registrar a AST em cada passo do `engine` no nível `Debug`, é possível reconstruir visualmente a "árvore de decisão" do programador que montou o cálculo, permitindo identificar exatamente onde uma precedência foi mal aplicada ou um agrupamento foi esquecido.
