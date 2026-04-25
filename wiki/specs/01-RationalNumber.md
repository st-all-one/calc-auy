# 01 - RationalNumber: A Unidade Básica de Precisão

```mermaid
flowchart TD
    In["Input: '1.5' | 10n | '1/3'"] --> Parser[Rational Parser]
    Parser --> Fraction["Rational(n, d)"]
    Fraction --> GCD[GCD / MDC Híbrido]
    GCD --> Final["Simplified Rational(3, 2)"]
```

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
2. **GCD Híbrido (Simplificação Automática):** **Obrigatório.** Toda operação deve aplicar o Máximo Divisor Comum imediatamente. A biblioteca utiliza um algoritmo híbrido que combina atalhos de hardware (fast-paths para 0, 1, 2) com o operador de módulo nativo do V8 (C++) para garantir a melhor performance tanto em números pequenos quanto em grandes escalas.
3. **Divisão por Zero:** Deve ser prevenida e lançar um erro específico (`CalcAUYError`) no momento da criação ou operação.
4. **Precisão de 50 casas:** Usada para operações que resultam em irracionais (raízes) ou no momento de converter para string decimal.
5. **Suporte a Percentuais:** O método `from` e `fromString` aceitam strings terminadas em `%` (ex: `"10.5%"`), convertendo-as automaticamente para a fração racional equivalente (`105/1000`).

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
