# Auditoria Técnica: `src/output_helpers/formatting.ts`

## 1. Propósito
O módulo `formatting.ts` é o guardião da integridade numérica na fase de saída da CalcAUD. Sua responsabilidade é converter valores `BigInt` (na escala interna ou reduzida) em representações textuais (strings) sem nunca utilizar tipos de ponto flutuante (`number`/`float`), eliminando completamente o risco de imprecisão do padrão IEEE 754. Além disso, provê a formatação monetária localizada.

## 2. Implementação Técnica
A implementação baseia-se em aritmética inteira e manipulação manual de strings.
- **Função `formatBigIntToString`:**
  - **Extração de Partes:** Utiliza divisão (`/`) e módulo (`%`) de `BigInt` para isolar a parte inteira e a parte fracionária do valor bruto.
  - **Reconstrução Textual:** A parte fracionária é convertida para string e preenchida com zeros à esquerda (`padStart`) de acordo com a precisão desejada. Isso garante que um valor como `0.05` seja corretamente formatado mesmo que o BigInt da fração seja apenas `5`.
  - **Ausência de Float:** Não há conversão para `number` em nenhum momento da reconstrução decimal.
- **Função `formatMonetary`:**
  - **Conformidade Internacional:** Utiliza a API nativa `Intl.NumberFormat` para garantir que as convenções de cada país (símbolo monetário, separador de milhar e decimal) sejam rigorosamente seguidas.
  - **Preservação de Precisão:** Configura `minimumFractionDigits` e `maximumFractionDigits` para forçar o `Intl` a respeitar a precisão calculada pela biblioteca, evitando arredondamentos indesejados pela API do navegador/Node.js.

## 3. Onde e Como é Usado
- **Dependência de Saída:** É importado e consumido pela classe `CalcAUDOutput` (`src/output.ts`) em quase todos os seus métodos de exportação (`toString`, `toMonetary`, `toLaTeX`, etc.).
- **Fluxo de Dados:** Recebe o valor bruto de 12 casas ou o valor arredondado e gera a string que será apresentada ao usuário final.

## 4. Padrões de Design
- **Helper Pattern:** Conjunto de funções utilitárias focadas na transformação de representação de dados.

## 5. Parecer do Auditor
- **Imunidade Numérica:** A estratégia de reconstrução de string via `BigInt` é a única forma 100% segura de garantir que o valor auditado na fórmula seja idêntico ao valor monetário apresentado.
- **Segurança de Implementação:** O tratamento simétrico para números negativos na função de formatação demonstra cuidado com casos de borda que frequentemente causam erros em implementações menos rigorosas.
