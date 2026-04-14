# 08 - Especificação Restritiva de Input e Lexer

## Objetivo
Atuar como o "Guardião da Integridade" da CalcAUY 2.0, garantindo que apenas dados numericamente puros e inequívocos entrem no sistema, convertendo-os diretamente para a forma racional sem perda de precisão por escala fixa.

## 1. Tipos de Entrada Permitidos (Rigor Superior)

Diferente da versão 1.0, o input **DEVE** ser preferencialmente `string` ou `bigint`. O tipo `number` (IEEE 754) é desencorajado e deve ser validado para garantir que não contenha imprecisões de ponto flutuante antes de ser aceito.

### Formatos Suportados
- **Inteiros:** `100`, `-50`, `1_000_000`.
- **Decimais:** `10.50`, `-0.0001`, `.5`. (Convertidos para `n/10^x`). Entradas que começam com ponto (ex: `.5`) são normalizadas visualmente para `0.5` nos outputs.
- **Frações:** `1/3`, `-22/7`. (Mantidos como racionais puros).
- **Percentuais:** `10%`, `1.5%`, `1_000.5%`. (Convertidos para `n/100`).
- **Científicos:** `1.5e-10`, `6.022e23`.
- **Literais BigInt:** `100n`.

## 2. Regras de Restrição e Segurança (Runtime)

O Parser deve disparar `CalcAUYError` e interromper o fluxo se detectar:
1. **Valores Não-Finitos:** `NaN`, `Infinity`, `-Infinity`.
2. **Ambiguidade de Separador:** Uso misto de `.` e `,` na mesma string sem definição clara de locale.
3. **Lixo de String:** `10.50abc`, `10..5`, `1/2/3`.
4. **Underscores Inválidos:** `_100`, `100_`, `10__0`. (Devem seguir a regra de separador interno).
5. **Tipos Proibidos:** `null`, `undefined`, `object` (exceto instâncias da própria lib ou AST).

## 3. Lógica de Conversão para `RationalNumber`

Ao contrário da versão anterior que escalava tudo para $10^{12}$, a nova versão deve manter a natureza do número:

| Entrada | Lógica de Conversão | Resultado Racional (`n/d`) |
| :--- | :--- | :--- |
| `"0.25"` | 2 casas decimais -> $25/100$ | $1/4$ |
| `"10.5%"` | $(105/10) / 100$ | $21/200$ |
| `"1/3"` | Mantém numerador e denominador | $1/3$ |
| `"1e-2"` | Expoente negativo -> $1/10^2$ | $1/100$ |
| `100n` | Denominador padrão 1 | $100/1$ |

## 4. Normalização e Higienização

Antes de processar, a lib realiza:
- Remoção de underscores (`_`) para cálculo, mantendo-os no `originalInput` se solicitado (exceto em percentuais normalizados).
- Normalização de ponto inicial: `.5` é tratado matematicamente como `0.5`.
- Validação de sinal único no início.

## 5. Lexer e Tokenização

O processo de tokenização para a AST é atômico e suporta:
- **NUMBER:** Sequência de dígitos, ponto, notação científica ou sufixo `n`.
- **OPERATOR:** `+`, `-`, `*`, `/`, `//` (Divisão Inteira), `%` (Módulo ou Percentual), `^`.
- **PARENTHESES:** `(` e `)`.

### Exemplo de Fluxo de Rigor:
Input: `"1_000.50 / (1/3)"`
1. **Clean:** `"1000.50/(1/3)"`
2. **Tokens:** `[NUM(1000.50), OP_DIV, LPAREN, NUM(1/3), RPAREN]`
3. **Rational Conversion:** `NUM(1000.50)` vira `100050/100` -> `2001/2`.
4. **Result:** A AST processará a divisão entre `2001/2` e `1/3`.

## 6. Diferencial de Auditoria (Original Input)
Cada `LiteralNode` na AST **DEVE** preservar a string original de entrada (`originalInput`). Isso permite que, no rastro de auditoria, possamos mostrar exatamente o que o usuário digitou (ex: `"1/3"`) em vez do valor processado (ex: `0.333...`).
