# Exportação Numérica: `toStringNumber()` e `toFloatNumber()`

Métodos para converter o resultado do cálculo em tipos padrão do JavaScript para exibição e integração.

## Assinatura
```ts
public toStringNumber(options?: OutputOptions): string
public toFloatNumber(options?: OutputOptions): number
```

## Exemplos de Uso

### 1. Representação Decimal Estrita (Recomendado)
Use para garantir que a precisão de exibição seja respeitada.
```ts
const res = output.toStringNumber({ decimalPrecision: 2 }); 
// "10.50" (se o valor for 10.5)
```

### 2. Integração com Gráficos (Float)
Use `toFloatNumber()` apenas para bibliotecas que não suportam strings ou BigInts (ex: Chart.js).
```ts
const val = output.toFloatNumber();
chart.push(val);
```

### 3. Diferença de Arredondamento
Ambos os métodos aplicam a estratégia de arredondamento definida no `commit()`.
```ts
// Se a estratégia for TRUNCATE e o valor for 1.2599
output.toStringNumber({ decimalPrecision: 2 }); // "1.25"
```

## Aviso de Engenharia
Sempre prefira `toStringNumber()` para transferir dados entre APIs ou salvar em arquivos texto. O `toFloatNumber()` reintroduz o padrão IEEE 754, o que pode causar pequenas imprecisões se você realizar novos cálculos matemáticos com esse retorno.
