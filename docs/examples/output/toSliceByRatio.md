# Método: `.toSliceByRatio()`

Divide o valor final baseado em pesos (proporções) customizados, garantindo integridade total na soma das partes.

## Assinatura
```ts
public toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[]
```

## Exemplos de Uso

### 1. Rateio Percentual
```ts
const impostos = total.toSliceByRatio(["60%", "30%", "10%"]);
// ["6.00", "3.00", "1.00"] (para um total de 10.00)
```

### 2. Rateio Proporcional a Custos
```ts
const freteTotal = CalcAUY.from(500).commit();
const pesosItens = [10, 20, 70]; // kg

const rateioFrete = freteTotal.toSliceByRatio(pesosItens, { decimalPrecision: 2 });
```

## Diferenciais
- **Normalização Automática:** Se a soma das proporções for diferente de 100% (ou 1), a lib normaliza os pesos internamente.
- **Distribuição de Resto:** Sobras de centavos são alocadas para as parcelas que tiveram o maior erro de arredondamento decimal, mantendo a justiça matemática.
