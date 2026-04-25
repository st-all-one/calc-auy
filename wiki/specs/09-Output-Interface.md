# 09 - Interface Pública de Saída (CalcAUYOutput)

## Objetivo
Definir o contrato final de consumo dos resultados do cálculo. A classe `CalcAUYOutput` é o objeto imutável que carrega o estado final da Árvore AST e o resultado numérico processado, permitindo múltiplas representações do mesmo fato matemático.

## Métodos de Exportação Numérica e Monetária

### `toStringNumber(options?: OutputOptions): string`
- **Descrição:** Retorna a representação decimal do resultado final arredondado.
- **Parâmetro:** `options.decimalPrecision` define a escala (Default: 4).
- **Lógica:** Aplica a `roundStrategy` na precisão informada.
- **Performance:** Resultado cacheado por instância.

### `toFloatNumber(options?: OutputOptions): number`
- **Descrição:** Converte o resultado para o tipo `number` (float) do JavaScript.
- **Risco:** Útil para compatibilidade com gráficos, mas sujeito às imprecisões do padrão IEEE 754.

### `toScaledBigInt(options?: OutputOptions): bigint`
- **Descrição:** Retorna o valor inteiro escalado para a precisão informada.
- **Exemplo:** `10.50` com `decimalPrecision: 2` retorna `1050n`.

### `toRawInternalNumber(): { n: bigint, d: bigint }`
- **Descrição:** Retorna o objeto racional bruto (numerador e denominador) resultante do cálculo, sem qualquer arredondamento.

### `toASTObject(): Record<string, unknown>`
- **Descrição:** Retorna o rastro completo da execução como um objeto para inspeção programática (clonado). Inclui a AST, resultado, estratégia e assinatura.

### `toMonetary(options?: MonetaryOptions): string`
- **Descrição:** Retorna o valor formatado com símbolos monetários localizados (ex: `R$ 1.250,50`).

## Métodos de Rateio e Fatiamento (Slicing)

### `toSlice(parts: number, options?: OutputOptions): string[]`
- **Descrição:** Divide o valor final em `parts` parcelas iguais (Algoritmo de Maior Resto).

### `toSliceByRatio(ratios: (number | string)[], options?: OutputOptions): string[]`
- **Descrição:** Rateia o valor final baseado em um array de proporções (ex: `0.1`, `"30%"`, `"1/3"`).

## Métodos de Auditoria Visual e Acessibilidade

### `toLaTeX(options?: OutputOptions): string`
- **Descrição:** Reconstrói a fórmula matemática em sintaxe LaTeX.
- **Performance:** Resultado cacheado por instância.

### `toHTML(katex: IKatex, options?: OutputOptions): string`
- **Descrição:** Gera um fragmento HTML acessível utilizando o motor KaTeX.
- **Agnosticismo:** Injeta fontes e CSS via Base64 (inlined), garantindo funcionamento offline ou em backends (Puppeteer).
- **Performance:** Resultado cacheado por instância.

### `toVerbalA11y(options?: OutputOptions): string`
- **Descrição:** Tradução humana e audível do cálculo. Inclui detalhes de grupos e estratégia de arredondamento.

### `toUnicode(options?: OutputOptions): string`
- **Descrição:** Representação visual matemática para logs e terminais usando glifos Unicode.

### `toImageBuffer(katex: IKatex, options?: OutputOptions): Uint8Array`
- **Descrição:** Gera um buffer binário de uma imagem SVG auto-contida da fórmula.
- **Otimização:** Reutiliza o LaTeX renderizado e utiliza um encoder estático.

## Auditoria de Rastro e Estrutura

### `toAuditTrace(): string`
- **Descrição:** Retorna um snapshot JSON completo da execução (AST + Resultado + Estratégia).

### `toJSON<T extends OutputKey>(outputs?: T[], katex?, options?): string`
- **Descrição:** Consolida múltiplos outputs em uma única string JSON.
- **Tipagem Estática:** Exige a instância de `katex` via generics se `toHTML` ou `toImageBuffer` forem solicitados.

### `toCustomOutput<Toutput>(processor: ICalcAUYCustomOutput<Toutput>): Toutput`
- **Descrição:** Permite injetar um formatador externo com acesso total ao rastro e ao valor racional.

## Interface de Opções
```typescript
interface OutputOptions {
  decimalPrecision?: number;
  locale?: string;
  currency?: string;
}
```
