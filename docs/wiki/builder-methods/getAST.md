# Método: `getAST()`

O `getAST()` fornece acesso direto à Árvore de Sintaxe Abstrata (AST) no seu estado atual. Ele retorna o objeto de dados puro que representa a estrutura lógica do cálculo.

## ⚙️ Funcionamento Interno

1.  **Acesso Direto:** Retorna a referência ao campo privado `#ast` da instância.
2.  **Estrutura de Nós:** O objeto retornado segue a interface `CalculationNode`, podendo ser um `LiteralNode`, `OperationNode` ou `GroupNode`.
3.  **Dados Brutos:** Diferente do `hibernate()`, este método retorna o objeto JavaScript real, incluindo instâncias de `RationalValue` (strings numeradores/denominadores) e mapas de metadados.
4.  **Ready-only por Convenção:** Embora retorne o objeto, a integridade da biblioteca depende de que este objeto não seja mutado externamente.

## 🎯 Propósito
Permitir que ferramentas de baixo nível, motores de visualização customizados ou algoritmos de análise estática inspecionem a árvore sem o overhead da serialização para JSON.

## 💼 10 Casos de Uso Reais

1.  **Validação de Estrutura em Testes:** Verificar se uma fórmula complexa gerou a árvore esperada.
```typescript
// Exemplo 1: Teste unitário de precedência
const ast = CalcAUY.parseExpression("1 + 2 * 3").getAST();
expect(ast.type).toBe("add"); // Raiz deve ser a soma
```
```typescript
// Exemplo 2: Verificação de agrupamento
const ast = CalcAUY.from(10).add(5).group().getAST();
expect(ast.kind).toBe("group");
```

2.  **Motores de Renderização Customizados:** Criar visualizações que não são suportadas nativamente.
```typescript
// Exemplo 1: Gerador de Grafo (Graphviz/DOT)
const dot = myDotGenerator.convert(calc.getAST());
```
```typescript
// Exemplo 2: Desenho em Canvas 2D
canvasRenderer.drawTree(output.getAST());
```

3.  **Análise Estática de Negócio:** Contar quantas vezes uma determinada regra de imposto aparece na fórmula.
```typescript
// Exemplo 1: Contagem de metadados
const taxesCount = countMetadata(res.getAST(), "tax_id");
```
```typescript
// Exemplo 2: Identificação de dependências
const sources = getAllOriginalInputs(output.getAST());
```

4.  **Otimizadores Externos:** Passar a árvore para um motor que simplifica expressões matemáticas.
```typescript
// Exemplo 1: Simplificação simbólica
const simplifiedAST = symbolicEngine.simplify(res.getAST());
```
```typescript
// Exemplo 2: Remoção de operações redundantes (ex: * 1)
const leanAST = optimizer.prune(output.getAST());
```

5.  **Extração de Metadados para Relatórios:** Varredura recursiva para listar todos os justificadores.
```typescript
// Exemplo 1: Lista de leis citadas
const laws = extractLaws(res.getAST());
```
```typescript
// Exemplo 2: Relatório de PII detectado
const hasSensitiveData = checkPII(output.getAST());
```

6.  **Sistemas de Recomendação:** Analisar a complexidade da fórmula para sugerir simplificações.
```typescript
// Exemplo 1: Cálculo de profundidade da árvore
const depth = measureDepth(res.getAST());
```
```typescript
// Exemplo 2: Auditoria de performance de árvore
if (output.getAST().nodes > 100) warn("Complexidade alta");
```

7.  **Integração com Ferramentas de Lógica:** Converter a AST para formatos de solvers (Z3 / SMT).
```typescript
// Exemplo 1: Exportação para SMT-LIB
const smt = smtExporter.translate(res.getAST());
```
```typescript
// Exemplo 2: Verificação de inequação
const isSafe = solver.check(output.getAST(), "< 1000");
```

8.  **Geração de Hash de Lógica:** Criar um identificador único para a estrutura da fórmula.
```typescript
// Exemplo 1: ID de fórmula persistente
const formulaId = hashObject(res.getAST());
```
```typescript
// Exemplo 2: Detecção de fórmulas duplicadas
const key = getLogicFingerprint(output.getAST());
```

9.  **Serialização Customizada:** Converter para formatos como Protobuf ou MessagePack manualmente.
```typescript
// Exemplo 1: Encoding manual para Protobuf
const buffer = MyProto.encode(res.getAST());
```
```typescript
// Exemplo 2: Exportação para XML proprietário
const xml = proprietaryXmlBuilder.build(output.getAST());
```

10. **Breadcrumb de Depuração:** Exibir a sub-árvore de um nó específico durante um erro.
```typescript
// Exemplo 1: Log de erro com contexto
throw new Error(`Falha no nó: ${JSON.stringify(res.getAST())}`);
```
```typescript
// Exemplo 2: Visualização em Tree View (Chrome DevTools)
console.dir(output.getAST(), { depth: null });
```

## 🛠️ Opções Permitidas

- (Nenhuma)

## 🏗️ Anotações de Engenharia
- **Segurança de Referência:** O objeto retornado é a estrutura interna. Alterar propriedades deste objeto diretamente pode causar comportamentos imprevisíveis na engine, embora a CalcAUY utilize o padrão de congelamento de nós (`Object.freeze`) internamente em alguns casos para prevenir isso.
- **Recursive Nature:** A AST é uma estrutura de dados recursiva. Algoritmos que a utilizam devem implementar limites de profundidade para evitar estouro de pilha (`Maximum call stack size exceeded`).
- **Audit Ready:** Todos os campos necessários para reconstruir o cálculo estão presentes na AST retornada, incluindo os valores fracionários BigInt (numerador e denominador).
