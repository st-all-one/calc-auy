# Auditoria Técnica: `src/output_helpers/lazy_rounding.ts`

## 1. Propósito
O módulo `lazy_rounding.ts` é o coração da otimização de saída da CalcAUD. Ele implementa a lógica de "arredondamento preguiçoso" (lazy rounding), que consolida a conversão do valor interno de alta precisão (12 casas) para o formato final desejado em uma única passagem. O objetivo é garantir que o arredondamento e a formatação de strings sejam realizados de forma eficiente e síncrona para todos os métodos de exportação.

## 2. Implementação Técnica
A implementação utiliza uma estrutura de dados de retorno (`LazyRoundingResult`) que acopla o valor numérico e o textual.
- **Função `outputLazyRounding`:**
  - **Arredondamento:** Chama o `applyRounding` para ajustar o valor da escala interna (12) para a escala alvo (ex: 2 para centavos).
  - **Formatação de String:** Imediatamente após o arredondamento, utiliza o `formatBigIntToString` para gerar a representação decimal final (ex: "10.50").
- **Garantia de Coerência:** Ao realizar ambas as operações juntas, este módulo garante que o valor `BigInt` retornado (para persistência em banco de dados) seja matematicamente idêntico ao valor da string (apresentado ao usuário).

## 3. Onde e Como é Usado
- **Dependência de Cache:** É importado e consumido exclusivamente pela classe `CalcAUDOutput` (`src/output.ts`).
- **Fluxo de Dados:** O `CalcAUDOutput` utiliza este helper dentro de seu método privado `_resolveLazyCache()`. Isso assegura que, mesmo se o usuário chamar `toString()`, `toMonetary()` e `toCentsInBigInt()`, o cálculo real de arredondamento ocorra apenas uma vez.

## 4. Padrões de Design
- **Lazy Initialization Pattern:** Implementa a lógica que permite o adiamento e a cache do cálculo de saída.
- **Data Transfer Object (DTO) Pattern:** Utiliza a interface `LazyRoundingResult` para transportar o estado consolidado do arredondamento.

## 5. Parecer do Auditor
- **Eficiência de Performance:** A estratégia de cache implementada através deste módulo é vital para aplicações que processam grandes volumes de transações financeiras e geram múltiplos relatórios simultâneos.
- **Eliminação de Divergência:** Ao centralizar o arredondamento e a formatação, este módulo elimina o risco de "drift" de precisão (quando o valor apresentado visualmente difere do valor armazenado por centavos).
