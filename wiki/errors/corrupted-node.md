# Erro: `corrupted-node` (500 Internal Server Error)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    Note over App: JSON incompleto ou campos ausentes
    App->>Calc: hydrate(bad_json)
    activate Calc
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro de AST: corrupted-node<br/>Estrutura da árvore é inválida
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

O `corrupted-node` indica que a estrutura da AST fornecida para hidratação está incompleta,
 malformada ou contém tipos de nós que a engine não reconhece.

## 🛠️ Como ocorre
1. **JSON Incompleto:** Falta de campos obrigatórios como `kind`, `type`, `value` ou `operands`.
2. **Tipagem Inválida:** Um nó que deveria ser `literal` mas tem estrutura de `operation`.
3. **Manipulação Manual Falha:** Tentar criar o JSON da AST manualmente e esquecer de propriedades críticas.

## 💻 Exemplos de Código

### Exemplo 1: Nó sem tipo
```typescript
// Lança corrupted-node no hydrate()
const astCorrompida = { value: { n: "10", d: "1" } }; // Falta o campo "kind"
const calc = await CalcAUY.hydrate(astCorrompida as any, { salt: "" });
```

### Exemplo 2: Operação sem operandos
```typescript
const ast = {
  kind: "operation",
  type: "add"
  // Faltam os "operands"
};
const calc = await CalcAUY.hydrate(ast as any, { salt: "" });
```

### Exemplo 3: Valor racional malformado
```typescript
const ast = {
  kind: "literal",
  value: { n: "abc" } // "n" deve ser uma string numérica (BigInt)
};
const calc = await CalcAUY.hydrate(ast as any, { salt: "" });
```

## ✅ O que fazer
- **Use `hibernate()`:** Sempre utilize o método oficial para gerar o JSON da árvore caso não conclua o cálculo. Evite construí-lo manualmente.
- **Validação de Schema:** Se estiver recebendo a AST de uma fonte externa, valide contra a interface `CalculationNode` antes de tentar hidratar.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
Uma Árvore de Sintaxe Abstrata (AST) é o "DNA" do cálculo. Se um único nó está faltando uma propriedade ou tem um tipo inválido, a integridade de toda a cadeia matemática está comprometida.

A biblioteca não tenta "reparar" nós corrompidos (ex: assumir que um nó sem tipo é um literal `0`) porque isso invalidaria o rastro de auditoria. Para a CalcAUY, **mais vale um sistema parado do que um sistema que produz cálculos errados silenciosamente**. A falha na hidratação é um mecanismo de autodefesa para evitar que cálculos "zumbis" ou imprevisíveis continuem a ser processados.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
