# Método: `.commit()`

O método que "sela" o cálculo. Ele percorre a árvore AST, realiza todas as operações matemáticas acumuladas e retorna um objeto `CalcAUYOutput` pronto para extração de dados.

## Assinatura
```ts
public commit(options?: { roundStrategy?: RoundingStrategy }): CalcAUYOutput
```

## Exemplos de Uso

### 1. Commit Simples (Padrão NBR-5891)
```ts
const res = CalcAUY.from(10).add(5).commit();
```

### 2. Escolhendo uma Estratégia de Arredondamento
Fundamental para cálculos fiscais onde a regra de arredondamento pode mudar o valor final de impostos.
```ts
const res = CalcAUY.from("1.255").commit({ roundStrategy: "HALF_EVEN" });
```

## Estratégias Disponíveis
- **`NBR5891` (Padrão):** Norma brasileira para arredondamento ao par.
- **`HALF_UP`:** Arredondamento comercial (0.5 vai para cima).
- **`HALF_EVEN`:** Arredondamento bancário.
- **`TRUNCATE`:** Corte seco dos decimais.
- **`CEIL`:** Arredonda sempre para cima.

## Engenharia
Nenhum cálculo matemático real é executado antes do `commit()`. Durante a construção, a lib apenas armazena a intenção do cálculo na árvore AST. Isso garante que a precisão racional absoluta seja mantida até o último microssegundo antes da exibição ou persistência.
