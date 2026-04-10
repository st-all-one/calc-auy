# Método: `.toLaTeX()`

Reconstrói a fórmula matemática completa em sintaxe LaTeX, ideal para memoriais de cálculo, laudos jurídicos e dashboards de engenharia.

## Assinatura
```ts
public toLaTeX(options?: OutputOptions): string
```

## Exemplos de Uso

### 1. Rastro Simples
```ts
const calc = CalcAUY.from(10).add(5).commit();
console.log(calc.toLaTeX()); 
// \text{round}_{NBR}(10 + 5, 4) = 15.0000
```

### 2. Expressões Complexas
```ts
const complexo = CalcAUY.from(10).div(CalcAUY.from(2).pow(3)).commit();
console.log(complexo.toLaTeX());
// \text{round}(\frac{10}{2^{3}}, 4) = 1.2500
```

## Engenharia
O retorno é compatível com bibliotecas como **MathJax** e **KaTeX**. Ele inclui automaticamente o invólucro de arredondamento (`\text{round}`) e o identificador da estratégia utilizada (ex: NBR, HU, HE), garantindo que o rastro reflita a realidade matemática do resultado exibido.
