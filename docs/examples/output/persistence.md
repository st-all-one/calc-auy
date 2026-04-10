# Persistência Robusta: `toScaledBigInt()` e `toRawInternalBigInt()`

Estes métodos permitem salvar o resultado final no banco de dados como números inteiros, eliminando para sempre o risco de erros de ponto flutuante em consultas SQL (SUM, AVG).

## Assinatura
```ts
public toScaledBigInt(options?: OutputOptions): bigint
public toRawInternalBigInt(): bigint
```

## Exemplos de Uso

### 1. Salvando Centavos (Escala 2)
É a prática recomendada para PostgreSQL, MySQL ou MongoDB.
```ts
// Valor calculado: 150.50
const cents = output.toScaledBigInt({ decimalPrecision: 2 }); 
// 15050n (BigInt pronto para o DB)
```

### 2. Alta Precisão (Escala 10)
```ts
const highPrec = output.toScaledBigInt({ decimalPrecision: 10 });
```

### 3. Acesso ao Numerador Bruto
Útil se você estiver realizando auditorias em nível de bit ou frações puras.
```ts
const num = output.toRawInternalBigInt();
```

## Engenharia: Por que escalar?
Consultas SQL como `SELECT SUM(price)` em campos do tipo FLOAT podem gerar diferenças de centavos devido à imprecisão do hardware. Ao salvar o valor via `toScaledBigInt`, você armazena o valor exato. Na hora de exibir, basta dividir pela escala no front-end ou usar a CalcAUY para formatar.
