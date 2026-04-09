# 01 - RationalNumber: A Unidade Básica de Precisão

## Objetivo
Definir a representação fundamental de dados da biblioteca, garantindo precisão absoluta e imutabilidade total em todas as operações matemáticas.

## Representação Interna
O `RationalNumber` é um objeto racional verdadeiro que mantém a relação entre um numerador e um denominador até o momento final da representação decimal.

### Estrutura
- `#n: bigint` (Numerador)
- `#d: bigint` (Denominador)
- `static readonly PRECISION = 50n` (Casas decimais para operações que exigem colapso decimal)
- `static readonly SCALE = 10n ** 50n`

### Regras de Ouro
1. **Imutabilidade:** Qualquer operação retorna uma nova instância de `RationalNumber`.
2. **Simplificação Automática (MDC/GCD):** **Obrigatório.** Toda operação (soma, subtração, multiplicação, divisão) deve aplicar o Máximo Divisor Comum (MDC) imediatamente após o cálculo para manter o numerador e denominador nos menores termos possíveis. Isso evita o crescimento desnecessário dos números BigInt, otimizando o consumo de memória e a performance de processamento.
3. **Divisão por Zero:** Deve ser prevenida e lançar um erro específico (`CalcAUYError`) no momento da criação ou operação.
4. **Precisão de 50 casas:** Usada para operações que resultam em irracionais ou no momento de converter para string decimal.

## Métodos Obrigatórios
- `add(other: RationalNumber): RationalNumber`
- `sub(other: RationalNumber): RationalNumber`
- `mul(other: RationalNumber): RationalNumber`
- `div(other: RationalNumber): RationalNumber`
- `pow(exponent: RationalNumber): RationalNumber`
- `mod(other: RationalNumber): RationalNumber`
- `abs(): RationalNumber`
- `negate(): RationalNumber`
- `equals(other: RationalNumber): boolean`
- `compare(other: RationalNumber): number` (-1, 0, 1)

## Implementação de Restrição
- Utilizar campos privados reais do JavaScript (`#`) para impedir acesso externo direto ao estado interno.
- O construtor deve ser privado, utilizando métodos estáticos de fábrica (`from`) para criação.

## Exemplo de Interface
```typescript
class RationalNumber {
  readonly #n: bigint;
  readonly #d: bigint;

  private constructor(n: bigint, d: bigint) {
    // Simplificação via MDC e validação de d !== 0n
  }

  static from(value: string | number | bigint | RationalNumber): RationalNumber {
    // Parser para converter entradas em frações racionais
    // "1.5" -> 15/10 -> 3/2
    // "1/3" -> 1/3
  }

  // Operações imutáveis...
}
```
