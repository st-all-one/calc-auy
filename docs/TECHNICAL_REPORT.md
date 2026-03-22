# Relatório de Especificação Técnica: `currency-math-audit`

Este documento detalha a arquitetura, os algoritmos e os fundamentos de engenharia da biblioteca `currency-math-audit`. Foi projetado para servir como referência para auditores, engenheiros de software e especialistas em acessibilidade.

---

## 1. Fundamentos Arquiteturais

### 1.1 O Motor de Precisão (Fixed-Point BigInt)
A biblioteca rejeita o uso de tipos `number` (IEEE 754) para cálculos internos para evitar erros de arredondamento binário.
- **Tipo Base:** `BigInt`.
- **Escala Interna:** 12 casas decimais ($10^{12}$).
- **Constante:** `INTERNAL_SCALE_FACTOR = 1_000_000_000_000n`.
- **Vantagem:** Operações aritméticas sobre inteiros são exatas. A precisão de 12 casas garante que, mesmo após múltiplas divisões e raízes, a precisão final de 2 a 6 casas decimais (padrão financeiro) permaneça íntegra.

### 1.2 Imutabilidade e Estados
A classe `CurrencyNBR` é estritamente imutável. Cada operação retorna uma nova instância, preservando o histórico de cálculo.
- **Estado Interno:** Cada instância carrega o valor numérico e os fragmentos de expressão (LaTeX e Verbal) necessários para reconstruir sua própria história.

---

## 2. A Máquina de Estados de Auditoria

Para respeitar a precedência matemática (PEMDAS) sem a necessidade de um parser de árvore complexo, utilizamos um sistema de **dois registradores**:

### 2.1 Registrador de Acumulação (`accumulatedValue`)
Armazena a soma consolidada de termos de baixa precedência (adição e subtração).
- **LaTeX:** `accumulatedExpression`
- **Verbal:** `accumulatedVerbal`

### 2.2 Registrador de Termo Ativo (`activeTermValue`)
Armazena o termo que está sendo operado atualmente por alta precedência (multiplicação, divisão, potência).
- **LaTeX:** `activeTermExpression`
- **Verbal:** `activeTermVerbal`

### 2.3 Lógica de Consolidação
Ao chamar `.add()` ou `.sub()`, o valor do `activeTermValue` é somado ao `accumulatedValue`, "liberando" o termo ativo para o novo valor. Operações de multiplicação agem apenas sobre o termo ativo, mantendo a integridade da ordem de cálculo.

---

## 3. Algoritmos de Arredondamento (NBR 5891)

A biblioteca implementa rigorosamente a norma **ABNT NBR 5891:1977**, conhecida como "Arredondamento do Banqueiro" ou "Critério do Par".

### 3.1 Lógica de Decisão
1. Se o dígito a ser descartado for **menor que 5**, o dígito anterior permanece inalterado.
2. Se for **maior que 5**, o dígito anterior é incrementado.
3. Se for **exatamente 5**:
   - Se houver dígitos não-zero após o 5, o dígito anterior é incrementado.
   - Se for apenas 5 seguido de zeros:
     - Se o dígito anterior for **ímpar**, ele é incrementado (torna-se par).
     - Se o dígito anterior for **par**, ele permanece inalterado.

---

## 4. Engenharia de Matemática Avançada

### 4.1 Exponenciação de BigInt
Implementado via exponenciação binária para garantir performance em expoentes inteiros.

### 4.2 Raiz N-ésima (Newton-Raphson)
Para raízes (expoentes fracionários como $1/n$), utilizamos o método de Newton-Raphson adaptado para inteiros:
$$x_{k+1} = \frac{1}{n} \left[ (n-1)x_k + \frac{A}{x_k^{n-1}} \right]$$
- **Precisão:** Multiplicamos o radicando por um fator de ajuste antes da extração para manter as 12 casas decimais no resultado final da raiz.

---

## 5. Motor de Acessibilidade (WCAG AAA)

O método `toVerbal()` realiza uma tradução semântica da árvore de estados para Linguagem Natural (Português do Brasil).

### 5.1 Mapeamento Semântico
- **Operadores:** `+` -> "mais", `-` -> "menos", `\times` -> "multiplicado por", `\frac` -> "dividido por".
- **Estrutura:** O método `.group()` injeta os marcadores "em grupo" e "fim do grupo", permitindo que o usuário de leitor de tela entenda a precedência sem ambiguidades.
- **Localização:** Converte o caractere de ponto decimal `.` para a palavra `"vírgula"`, garantindo uma narração fluida.

## 6. Motor de Visualização Unicode (CLI)
Para ambientes onde a renderização KaTeX não é possível (Terminais), a biblioteca fornece o método `toUnicode()`.

### 6.1 Transformações Unicode
- **Exponenciação:** Conversão de strings numéricas para caracteres Superscript (ex: `x²`, `y⁽¹⁺ⁿ⁾`).
- **Raízes:** Utilização de símbolos de radical (`√`) combinados com Subscripts para índices (ex: `³√(x)`).
- **Operadores:** Substituição de caracteres ASCII por símbolos matemáticos dedicados (`×`, `÷`).

## 7. Segurança e Validação Operacional

## 6. Segurança e Validação Operacional

### 6.1 Tratamento de Exceções
- **Divisão por Zero:** Interceptada preventivamente no método `.div()`.
- **Raízes Inválidas:** Verificação de paridade do índice e sinal do radicando para evitar erros de números complexos (não suportados).
- **Tipagem Estrita:** O método `parseStringValue` utiliza Regex para garantir que nenhuma string malformada entre no motor de cálculo.

### 6.2 Estrutura de Arquivos
- `src/constants.ts`: Definição de escalas e precisões.
- `src/math_utils.ts`: Utilitários de baixo nível para BigInt (pow, root).
- `src/rounding.ts`: Motor de conformidade NBR 5891.
- `src/amount.ts`: Classe mestre `CurrencyNBR`.

---

## 7. Conformidade de Ambiente
- **Runtime:** Deno (compatível com Node/Browser via ESM).
- **Testes:** 100% de cobertura nos métodos críticos, incluindo estresse de BigInt e validação de acessibilidade.
