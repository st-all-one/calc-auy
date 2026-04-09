# 07 - Tabela de Precedência e Associatividade Rigorosa

## Objetivo
Estabelecer a "Lei de Execução" do motor CalcAUY, garantindo que qualquer expressão, seja via Parser ou via encadeamento de métodos, resulte em uma Árvore AST matematicamente correta e previsível.

## Tabela de Hierarquia (Maior para Menor)

| Nível | Operação | Símbolo | Associatividade | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Agrupamento** | `( ... )` ou `.group()` | N/A | Força a avaliação prioritária do conteúdo interno. |
| 2 | **Exponenciação** | `^` ou `**` | **Direita** | `a^b^c` é avaliado como `a^(b^c)`. |
| 3 | **Multiplicativos** | `*`, `/`, `//`, `%` | **Esquerda** | Multiplicação, Divisão, Divisão Inteira e Módulo. |
| 4 | **Aditivos** | `+`, `-` | **Esquerda** | Soma e Subtração. |

## Regras Detalhadas e Casos Extremos

### 1. Associatividade à Direita (Torre de Potências)
Diferente da aritmética linear, a torre de potências deve ser resolvida do topo para a base.
- **Caso Extremo:** `2^3^4^2`
- **Análise AST:** O cálculo deve ser `2^(3^(4^2)) = 2^(3^16) = 2^43046721`.
- **Implementação:** O Parser deve ser recursivo à direita para garantir que o nó de potência mais à direita na string seja o mais profundo na árvore.

### 2. Multiplicação e Operações dentro de Expoentes
O Parser deve tratar o conteúdo do expoente como uma sub-expressão completa apenas se houver agrupamento explícito. Sem parênteses, a exponenciação "rouba" apenas o operando imediato.
- **Caso Extremo:** `2^3*4` vs `2^(3*4)`
- **`2^3*4`:** Avaliado como `(2^3) * 4 = 8 * 4 = 32`. A potência tem precedência superior, então ela é resolvida antes da multiplicação.
- **`2^(3*4)`:** Avaliado como `2^12 = 4096`. O grupo força a multiplicação a ocorrer antes da base ser elevada.

### 3. O Método Especial `.group()` (Fluent API)
No encadeamento de métodos, o `.group()` atua como um "colapsador léxico" da AST construída até aquele momento, isolando as operações anteriores.
- **Comportamento:** Ele envolve toda a AST acumulada em um `GroupNode`.
- **Exemplo:** `CalcAUY.from(10).add(5).group().mult(2)`
- **Resultado:** Produz `(10 + 5) * 2 = 30`. Sem o `.group()`, a chamada `.mult(2)` resultaria em `10 + (5 * 2) = 20` devido à precedência natural da multiplicação.

### 4. Operações Multiplicativas (Mesmo Nível)
Divisão (`/`), Divisão Inteira (`//`) e Módulo (`%`) compartilham o mesmo nível de precedência da multiplicação.
- **Regra:** Em caso de empate (sequência de operações do mesmo nível), resolve-se da **esquerda para a direita**.
- **Exemplo:** `100 / 10 % 3 * 2` -> `((100 / 10) % 3) * 2 = (10 % 3) * 2 = 1 * 2 = 2`.

### 5. Divisão Inteira (`//`) vs Divisão Comum (`/`)
Ambas possuem a mesma precedência. A diferença reside apenas no algoritmo de colapso:
- `/`: Retorna um `RationalNumber` pleno (fração simplificada).
- `//`: Retorna um `RationalNumber` onde o resultado é o piso (`floor`) da divisão, conforme regra euclidiana.

### 6. Tratamento de Sinais Unários
Sinais unários (ex: `-5` ou `+10`) possuem precedência superior à exponenciação no Parser para literais.
- **Exemplo:** `-2^2` deve ser tratado como `(-2)^2 = 4` se o sinal estiver colado ao literal.
- **Decisão CalcAUY:** Para evitar ambiguidades financeiras, sinais unários devem sempre vincular-se ao literal imediatamente à direita. Se a intenção for `-(2^2)`, o uso de parênteses é obrigatório.

## Representação na AST
A estrutura da árvore **DEVE** refletir visualmente a precedência através da profundidade dos nós.
- Operações de **menor precedência** (Soma) ficam mais próximas da **raiz**.
- Operações de **maior precedência** (Potência ou Grupos) ficam nas **folhas** ou sub-níveis profundos.

### Exemplo de AST para `(10 + 5) * 2^3`:
```text
Root: OperationNode(*)
 ├── Left: GroupNode
 │    └── child: OperationNode(+)
 │         ├── Left: LiteralNode(10)
 │         └── Right: LiteralNode(5)
 └── Right: OperationNode(^)
      ├── Left: LiteralNode(2)
      └── Right: LiteralNode(3)
```

## Validação de Redundância e Inconsistência
- **Redundância:** Se o usuário fornecer `(2^3)`, o Parser identifica que os parênteses são redundantes e marca o `GroupNode` como `isRedundant: true`, mas mantém a estrutura para auditoria.
- **Inconsistência:** O Parser deve disparar `CalcAUYError` imediato para expressões como `10 ^ * 5` ou `(10 + 5))`.
