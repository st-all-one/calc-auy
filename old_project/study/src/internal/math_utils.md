# Auditoria Técnica: internal/math_utils.ts

## Propósito
Este módulo fornece utilitários matemáticos de alta performance e precisão para `BigInt`, suprindo a ausência de funções como potência e raiz n-ésima no tipo nativo do JavaScript/Deno.

## Implementação Técnica
- **calculateBigIntPower:** Implementa o algoritmo de **Exponenciação Binária (Square-and-Multiply)** com complexidade O(log n), otimizando o cálculo de grandes potências.
- **calculateNthRoot (Motor Híbrido):** 
    - **Newton-Raphson:** Utilizado para raízes de índice baixo (<= 10) devido à sua convergência quadrática ultra-rápida.
    - **Busca Binária:** Utilizado para índices altos (> 10) para garantir estabilidade numérica onde Newton-Raphson poderia oscilar com aritmética inteira.
    - **Piso (Floor):** Ajustes finais garantem que o resultado seja o maior inteiro cujo valor elevado ao índice não exceda o radicando, essencial para consistência financeira.
- **calculateFractionalPower:** Resolve a expressão `(base/scale)^(num/den)` mantendo a escala interna. Ela eleva a base ao numerador, ajusta a escala e extrai a raiz n-ésima do resultado, preservando a micro-precisão de 12 casas.
- **getBitLengthFast:** Estima o tamanho em bits operando diretamente com deslocamento de bits (`>>`), evitando a conversão lenta para string.

## Onde/Como é usado
- **src/main.ts:** No método `pow()`, para calcular potências inteiras, decimais e raízes.

## Padrões de Design
- **Strategy (Interno):** Alterna entre algoritmos (Newton vs Busca Binária) baseando-se no custo computacional e estabilidade do índice da raiz.
- **Utility Module:** Conjunto de funções puras e sem estado.

## Observações de Auditor Sênior
- **Segurança:** Lança `CalcAUDError` para raízes pares de números negativos, evitando a propagação de estados inválidos ou resultados complexos não suportados.
- **Precisão:** O ajuste fino após o passo de Newton garante que não existam erros de arredondamento por falta (off-by-one) na parte inteira da raiz.
- **Performance:** O uso de `1n << (bitLength / rootIndex + 1n)` como estimativa inicial para a raiz reduz drasticamente o número de iterações necessárias para convergência.
