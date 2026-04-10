# Método: `.toSlice()`

Divide o valor final em partes iguais utilizando o **Algoritmo de Maior Resto**, garantindo que a soma das fatias seja exatamente igual ao total original.

## Assinatura
```ts
public toSlice(parts: number, options?: OutputOptions): string[]
```

## Exemplos de Uso

### 1. Parcelamento sem Diferença de Centavos
Se você dividir R$ 10,00 por 3, a matemática comum gera 3.333... resultando em uma perda de 1 centavo na soma final (9.99). A CalcAUY resolve isso.
```ts
const total = CalcAUY.from(10).commit();
const fatias = total.toSlice(3, { decimalPrecision: 2 });
// ["3.34", "3.33", "3.33"]
// Soma: 3.34 + 3.33 + 3.33 = 10.00 ✅
```

### 2. Rateio de Dividendos (Alta Precisão)
```ts
const pagamentos = lucro.toSlice(7, { decimalPrecision: 4 });
```

## Engenharia
O algoritmo converte o valor total para a menor unidade (ex: centavos), realiza a divisão inteira e distribui o resto (sobras) para as primeiras parcelas. Isso elimina a necessidade de "ajustes manuais" em balanços contábeis.
