# 02 - Estrutura de Árvore (AST) e Persistência

## Objetivo
Definir uma estrutura de Árvore de Sintaxe Abstrata (AST) que permita a recuperação do cálculo de qualquer ponto (hibernação/hidratação) e suporte auditoria plena sob o motor CalcAUY.

## Definição dos Nós
Cada nó da árvore representa uma operação ou um valor literal.

### Tipos de Nós (`CalculationNode`)
1. **LiteralNode:** Representa um valor fixo.
   - `value: RationalNumber`
   - `originalInput: string`
2. **OperationNode:** Representa uma operação entre operandos.
   - `type: 'add' | 'sub' | 'mul' | 'div' | 'pow' | 'mod'`
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
Cada nó deve opcionalmente carregar metadados que auxiliem na reconstrução visual e verbal:
- `label?: string` (Para identificação em logs ou dashboards)
- `metadata?: Record<string, unknown>` (Dados extras de contexto de negócio)

## Fluxo de Execução
A AST é construída incrementalmente durante as chamadas de métodos (`add`, `sub`, etc.) ou de uma vez via `parser`. O cálculo real só ocorre quando o nó raiz é "colapsado" através de um método de execução (commit).
