# Método: `CalcAUY.hydrate()`

Reconstrói um cálculo a partir de um estado salvo (JSON). É a base para a persistência e auditoria retroativa.

## Assinatura
```ts
public static hydrate(ast: CalculationNode | string | object): CalcAUY
```

## Exemplos de Uso

### 1. Hidratação via Snapshot de Auditoria (Audit Trace)
Útil para retomar um cálculo que foi salvo no banco de dados.
```ts
const auditJson = `{"ast": {"kind": "literal", "value": {"n": "100", "d": "1"}}, "finalResult": ...}`;
const calc = CalcAUY.hydrate(auditJson).add(50); // Retoma do 100 e adiciona 50
```

### 2. Hidratação via AST Pura
```ts
const ast = { kind: "literal", value: { n: "50", d: "1" } };
const calc = CalcAUY.hydrate(ast);
```

### 3. Composição de Módulos
Injetando um cálculo hidratado em uma nova cadeia.
```ts
const baseSnapshot = db.getSnapshot(); 
const final = CalcAUY.from(500)
  .add(CalcAUY.hydrate(baseSnapshot)) // Auto-agrupado
  .commit();
```

## Segurança (Anti-DoS)
O método `hydrate` valida recursivamente a estrutura recebida:
- **Limite de Nós:** Rejeita objetos com mais de 1.000 nós.
- **Profundidade:** Rejeita árvores com mais de 500 níveis de profundidade.
- **Integridade:** Garante que todas as propriedades obrigatórias (`kind`, `value`, etc.) estejam presentes e corretas.
