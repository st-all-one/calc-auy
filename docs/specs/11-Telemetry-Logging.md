# 11 - Telemetria e Logs Estruturados (LogTape 2.0)

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
  - `ast_state`: Representação serializada da AST no estado atual (após a operação).
  - `input_type`: Tipo do valor de entrada (string, number, CalcAUY).
- **Exemplo:** `getLogger(["calc-auy", "engine", "add"]).debug("Node appended to AST", { ast: currentAST })`

### 2. Fase de Saída (Output)
- **Nível:** `Info`
- **Gatilho:** Chamada de qualquer método de exportação em `CalcAUYOutput`.
- **Conteúdo Requerido:**
  - `output_method`: O método chamado (ex: "toMonetary").
  - `final_ast`: A árvore AST completa e finalizada.
  - `internal_value`: O valor `RationalNumber` consolidado (numerador/denominador).
  - `options`: Parâmetros passados ao método (ex: `decimalPrecision`).
- **Exemplo:** `getLogger(["calc-auy", "output", "monetary"]).info("Output generated", { method: "toMonetary", value: finalValue })`

### 3. Fase de Erro
- **Nível:** `Error` ou `Warn`
- **Gatilho:** Exceções disparadas (`CalcAUYError`).
- **Conteúdo Requerido:**
  - `error_type`: Categoria do erro (ex: "division-by-zero").
  - `partial_ast`: O estado da árvore no momento da falha.
  - `operation_context`: Dados que causaram o erro.

## Segurança e Anonimização (PII)
Para garantir conformidade com LGPD/GDPR e proteger dados sensíveis que possam estar nos metadados:
1. **Anonimização de Metadados:** Logs não devem imprimir valores de `metadata` se estes forem marcados como sensíveis.
2. **Máscara de Valores:** Embora o rastro matemático seja público por definição na lib, o sistema de logs deve permitir a configuração de um "PII Masker" para ocultar valores monetários reais em ambientes de produção, se solicitado pelo usuário.

## Estrutura Visual do Log no Console
```text
[DEBUG] calc-auy.engine.pow: Exponenciação adicionada à AST. { assoc: "right", nodes: 3 }
[INFO]  calc-auy.output.latex: LaTeX gerado com sucesso. { formula: "\frac{x}{y}", duration: "2ms" }
```

## Benefícios para Auditoria
Ao registrar a AST em cada passo do `engine` no nível `Debug`, é possível reconstruir visualmente a "árvore de decisão" do programador que montou o cálculo, permitindo identificar exatamente onde uma precedência foi mal aplicada ou um agrupamento foi esquecido.
