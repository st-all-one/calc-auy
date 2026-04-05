# 09 - Interface Pública de Saída (CalcAUYOutput)

## Objetivo
Definir o contrato final de consumo dos resultados do cálculo. A classe `CalcAUYOutput` é o objeto imutável que carrega o estado final da Árvore AST e o resultado numérico processado, permitindo múltiplas representações do mesmo fato matemático.

## Métodos de Exportação Numérica e Monetária

### `toStringNumber(options?: OutputOptions): string`
- **Descrição:** Retorna a representação decimal do resultado final arredondado.
- **Lógica:** Aplica a `roundStrategy` (definida no `commit`) na precisão `decimalPrecision` informada.
- **Exemplo:** `1.2345` -> `toStringNumber({ decimalPrecision: 2 })` -> `"1.23"` (se TRUNCATE).

### `toFloatNumber(options?: OutputOptions): number`
- **Descrição:** Converte o resultado para o tipo `number` (float) do JavaScript.
- **Risco:** Útil para compatibilidade com gráficos ou outras bibliotecas, mas sujeito às imprecisões do padrão IEEE 754 para valores muito grandes.

### `toCentsInBigInt(options?: OutputOptions): bigint`
- **Descrição:** Retorna o valor inteiro escalado para a precisão informada.
- **Caso de Uso:** Ideal para salvar em bancos de dados como "inteiro" para evitar problemas de float.
- **Exemplo:** `10.50` com `decimalPrecision: 2` retorna `1050n`.

### `toRawInternalBigInt(): bigint`
- **Descrição:** Retorna o numerador puro do `RationalNumber` resultante. Sem arredondamentos ou escalas de saída.

### `toMonetary(options?: MonetaryOptions): string`
- **Descrição:** Retorna o valor formatado com símbolos monetários e separadores localizados (ex: `R$ 1.250,50`).
- **Parâmetros:** Exige `currency` (BRL, USD, etc) e `decimalPrecision`.

## Métodos de Rateio e Fatiamento (Slicing)

### `toSlice(parts: number, options?: OutputOptions): string[]`
- **Descrição:** Divide o valor final em `parts` parcelas iguais, garantindo que a soma das parcelas seja exatamente igual ao total original.
- **Algoritmo (Maior Resto):**
  1. Converte o valor final para centavos (BigInt) baseado na `decimalPrecision`.
  2. Calcula o `valorBase = total / partes` (divisão inteira).
  3. Calcula o `resto = total % partes`.
  4. Distribui 1 centavo para as primeiras `resto` parcelas.
- **Exemplo:** `10.00` dividido em 3 partes -> `["3.34", "3.33", "3.33"]`.

### `toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[]`
- **Descrição:** Rateia o valor final baseado em um array de proporções (ex: `0.1`, `"22.5%"`, `"1/3"`).
- **Rigor:** 
  1. Normaliza os percentuais para que a soma seja 1 (100%).
  2. Aloca a parte inteira de centavos para cada parcela proporcional.
  3. Distribui os centavos sobressalentes priorizando as parcelas que tiveram os maiores restos decimais na divisão, garantindo que a soma total bata com o valor original no centavo.

## Métodos de Auditoria Visual e Acessibilidade

### `toLaTeX(): string`
- **Descrição:** Reconstrói a fórmula matemática em sintaxe LaTeX a partir da AST.
- **Exemplo:** `10 / (2 + 3)` -> `\frac{10}{\left( 2 + 3 \right)}`.

### `toHTML(katexRenderer: (latex: string) => string): string`
- **Descrição:** Gera um fragmento HTML acessível.
- **Acessibilidade:** Deve incluir um `aria-label` contendo o retorno do `toVerbalA11y()`.

### `toVerbalA11y(options?: OutputOptions): string`
- **Descrição:** Tradução humana e audível do cálculo.
- **Rigor:** Deve detalhar o início e fim de grupos (parênteses) e explicitar a estratégia de arredondamento usada.
- **Exemplo:** "Abre parênteses, dez mais cinco, fecha parênteses, dividido por três, igual a cinco vírgula zero zero (Arredondamento: NBR-5891 para 2 casas decimais)".

### `toUnicode(options?: OutputOptions): string`
- **Descrição:** Representação visual simples para logs e terminais.
- **Exemplo:** `2³ + √(16)`.

### `toImageBuffer(katexRenderer: (latex: string) => string, options?: OutputOptions): Promise<Uint8Array>`
- **Descrição:** Gera um buffer binário de uma imagem SVG auto-contida da fórmula.

## Auditoria de Rastro e Estrutura

### `toAuditTrace(): Record<string, unknown>`
- **Descrição:** Retorna um snapshot completo da execução.
- **Conteúdo:** Um objeto JSON contendo a Árvore AST serializada, onde cada nó inclui:
  - O valor intermediário calculado naquele ponto (como `RationalNumber`).
  - A expressão parcial (LaTeX/Unicode).
  - Metadados de negócio anexados.
- **Objetivo:** Permitir que auditores externos verifiquem o "passo a passo" do cálculo sem reexecutá-lo.

### `toJSON(outputs?: OutputKey[]): Record<string, unknown>`
- **Descrição:** Consolida múltiplos outputs em um único objeto.
- **Padrão:** `["toStringNumber", "toCentsInBigInt", "toMonetary", "toLaTeX", "toUnicode", "toVerbalA11y", "toAuditTrace"]`.

### `toCustomOutput<Toutput>(processor: ICalcAUYCustomOutput<Toutput>): Toutput`
- **Descrição:** O ápice da extensibilidade da CalcAUY. Permite injetar um formatador externo que tem acesso total ao rastro de auditoria e ao valor racional.
- **Detalhes Técnicos:** Consulte a **`specs/16-Custom-Output-Processors.md`** para a definição completa da interface e do contexto de dados.

## Interface de Opções
```typescript
interface OutputOptions {
  decimalPrecision?: number; // Opcional, se omitido usa a precisão total do racional
  locale?: string;
  currency?: string;
}
```
