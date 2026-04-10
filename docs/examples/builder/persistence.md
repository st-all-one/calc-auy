# Persistência: `.hibernate()` e `.getAST()`

Estes métodos permitem extrair o estado do cálculo para persistência em bancos de dados ou transferência via rede.

## Assinatura
```ts
public hibernate(): string
public getAST(): CalculationNode
```

## Exemplos de Uso

### 1. Salvando no Banco de Dados
O `hibernate()` gera uma string JSON pronta para ser salva.
```ts
const calc = CalcAUY.from(100).add(20).setMetadata("step", "auth");
const snapshot = calc.hibernate();

// Salvar snapshot no DB
await db.calculations.save({ data: snapshot });
```

### 2. Inspeção Técnica com `getAST()`
Útil se você precisar processar a árvore manualmente ou enviar para um sistema de front-end.
```ts
const tree = calc.getAST();
console.log(tree.kind); // "operation"
```

## Diferença Fundamental
- **`hibernate()`**: Retorna uma **String JSON**. Ideal para persistência.
- **`getAST()`**: Retorna o **Objeto (Node)** nativo. Ideal para manipulação programática em tempo de execução.

## Recuperação
Para retomar o cálculo a partir destes dados, utilize o método estático `CalcAUY.hydrate(dados)`.
