# Auditoria Técnica: `src/internal/subscript.ts`

## 1. Propósito
O módulo `subscript.ts` tem como responsabilidade única a conversão de caracteres alfanuméricos e símbolos operacionais em seus equivalentes subscritos Unicode. Ele é fundamental para a geração de representações matemáticas auditáveis em texto puro (UTF-8), permitindo que expressões complexas sejam legíveis em ambientes sem suporte a LaTeX ou HTML.

## 2. Implementação Técnica
A implementação utiliza um **mapeamento estático (lookup table)** via objeto literal `Record<string, string>`. 
- **Algoritmo:** A função `toSubscript` quebra a string de entrada em um array de caracteres, converte cada um para caixa alta (`toUpperCase()`) e busca seu equivalente no mapa. Caso não encontre, o caractere original é mantido.
- **Performance:** O uso de um mapa estático evita a sobrecarga de expressões regulares complexas e garante que a operação seja O(n) em relação ao comprimento da string.
- **Caracteres Suportados:** Dígitos de 0 a 9, o alfabeto completo de A a Z (usando glifos Unicode específicos para subscritos), operadores básicos (`+`, `-`, `(`, `)`) e separadores decimais (`.`, `,` convertidos para `·`).

## 3. Onde e Como é Usado
- **Dependência Interna:** É importado e consumido pela classe `CalcAUDOutput` no método `toUnicode()`.
- **Fluxo de Dados:** Quando o usuário solicita uma saída em Unicode, as siglas dos métodos de arredondamento (como "HE" para Half-Even) são passadas por esta função para que apareçam subscritas na expressão final (ex: `roundₕₑ(...)`).

## 4. Padrões de Design
- **Utility Pattern:** Um módulo puramente funcional, sem estado, focado em uma única transformação de dados.

## 5. Parecer do Auditor
- **Acessibilidade (A11y):** Excelente para logs de terminal e mensagens rápidas. Contudo, deve-se notar que alguns leitores de tela podem ter dificuldades em interpretar corretamente todos os glifos Unicode subscritos se não houver um rótulo ARIA associado (o que a lib resolve no método `toHTML`).
- **Robustez:** O código é seguro e resiliente a entradas nulas ou caracteres não mapeados.
