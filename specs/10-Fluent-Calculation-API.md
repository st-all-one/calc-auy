# 10 - API Fluida de Construção de Cálculo (CalcAUY)

## Objetivo
Definir a interface de construção de expressões matemáticas. A `CalcAUY` utiliza o padrão **Fluent Builder**, onde cada operation anexa um nó à Árvore AST em vez de realizar o cálculo imediato.

## Comportamento de Auto-Agrupamento (Critical Feature)
Diferente das APIs tradicionais, a injeção de uma instância de `CalcAUY` em outra resulta em um agrupamento léxico automático.
- **Regra:** `A.op(B)` onde `B` é `CalcAUY` -> `A op (B)`.
- **Exemplo:** `CalcAUY.from(10).mult(CalcAUY.from(2).add(3))` -> `10 * (2 + 3) = 50`. Sem o auto-agrupamento, a precedência da multiplicação poderia corromper a intenção, resultando em `(10 * 2) + 3 = 23`.

## Métodos de Operação Matemática

### `add(value: InputValue): CalcAUY`
- **Operação:** Soma aritmética.
- **AST:** `OperationNode(+)`.
- **Exemplo:** `.add("1.50")` ou `.add(CalcAUY.from(10))`.

### `sub(value: InputValue): CalcAUY`
- **Operação:** Subtração aritmética.
- **AST:** `OperationNode(-)`.

### `mult(value: InputValue): CalcAUY`
- **Operação:** Multiplicação.
- **AST:** `OperationNode(*)`. Respeita a precedência matemática PEMDAS.

### `div(value: InputValue): CalcAUY`
- **Operação:** Divisão racional (Fração).
- **AST:** `OperationNode(/)`. Mantém a precisão infinita via `RationalNumber`.

### `pow(exponent: InputValue): CalcAUY`
- **Operação:** Potência e Raiz (se expoente < 1 ou fracionário).
- **Associatividade:** **Direita** (`a^b^c` = `a^(b^c)`).
- **Exemplo:** `.pow(2)` (Quadrado) ou `.pow("1/2")` (Raiz Quadrada).

### `mod(value: InputValue): CalcAUY`
- **Operação:** Módulo (Resto da divisão).
- **Algoritmo:** **Euclidiano** (O resto é sempre positivo).
- **AST:** `OperationNode(%)`.

### `divInt(value: InputValue): CalcAUY`
- **Operação:** Divisão Inteira (Quociente).
- **Algoritmo:** **Euclidiano** (O quociente de Euclides).
- **AST:** `OperationNode(//)`.

## Métodos de Organização e Auditoria

### `group(): CalcAUY`
- **Descrição:** Envolve manualmente toda a expressão acumulada em um parêntese.
- **Caso de Uso:** `CalcAUY.from(10).add(5).group().mult(2)` -> `(10 + 5) * 2`.

### `setMetadata(key: string, value: unknown): CalcAUY`
- **Descrição:** Anexa dados de auditoria ao nó atual da árvore.
- **Exemplo:** `.setMetadata("description", "Taxa de IOF")`. Estes dados aparecerão no `toAuditTrace()`.

### `hibernate(): CalculationNode`
- **Descrição:** Captura e serializa a árvore atual em um objeto JSON puro para armazenamento duradouro e futura recuperação.
- **Alias:** `getAST()`.
- **Caso de Uso:** Salvar o estado parcial ou final de um cálculo em um banco de dados ou enviá-lo através de uma rede.

## Reidratação, Ingestão e Persistência

### `static parseExpression(expression: string): CalcAUY`
- **Descrição:** Transforma uma expressão matemática em string (ex: `"10 + 5 * (2^3)"`) em uma instância de `CalcAUY` baseada em AST, utilizando as regras de gramática definidas no `specs/03`.
- **Comportamento de Injeção (Auto-Grouping):**
  1. **Como Raiz:** Se for o início da cadeia (`CalcAUY.parseExpression("10 + 5").mult(2)`), a expressão é processada e serve como base inicial.
  2. **Como Operando:** Se for injetada em outro método (`calc.add(CalcAUY.parseExpression("5 * 2"))`), a expressão resultante é tratada como um bloco lógico isolado e **automaticamente envolvida em um `GroupNode`**, resultando em `(expressão_anterior) + (5 * 2)`.
- **Rigor:** Dispara `CalcAUYError` se a string contiver sintaxe inválida ou operadores não suportados.

### `static hydrate(ast: CalculationNode | string): CalcAUY`
- **Descrição:** Reconstrói uma instância ativa de `CalcAUY` a partir de um estado hibernado.
- **Comportamento de Injeção (Auto-Grouping):**
  1. **Como Raiz:** Se for o início de uma cadeia (`CalcAUY.hydrate(AST).add(2)`), a instância resultante atua como o ponto de partida original da expressão, sem parênteses adicionais desnecessários.
  2. **Como Operando:** Se for injetada em um método de outra instância (`CalcAUY.from(10).mult(CalcAUY.hydrate(AST))`), ela é tratada como uma instância normal de `CalcAUY` e, portanto, é **automaticamente envolvida em um `GroupNode`** para proteger sua integridade matemática e precedência.
- **Processo Interno de Rigor:**
  1. **Desserialização:** Se a entrada for uma string, converte para objeto JSON.
  2. **Validação de Integridade:** Verifica se todos os nós possuem os campos obrigatórios (`type`, `operands` ou `value`).
  3. **Reconstrução de Tipos:** Converte os objetos `{n, d}` de volta em instâncias de `RationalNumber`.
  4. **Preservação de Metadados:** Restaura todos os campos de `metadata` originais.
- **Benefício:** Permite o reaproveitamento de cálculos parciais em diferentes contextos de negócio, mantendo a auditabilidade e precisão.

## Finalização (Commit)

### `commit(options?: { roundStrategy?: RoundingStrategy }): CalcAUYOutput`
- **Ação:** Inicia o colapso da AST em um resultado numérico racional.
- **Opções:**
  - `roundStrategy`: Define *como* a biblioteca lidará com dízimas ou arredondamentos posteriores (ex: `NBR-5891`, `HALF_EVEN`, `TRUNCATE`, `CEIL`).
- **Retorno:** Uma instância de `CalcAUYOutput`.

## Exemplo Detalhado
```typescript
const juros = CalcAUY.from(1000)
  .mult(
    CalcAUY.from(1).add("0.10").pow(12) // (1 + 0.10)^12
  )
  .setMetadata("op_type", "compound_interest")
  .commit({ roundStrategy: "NBR-5891" });

console.log(juros.toStringNumber({ decimalPrecision: 2 })); 
// "3138.43" (Valor auditado e arredondado conforme norma brasileira)
```
