# Método: `toASTObject()`

O `toASTObject()` fornece acesso ao rastro completo da execução como um objeto JavaScript puro para inspeção programática. Ele retorna a mesma estrutura que o [`toAuditTrace()`](./toAuditTrace.md), porém sem a serialização para string JSON.

## ⚙️ Funcionamento Interno

1.  **Clone Estrutural:** Utiliza `structuredClone` para garantir que o objeto retornado seja uma cópia profunda, desconectada da instância interna de output. Isso garante a imutabilidade do estado original mesmo que o objeto retornado seja mutado externamente.
2.  **Snapshot Completo:** Diferente do antigo `getAST()`, este método não retorna apenas a árvore, mas o pacote completo de auditoria:
    -   `ast`: A Árvore de Sintaxe Abstrata completa.
    -   `finalResult`: O resultado consolidado em formato racional (`{ n, d }`).
    -   `roundStrategy`: A estratégia de arredondamento aplicada.
    -   `signature`: A assinatura digital de integridade.
    -   `contextLabel`: O identificador da jurisdição de origem.
3.  **Dados Brutos:** Mantém os valores BigInt (numerador e denominador) e mapas de metadados em sua forma nativa de objeto.

## 🎯 Propósito
Permitir que ferramentas de baixo nível, motores de visualização customizados ou algoritmos de análise estática inspecionem o rastro completo do cálculo sem o overhead da desserialização de uma string JSON.

## 💼 10 Casos de Uso Reais

1.  **Validação de Estrutura em Testes:** Verificar se uma fórmula complexa gerou a árvore e o resultado esperados.
```typescript
// Exemplo: Teste de integração de rastro
const obj = (await calc.commit()).toASTObject();
expect(obj.ast.type).toBe("add");
expect(obj.signature).toBeDefined();
```

2.  **Motores de Renderização Customizados:** Criar visualizações complexas baseadas no objeto de rastro.
```typescript
// Exemplo: Gerador de Grafo
const dot = myDotGenerator.convert(res.toASTObject().ast);
```

3.  **Análise Estática de Negócio:** Contar ocorrências de regras específicas no rastro.
```typescript
const trace = res.toASTObject();
const taxesCount = countMetadata(trace.ast, "tax_id");
```

4.  **Otimizadores e Verificadores Externos:** Passar o objeto de auditoria para motores de prova formal.
```typescript
const isSafe = formalVerifier.check(res.toASTObject());
```

5.  **Extração de Metadados para Relatórios:** Varredura recursiva para listar justificadores sem parsear JSON.
```typescript
const laws = extractLaws(res.toASTObject().ast);
```

6.  **Sistemas de Recomendação:** Analisar a complexidade da fórmula no rastro para sugestões.
```typescript
const depth = measureDepth(res.toASTObject().ast);
```

7.  **Integração com Ferramentas de Lógica:** Converter a AST para formatos de solvers (Z3 / SMT).
```typescript
const smt = smtExporter.translate(res.toASTObject().ast);
```

8.  **Geração de Hash de Lógica:** Criar um identificador único para a estrutura da fórmula.
```typescript
const formulaId = hashObject(res.toASTObject().ast);
```

9.  **Serialização Customizada de Rastro:** Converter para Protobuf ou MessagePack manualmente.
```typescript
const buffer = MyProto.encode(res.toASTObject());
```

10. **Breadcrumb de Depuração Rico:** Exibir o estado completo do rastro em ferramentas de log avançadas.
```typescript
console.dir(res.toASTObject(), { depth: null });
```

## 🛠️ Opções Permitidas

- (Nenhuma)

## 🏗️ Anotações de Engenharia
- **Segurança Forense:** O objeto é uma cópia. Alterá-lo não afeta a assinatura gerada no `commit()` original nem contamina outros outputs da mesma instância.
- **Recursive Nature:** A AST dentro do objeto é recursiva. Algoritmos de varredura devem implementar limites de profundidade.
- **Audit Ready:** Este é o método preferencial para sistemas que precisam realizar persistência customizada ou validação de assinaturas em memória.
