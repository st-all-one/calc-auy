# Auditoria Técnica: `src/output_helpers/verbal_translator.ts`

## 1. Propósito
O módulo `verbal_translator.ts` é o componente final de acessibilidade da CalcAUD. Sua responsabilidade é traduzir a expressão tokenizada (agnóstica a idioma) em uma descrição verbal natural no locale alvo. Além da tradução de termos, ele lida com a adaptação de convenções de leitura numérica e a inclusão de metadados críticos sobre o método de arredondamento aplicado.

## 2. Implementação Técnica
A implementação utiliza uma abordagem de substituição sequencial e refinamento gramatical.
- **Função `translateVerbal`:**
  - **Substituição de Tokens:** Itera sobre os dicionários de tradução (`VERBAL_TRANSLATIONS`) e substitui os tokens operacionais (ex: `{#ADD#}`) pelos termos localizados correspondentes (ex: " mais ", " plus ").
  - **Adaptação Numérica:** Utiliza uma expressão regular (`/(\d)\.(\d)/g`) para detectar e substituir pontos decimais em números internos pela representação verbal de separador local (`COMMA`). No Brasil e Europa, isso resulta em "vírgula"; nos EUA, em "ponto" (point).
  - **Fechamento e Metadados:** Concatena a frase com o resultado final e adiciona explicitamente a estratégia de arredondamento utilizada (ex: " (Arredondamento: NBR-5891) "), garantindo que o rastro de auditoria verbal seja completo.

## 3. Onde e Como é Usado
- **Dependência de Exportação:** É importado e consumido pela classe `CalcAUDOutput` (`src/output.ts`) no método `toVerbalA11y()`.
- **Fluxo de Dados:** Recebe a string de template tokenizada gerada durante o cálculo, o valor final e o locale, retornando a frase auditável completa.

## 4. Padrões de Design
- **Translator Pattern:** Um motor de transformação de representação simbólica para linguagem natural.
- **Token-based Processing:** Garante que a lógica de tradução seja agnóstica às regras de cálculo originais.

## 5. Parecer do Auditor
- **Excelência em Auditoria Falada:** A inclusão sistemática do método de arredondamento no final da frase verbal é um detalhe de conformidade fiscal de alto valor, pois permite que um auditor verifique a política de precisão apenas ouvindo a descrição do cálculo.
- **Refinamento Regional:** A diferenciação inteligente entre "point" (EUA) e "comma" (Inglês-EU) no locale `en-EU` mostra uma atenção profunda às convenções regionais de leitura matemática, elevando o nível de profissionalismo da biblioteca.
- **Conclusão de Auditoria:** Este módulo encerra o ciclo de vida da CalcAUD, garantindo que o valor final seja não apenas um número, mas um fato auditável e compreensível em qualquer escala e idioma.
