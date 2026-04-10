# Método: `CalcAUY.from()`

O ponto de entrada universal para qualquer cálculo na biblioteca. Ele garante que o seu valor inicial seja convertido em uma fração racional de alta precisão imediatamente.

## Assinatura
```ts
public static from(value: string | number | bigint | CalcAUY): CalcAUY
```

## Exemplos de Uso

### 1. Ingestão Segura de Strings (Recomendado)
Sempre prefira strings para evitar as imprecisões nativas do tipo `number`.
```ts
const calc = CalcAUY.from("10.50");
```

### 2. Uso de Números Inteiros ou BigInt
```ts
const a = CalcAUY.from(100);
const b = CalcAUY.from(100n); // Suporte nativo a BigInt
```

### 3. Composição de Cálculos
Você pode injetar uma instância de `CalcAUY` dentro de outra. A biblioteca cuidará do agrupamento automático.
```ts
const subTotal = CalcAUY.from(50).add(20);
const total = CalcAUY.from(subTotal).mult(2); // Resulta em (50 + 20) * 2
```

## Dicas de Engenharia
- **Performance:** O método utiliza um cache interno para literais repetidos (ex: "1.18", "0.05"), reduzindo o custo de parsing em loops massivos.
- **Segurança:** Rejeita automaticamente valores `NaN`, `Infinity` ou tipos não suportados, lançando um `CalcAUYError`.
