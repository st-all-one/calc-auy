# 12 - Sistema de Erros e Diagnósticos (CalcAUYError)

## Objetivo
Definir a arquitetura de tratamento de exceções da biblioteca, garantindo que qualquer falha (seja no parsing, cálculo ou output) forneça metadados suficientes para auditoria forense e recuperação de estado na CalcAUY.

## Padrão de Representação (RFC 7807)
A classe `CalcAUYError` deve ser serializável e compatível com o padrão de "Problem Details", facilitando o transporte via HTTP em aplicações distribuídas.

### Estrutura da Classe `CalcAUYError`
- `type: string` (URI ou identificador único do erro, ex: `calc-auy/division-by-zero`).
- `title: string` (Resumo curto e legível por humanos).
- `status: number` (Sugestão de código HTTP equivalente, ex: 400 para Parser, 422 para Cálculo).
- `detail: string` (Explicação detalhada da causa da falha).
- `instance: string` (UUID único da ocorrência do erro para correlação em logs).
- `context: ErrorContext` (Objeto contendo o estado técnico do erro).

## Categorias de Erros e Severidade

| Categoria | Tipo | Descrição | Severidade |
| :--- | :--- | :--- | :--- |
| **Parser** | `invalid-syntax` | Erro de gramática na string de entrada. | Alta |
| **Input** | `unsupported-type` | Valor de entrada não permitido (ex: null, object). | Média |
| **Math** | `division-by-zero` | Tentativa de divisão por zero em qualquer nó. | Crítica |
| **Math** | `complex-result` | Operação resultou em número complexo não suportado. | Média |
| **Output** | `invalid-precision` | Precisão decimal negativa ou inválida solicitada. | Baixa |
| **AST** | `corrupted-node` | Tentativa de hidratar uma AST com estrutura inválida. | Alta |

## O Contexto de Diagnóstico (`ErrorContext`)
Para cada erro disparado, o motor deve anexar o máximo de informações possível:
- `operation`: Nome da operação que falhou (ex: `pow`, `div`).
- `partialAST`: O estado da árvore AST no momento exato da falha (se disponível).
- `rawInput`: O valor bruto que causou a exceção.
- `stack`: Pilha de execução (preservada da exceção original).

## Handler de Captura e Telemetria
A biblioteca deve fornecer um utilitário interno de tratamento:
1. **Interceptação:** Captura erros nativos (como `BigInt` division by zero) e os encapsula em `CalcAUYError`.
2. **Log Automático:** Dispara imediatamente o `getLogger(["calc-auy", "error"]).error()` conforme definido no `specs/11`.
3. **Anonimização:** Remove dados sensíveis do `ErrorContext` antes de enviar para logs públicos, se configurado.

## Exemplo de JSON de Erro (Serializado)
```json
{
  "type": "calc-auy/division-by-zero",
  "title": "Erro Matemático Crítico",
  "status": 422,
  "detail": "Não é possível dividir o numerador 100 pelo denominador 0.",
  "instance": "urn:uuid:66f97d51-3827-4648",
  "context": {
    "operation": "div",
    "rawInput": "0",
    "partialAST": { "type": "literal", "value": { "n": "100", "d": "1" } }
  }
}
```

## Benefícios para Auditoria
Diferente de um `Error` genérico, o `CalcAUYError` permite que um desenvolvedor capture a exceção e mostre ao usuário final (ou auditor) exatamente qual parte da fórmula causou o problema, incluindo a visualização LaTeX da sub-expressão que falhou.
