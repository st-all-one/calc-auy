# Método: `.group()`

Envolve a expressão construída até o momento em um grupo lógico (equivalente aos parênteses na matemática).

## Assinatura
```ts
public group(): CalcAUY
```

## Exemplos de Uso

### 1. Forçando Precedência
```ts
// Sem group: 10 + 5 * 2 = 20
const a = CalcAUY.from(10).add(5).mult(2);

// Com group: (10 + 5) * 2 = 30
const b = CalcAUY.from(10).add(5).group().mult(2);
```

### 2. Organização de Fórmulas Complexas
```ts
// ((10 + 5) / 2) ^ 3
const calc = CalcAUY.from(10).add(5).group().div(2).group().pow(3);
```

## Engenharia
O uso do `.group()` é fundamental quando você deseja isolar um bloco de cálculo antes de aplicar uma nova operação que teria precedência natural superior (como multiplicação após uma soma).
