# Auditoria Técnica: main.ts

## Propósito
Este arquivo contém a classe principal `CalcAUD`, que serve como o motor de cálculo e a "Facade" para o usuário. Ela é responsável por manter o estado imutável de um cálculo em andamento, processando operações matemáticas e gerando simultaneamente as representações de auditoria (LaTeX, Unicode e Verbal).

## Implementação Técnica
- **Imutabilidade Estrutural:** Cada operação (`add`, `sub`, `mult`, `div`, `pow`) retorna uma **nova instância** de `CalcAUD`. Isto evita efeitos colaterais e garante que um cálculo parcial possa ser reutilizado sem corromper outros fluxos.
- **Acumuladores Duplos:** Internamente, mantém um `accumulatedValue` (valor consolidado das somas anteriores) e um `activeTermValue` (o valor sendo atualmente operado, ex: o produto de uma multiplicação antes de ser somado ao total). Esta arquitetura reflete a precedência de operadores sem necessidade de uma árvore de sintaxe complexa para operações lineares.
- **Arredondamento Interno (Half-Up na 12ª casa):** Ao multiplicar ou dividir, o motor realiza um arredondamento imediato na escala de 10^12. Isto evita a propagação de resíduos infinitesimais de BigInt.
- **Divisões Euclidianas vs Truncadas:** Implementa lógicas específicas para quociente e resto (`divInt`, `mod`) permitindo conformidade com diferentes linguagens e normas.

## Onde/Como é usado
- **Raiz da Biblioteca:** É o ponto de entrada para qualquer cálculo auditável.
- **Dependências:** Importa utilitários matemáticos (`internal/math_utils.ts`), parsers (`internal/parser.ts`) e geradores de saída (`output.ts`).

## Padrões de Design
- **Fluent Interface (Chainable):** Permite encadeamento de métodos para uma experiência de desenvolvedor fluida.
- **Immutable State:** Garante integridade e rastreabilidade absoluta dos cálculos.
- **Facade:** Esconde a complexidade de gerenciar quatro estados simultâneos (Valor, LaTeX, Unicode e Verbal) atrás de uma API simples.

## Observações de Auditor Sênior
- **Segurança:** O método `from` realiza validação rigorosa de tipos em runtime, impedindo a injeção de `NaN`, `Infinity` ou tipos não suportados.
- **Precisão:** A decisão de tratar potências fracionárias via `calculateFractionalPower` permite o cálculo de juros reais e raízes complexas mantendo a escala de 10^12.
- **A11y:** A integração nativa do rastro verbal (VerbalTokens) assegura que cada passo da operação tenha uma descrição humana equivalente desde a sua origem.
