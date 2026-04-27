# 02 - Estrutura de Árvore (AST) e Persistência

```mermaid
graph TD
    Root[OperationNode: add] --> Left[LiteralNode: 10]
    Root --> Right[GroupNode]
    Right --> Child[OperationNode: mul]
    Child --> L[LiteralNode: 5]
    Child --> R[LiteralNode: 2]
```

## Objetivo
Definir uma estrutura de Árvore de Sintaxe Abstrata (AST) que permita a recuperação do cálculo de qualquer ponto (hibernação/hidratação) e suporte auditoria plena sob o motor CalcAUY.

## Definição dos Nós
Cada nó da árvore representa uma operação ou um valor literal.

### Tipos de Nós (`CalculationNode`)
1. **LiteralNode:** Representa um valor fixo.
   - `value: RationalNumber`
   - `originalInput: string` (Nota: Em casos de percentual como "10%", este campo é normalizado para "10/100" para evitar ambiguidades no rastro).
2. **OperationNode:** Representa uma operação entre operandos.
   - `type: 'add' | 'sub' | 'mul' | 'div' | 'pow' | 'mod' | 'divInt'`
   - `operands: CalculationNode[]`
3. **GroupNode:** Representa o agrupamento léxico `(...)`.
   - `child: CalculationNode`

## Serialização e Recuperação
A AST deve ser facilmente conversível para um objeto JSON plano e reconstruível a partir deste.

### Exemplo de JSON (Hibernação)
```json
{
  "type": "add",
  "operands": [
    {
      "type": "literal",
      "value": { "n": "10", "d": "1" }
    },
    {
      "type": "group",
      "child": {
        "type": "mul",
        "operands": [
          { "type": "literal", "value": { "n": "5", "d": "1" } },
          { "type": "literal", "value": { "n": "2", "d": "1" } }
        ]
      }
    }
  ]
}
```

## Metadados de Auditoria
Cada nó pode carregar metadados que auxiliem na reconstrução visual e verbal:
- `metadata?: Record<string, MetadataValue>` (Dados extras de contexto de negócio)

## Fluxo de Execução
A AST é construída incrementalmente durante as chamadas de métodos (`add`, `sub`, etc.) ou de uma vez via `parser`. O cálculo real só ocorre quando o nó raiz é "colapsado" através de um método de execução (commit).
