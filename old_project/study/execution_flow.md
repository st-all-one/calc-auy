# Mapa de Fluxo de Execução, Lifetime e Outputs

## 1. Ciclo de Vida do Objeto (Lifetime)
A CalcAUD utiliza um ciclo de vida linear e imutável. Cada etapa de processamento cria uma nova instância, preservando a história do cálculo anterior para fins de auditoria.

```bash
[START] --> [CalcAUD.from(value)]
   │           │
   │           └───> Parser: RE_DECIMAL, RE_FRACTION, RE_SCIENTIFIC
   │                 Escalona para BigInt 10^12
   │
[CALC] --> [add, sub, mult, div, pow, group]
   │           │
   │           └───> Cada método gera um NOVO CalcAUD (Imutável)
   │                 Acumula LaTeXExpression
   │                 Acumula UnicodeExpression
   │                 Acumula VerbalTokens
   │                 Protege precedência via Wrappers.ts
   │
[FREEZE] --> [commit(decimals, options?)]
   │           │
   │           └───> Transfere estado para CalcAUDOutput
   │                 Define precisão alvo e estratégias (NBR, HE, HU, etc)
   │
[OUTPUT] --> [toMonetary, toHTML, toLaTeX, toVerbalA11y, toUnicode, toImageBuffer]
   │           │
   │           └───> Resolve Lazy Cache (Ocorre apenas uma vez)
   │                 Aplica RoundingManager -> RoundingStrategies
   │                 Formata BigInt para String (Formatting.ts)
   │                 Renderiza Saída Solicitada
   │
[END]
```

---

## 2. Mapa de Transformação de Dados (Ponta a Ponta)

### Exemplo: `CalcAUD.from(10).div(3).commit(2)`

1. **Entrada (Internal):**
   - Valor: `10000000000000n` (10.000000000000 na escala 12)

2. **Operação (`div(3)`):**
   - Processamento: `(100...0n * 10^12 + adj) / (3 * 10^12)`
   - Resultado Interno: `3333333333333n` (3.333333333333 na escala 12)
   - Prova LaTeX: `\frac{10}{3}`
   - Prova Verbal: `10{#DIV#}3`

3. **Commit (`commit(2)`):**
   - Transfere para `CalcAUDOutput`. Decimais = 2.

4. **Execução de Saída (`toString()`):**
   - **Lazy Rounding:** `applyRounding(3333333333333n, "NBR-5891", 12, 2)`
   - **Resultado Arredondado:** `333n` (3.33 na escala 2)
   - **Formatação:** `"3.33"`

5. **Distribuição de Outputs:**
   - **toMonetary():** `"R$ 3,33"` (via Intl.NumberFormat)
   - **toLaTeX():** `$$ \frac{10}{3} = \text{round}_{NBR}(3.333333333333, 2) = 3.33 $$`
   - **toVerbalA11y():** `"10 dividido por 3 é igual a 3 vírgula 33 (Arredondamento: NBR-5891)"`
   - **toHTML():** Fragmento HTML com KaTeX e aria-label verbalizado.
   - **toImageBuffer():** Buffer binário SVG contendo a fórmula renderizada.

---

## 3. Matriz de Dependência de Execução
| Fase | Principal | Interno Crítico | Helper Crítico |
| :--- | :--- | :--- | :--- |
| **Parsing** | `main.ts` | `parser.ts` | `constants.ts` |
| **Cálculo** | `main.ts` | `math_utils.ts`, `wrappers.ts` | `i18n.ts` |
| **Arredondamento** | `output.ts` | `(nenhum)` | `rounding_strategies.ts`, `lazy_rounding.ts` |
| **Formatação** | `output.ts` | `subscript.ts`, `superscript.ts` | `formatting.ts`, `locales.ts` |
| **Renderização** | `output.ts` | `(nenhum)` | `html_generator.ts`, `image_generator.ts` |
