# Auditoria Técnica: `src/output_helpers/html_generator.ts`

## 1. Propósito
O módulo `html_generator.ts` é o motor de renderização visual da CalcAUD para ambientes Web. Sua responsabilidade é transformar a prova matemática acumulada (LaTeX) em um fragmento HTML rico e estilizado, utilizando a biblioteca KaTeX para a renderização de fórmulas e garantindo a acessibilidade total para leitores de tela.

## 2. Implementação Técnica
A implementação utiliza uma abordagem de renderização estática e injeção de ativos.
- **Integração KaTeX:** Utiliza a função `katex.renderToString` para converter a expressão LaTeX completa em uma estrutura de spans e SVGs compatível com MathML.
- **Injeção de CSS:** Consome a constante `KATEX_CSS_MINIFIED` (do módulo `constants.ts`) e a injeta via bloco `<style>` inline. O uso de um cache estático (`cachedKaTeXCSS`) garante que o processamento do CSS ocorra apenas uma vez.
- **Estratégia de Acessibilidade (A11y):** O HTML resultante é encapsulado em uma `div` com o atributo `aria-label` preenchido pela descrição verbal localizada. Isso permite que usuários cegos ou com baixa visão ouçam o cálculo por extenso enquanto usuários videntes veem a fórmula matemática.

## 3. Onde e Como é Usado
- **Dependência de Saída:** É importado e consumido pelo `src/output.ts` no método `toHTML()` e também pelo gerador de imagem SVG.
- **Fluxo de Dados:** Recebe a expressão LaTeX, o resultado formatado e a descrição verbal localizada, retornando a string HTML final.

## 4. Padrões de Design
- **Renderer Pattern:** Transforma dados estruturados (LaTeX) em uma representação visual para o usuário.
- **Static Assets Caching:** Otimiza o desempenho ao evitar o reprocessamento de recursos pesados (CSS).

## 5. Parecer do Auditor
- **Acessibilidade Insuperável:** O uso do `aria-label` verbalizado em conjunto com o HTML visual do KaTeX é uma das implementações de acessibilidade matemática mais robustas do mercado.
- **Eficiência de Payload:** Ao injetar o CSS necessário diretamente no fragmento, a biblioteca elimina a dependência de CDNs externos ou do gerenciamento manual de assets pelo desenvolvedor que integra a lib.
- **Observação de Estilo:** A inclusão de estilos básicos de responsividade (`overflow-x: auto`) demonstra maturidade no design de componentes que podem ser injetados em diferentes layouts.
