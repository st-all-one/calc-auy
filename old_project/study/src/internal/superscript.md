# Auditoria Técnica: `src/internal/superscript.ts`

## 1. Propósito
O módulo `superscript.ts` é o complemento de `subscript.ts`, focado na conversão de caracteres numéricos e operadores em seus equivalentes sobrescritos Unicode. Seu papel principal é a representação visual de potências e expoentes em expressões matemáticas auditáveis em formato de texto puro (Unicode).

## 2. Implementação Técnica
A implementação segue o padrão de **mapeamento estático (lookup table)** para máxima eficiência e previsibilidade.
- **Diferença Algorítmica:** Ao contrário do `subscript.ts`, este módulo não converte para caixa alta (`toUpperCase()`), pois o mapeamento de sobrescritos Unicode foca primariamente em dígitos (0-9) e símbolos matemáticos básicos.
- **Operação:** A função `toSuperscript` utiliza `split("")`, `map()` e `join("")` para transformar a string de entrada caractere a caractere.
- **Suporte Unicode:** Inclui dígitos sobrescritos (⁰-⁹), sinais matemáticos (`⁺`, `⁻`), parênteses (`⁽`, `⁾`) e conversores de separador decimal (`.`, `,` para `·`).

## 3. Onde e Como é Usado
- **Dependência Direta:** É consumido pelo motor de cálculo principal (`src/main.ts`) dentro do método `pow()`.
- **Fluxo de Auditoria:** Ao realizar uma operação de potência, o expoente é convertido para sobrescrito e incorporado à `activeTermUnicode`. Isso garante que a string Unicode refletirá fielmente a operação matemática realizada.

## 4. Padrões de Design
- **Utility Pattern:** Módulo funcional de propósito único e sem efeitos colaterais.

## 5. Parecer do Auditor
- **Consistência Visual:** O mapeamento para `·` (ponto médio) como separador decimal sobrescrito é uma escolha de design correta para evitar confusão com o ponto decimal na linha de base.
- **Robustez:** Assim como seu par de subscritos, o código é imune a falhas de entrada, retornando o caractere original caso não haja mapeamento disponível.
