# 04 - Motor de Execução e Arredondamento

## Objetivo
Processar a Árvore AST em um resultado numérico final (`RationalNumber`), garantindo conformidade com regras contábeis e matemáticas rigorosas no motor CalcAUY.

## O Conceito de "Commit"
Diferente da versão anterior, a nova CalcAUY não executa o cálculo matemático a cada chamada de método (`add`, `mult`, etc.). Cada chamada apenas anexa um novo nó à AST.
- **Vantagem:** Permite a serialização do cálculo em qualquer estágio sem perda de precisão e a aplicação correta da ordem das operações no final.

## Arredondamentos Críticos
Para cálculos fiscais e contábeis, a lib deve implementar:
1. **Divisão Inteira Euclidiana:** Onde o resto (`mod`) é sempre positivo, seguindo o Teorema da Divisão de Euclides.
2. **Arredondamentos Fiscais (NBR-5891):** Implementar estratégias como `half-even` (arredondamento bancário) e `half-up` (comercial) apenas no colapso final para o output, mantendo as 50 casas decimais do `RationalNumber` durante todo o processo interno.

## Algoritmo de Colapso (Evaluation)
A função `evaluate(node: CalculationNode): RationalNumber` deve ser recursiva:
- Se o nó for **Literal**, retorna seu valor.
- Se o nó for **Group**, retorna `evaluate(child)`.
- Se o nó for **Operation**, executa a operação entre os resultados de `evaluate` de seus operandos utilizando os métodos da classe `RationalNumber`.

### Otimização de Performance e Memória
Durante o colapso, o motor deve confiar na simplificação automática (MDC) do `RationalNumber`. Isso garante que operações complexas em cadeia não causem estouro de memória ou lentidão por lidar com BigInts desnecessariamente extensos. Cada resultado intermediário deve ser a fração mais simples possível.

## Segurança em Runtime
- **Prevenção de Overflow/Underflow:** Embora o BigInt suporte precisão arbitrária, o motor deve monitorar o tamanho do numerador e denominador para evitar consumo excessivo de memória em dízimas periódicas complexas, forçando o colapso para 50 casas decimais quando necessário (ex: em operações de potência e raízes n-ésimas).
