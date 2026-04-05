# Auditoria Técnica: constants.ts

## Propósito
O arquivo `constants.ts` define as configurações globais de precisão, escala e ativos estáticos da biblioteca CalcAUD. Ele serve como a "fonte da verdade" para os parâmetros matemáticos que garantem a integridade dos cálculos financeiros e a renderização de fórmulas.

## Implementação Técnica
- **INTERNAL_CALCULATION_PRECISION:** Definida como 12 casas decimais. Esta alta precisão interna é crucial para mitigar erros de arredondamento cumulativos em operações em cadeia.
- **INTERNAL_SCALE_FACTOR:** Utiliza `BigInt` (10^12). Ao multiplicar todos os valores de entrada por este fator, a biblioteca migra do domínio de ponto flutuante (IEEE 754) para o domínio de inteiros de precisão arbitrária, eliminando imprecisões binárias.
- **KATEX_CSS_MINIFIED:** Armazena o CSS necessário para a renderização visual de fórmulas, garantindo que a biblioteca seja autocontida para saídas HTML/SVG.

## Onde/Como é usado
- **src/main.ts:** Para inicializar valores e realizar operações de escala.
- **src/internal/math_utils.ts:** Como base para cálculos de potência e raízes.
- **src/output_helpers/html_generator.ts:** Para embutir o CSS no componente visual.
- **src/output.ts:** Para formatação de strings não arredondadas.

## Padrões de Design
- **Configuração Centralizada:** Centraliza parâmetros mágicos, facilitando a manutenção e garantindo consistência em todo o motor matemático.

## Observações de Auditor Sênior
- **Segurança:** O uso de BigInt protege contra estouro de inteiros (overflow) que ocorreria com `Number.MAX_SAFE_INTEGER`.
- **Precisão:** A escolha de 12 casas decimais (micro-precisão) excede a maioria dos requisitos fiscais (geralmente 4 ou 6 casas), provendo uma margem de segurança robusta para cálculos complexos de juros compostos.
- **A11y:** A inclusão de recursos para o KaTeX demonstra uma preocupação com a fidelidade visual que complementa a acessibilidade verbal.
