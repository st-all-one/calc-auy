# Operações Matemáticas (Fluent API)

A CalcAUY oferece uma API fluida e imutável para construir expressões matemáticas com precisão absoluta.

## Métodos Disponíveis

| Método | Operação | Exemplo |
| :--- | :--- | :--- |
| `.add(val)` | Adição | `.add(10)` |
| `.sub(val)` | Subtração | `.sub("5.50")` |
| `.mult(val)` | Multiplicação | `.mult(2)` |
| `.div(val)` | Divisão Racional | `.div(3)` |
| `.pow(val)` | Potência / Raiz | `.pow(2)` ou `.pow("1/2")` |
| `.mod(val)` | Módulo (Resto) | `.mod(3)` |
| `.divInt(val)` | Divisão Inteira | `.divInt(3)` |

## Exemplos de Uso

### 1. Encadeamento Fluído
```ts
const resultado = CalcAUY.from(100)
  .add(50)
  .sub(20)
  .mult(2)
  .commit(); // ((100 + 50) - 20) * 2
```

### 2. Potências e Raízes
A CalcAUY trata raízes como potências fracionárias, mantendo a precisão racional.
```ts
const raizQuadrada = CalcAUY.from(16).pow("1/2").commit(); // 4
const cubo = CalcAUY.from(2).pow(3).commit(); // 8
```

### 3. Divisão e Módulo Euclidiano
Diferente do `%` padrão do JS que pode retornar negativo, o módulo da CalcAUY segue a regra de Euclides (sempre positivo).
```ts
const resto = CalcAUY.from(-10).mod(3).commit(); // 2
const quociente = CalcAUY.from(-10).divInt(3).commit(); // -4
```

## Importante: Imutabilidade
Lembre-se que cada chamada de método retorna uma **nova instância**. A instância original nunca é alterada.
```ts
const base = CalcAUY.from(10);
const plus5 = base.add(5); // base continua sendo 10
```
