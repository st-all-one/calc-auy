# Erro: `complex-result` (422 Unprocessable Entity)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    activate Calc
    App->>Calc: from(-4)
    App->>Calc: pow(0.5)
    App->>Calc: commit()
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro Matemático: complex-result<br/>Operação resultou em número imaginário
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

A CalcAUY opera exclusivamente no domínio dos **Números Reais**.
 O erro `complex-result` ocorre quando uma operação matemática resultaria em um número imaginário ou complexo.

## 🛠️ Como ocorre
1. **Raiz de Negativo:** Tentar extrair a raiz quadrada (ou qualquer raiz de índice par) de um número negativo.
2. **Potência Fracionária Par:** Elevar um número negativo a um expoente decimal como `0.5`, `0.25`, etc.

## 💻 Exemplos de Código

### Exemplo 1: Raiz Quadrada de Negativo
```typescript
// √-4 não é um número real
const calc = CalcAUY.from("-4").pow("0.5");
await calc.commit();
```

### Exemplo 2: Expoente Fracionário
```typescript
// (-1)^(1/2) -> complex-result
const calc = CalcAUY.from(-1).pow("1/2");
```

### Exemplo 3: Via Parser
```typescript
const calc = CalcAUY.parseExpression("(-16) ^ (1/4)");
```

## ✅ O que fazer
- **Uso de `abs()`:** Se o sinal negativo for um erro de leitura ou não importar para o cálculo de magnitude, aplique o valor absoluto antes da potência.
- **Validação de Sinal:** Verifique se a base é `>= 0` antes de aplicar raízes.
- **Tratamento de Exceção:** Capture o erro e informe ao usuário que a operação resultou em um valor fora do domínio suportado pela calculadora financeira.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
A `CalcAUY` é uma ferramenta de engenharia financeira e auditoria. O domínio de negócio destas áreas está 100% contido nos **Números Reais**. "Dinheiro imaginário" não existe em balanços contábeis.

Implementar suporte a Números Complexos ($a + bi$) traria um overhead massivo de complexidade ao `RationalNumber` e à AST, sem nenhum ganho prático para o propósito da biblioteca. A biblioteca não tenta "corrigir" (ex: forçando o valor para absoluto) porque isso esconderia erros graves de modelagem matemática na fórmula do usuário. Se você está tirando a raiz de um número negativo, provavelmente sua lógica de negócio tem uma falha estrutural que precisa ser revisada.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
