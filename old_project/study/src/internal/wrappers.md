# Auditoria Técnica: `src/internal/wrappers.ts`

## 1. Propósito
O módulo `wrappers.ts` fornece utilitários para o encapsulamento léxico de expressões matemáticas. Sua função principal é garantir a precedência correta das operações ao integrar sub-expressões em fórmulas maiores, adicionando parênteses (LaTeX ou Unicode) apenas quando estritamente necessário para manter a legibilidade e a correção matemática.

## 2. Implementação Técnica
O módulo implementa duas funções principais: `wrapLaTeX` e `wrapUnicode`.
- **Lógica de Decisão:** Ambas as funções analisam a string da expressão em busca de operadores de baixa precedência (`+` ou `-`).
- **Heurística de Proteção:** O encapsulamento ocorre se:
  1. A expressão contém `+` ou `-` (indicando necessidade de agrupamento para preservar a ordem das operações).
  2. A expressão não está **já** envolta por comandos de parênteses (`\left(` no LaTeX ou `(` no Unicode).
- **Formatos Suportados:**
  - **LaTeX:** Utiliza `\left( ... \right)` para parênteses elásticos que se ajustam à altura de frações ou potências.
  - **Unicode:** Utiliza parênteses normais `(...)`.

## 3. Onde e Como é Usado
- **Dependência Central:** É intensamente utilizado pela classe principal `CalcAUD` (`src/main.ts`) nos métodos `add()`, `sub()`, `mult()`, `div()` e `pow()`.
- **Fluxo de Dados:** Sempre que um novo termo é incorporado a uma operação que exige maior precedência (como multiplicação ou potência), o termo existente é passado por estas funções para garantir que a auditoria final reflita a estrutura lógica real do cálculo.

## 4. Padrões de Design
- **Conditional Wrapper:** Um padrão funcional que aplica transformações baseadas em heurísticas de inspeção de conteúdo.

## 5. Parecer do Auditor
- **Eficiência Visual:** A escolha de não adicionar parênteses redundantes (caso a expressão já esteja agrupada) é excelente para a manutenibilidade de dashboards e relatórios financeiros, evitando o "ruído" de parênteses aninhados desnecessários.
- **Segurança de Auditoria:** Este módulo é o guardião da integridade da prova matemática. Sem ele, uma expressão como `10 + 5 * 2` poderia ser mal interpretada se o rastro de auditoria não deixasse claro que o `10 + 5` foi calculado antes da multiplicação (se fosse o caso).
