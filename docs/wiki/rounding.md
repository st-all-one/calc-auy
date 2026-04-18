# Estratégias de Arredondamento

A CalcAUY aplica o princípio de **Arredondamento Tardio**. O cálculo é mantido em sua forma racional exata ($n/d$) durante toda a fase de construção e execução, sendo "projetado" para uma escala decimal apenas no momento do output.

A escolha da estratégia de arredondamento é feita no método `.commit({ roundStrategy: '...' })`.

## 1. NBR 5891 (Padrão da Biblioteca)

A estratégia padrão da CalcAUY é a **ABNT NBR 5891:1977**, a norma brasileira que rege o arredondamento de numerais.

-   **Funcionamento:** Baseia-se no algarismo a ser conservado e no algarismo seguinte.
    -   **Algarismo seguinte < 5:** O algarismo a ser conservado permanece inalterado.
    -   **Algarismo seguinte > 5:** O algarismo a ser conservado é aumentado de uma unidade.
    -   **Algarismo seguinte == 5:**
        -   Se o 5 for seguido de qualquer algarismo diferente de zero, aumenta-se uma unidade.
        -   Se o 5 for o último ou seguido apenas de zeros, aplica-se a **Regra do Par**: o algarismo a ser conservado só aumenta se for ímpar (tornando-se par). Se já for par, permanece inalterado.
-   **Referência:** Norma ABNT NBR 5891:1977.
-   **Diferencial:** Elimina o viés estatístico de arredondar sempre para cima, sendo a norma legal para documentos fiscais no Brasil.

## 2. NONE (Precisão Máxima)

A estratégia `NONE` é o modo de **Precisão Racional Pura**.

-   **Funcionamento:** Ignora qualquer processo de colapso decimal durante a fase de arredondamento. Retorna o valor racional exato.
-   **Precisão:** Quando convertido para string, utiliza a precisão interna de **50 casas decimais** para garantir que dízimas periódicas e multiplicações complexas sejam representadas com fidelidade total.
-   **Uso Ideal:** Pesquisa científica, cálculos de engenharia de alta precisão e sistemas que precisam de reconciliação bit-a-bit.

## 3. TRUNCATE (Corte numérico)

-   **Funcionamento:** Simplesmente descarta todas as casas decimais além da precisão solicitada, sem realizar nenhum ajuste no último dígito.
-   **Comportamento:** Move o valor em direção ao zero.
-   **Uso Ideal:** Sistemas que não permitem o "ganho" de centavos (ex: saques bancários onde o remanescente deve ficar na conta).

## 4. HALF-UP (Arredondamento Comercial)

-   **Funcionamento:** Se a fração for $\ge 0,5$, arredonda para cima. Caso contrário, arredonda para baixo.
-   **Diferença para NBR:** No caso exato de `,5`, o `HALF-UP` sempre aumenta o dígito, enquanto a NBR olha se o dígito anterior é par ou ímpar.
-   **Uso Ideal:** Varejo e sistemas de e-commerce padrão.

## 5. HALF-EVEN (Banker's Rounding)

-   **Funcionamento:** Idêntico à lógica de desempate da NBR 5891. Arredonda para o número par mais próximo.
-   **Referência:** Padrão IEEE 754.
-   **Uso Ideal:** Sistemas financeiros internacionais e contabilidade de grandes volumes.

## 6. CEIL (Teto)

-   **Funcionamento:** Arredonda sempre para cima (em direção ao infinito positivo) se houver qualquer valor residual.
-   **Uso Ideal:** Cálculos de frete (onde 1,1kg vira 2kg) ou cobranças mínimas de serviços.

---

## Tabela Comparativa

Exemplo: Arredondando para **0 casas decimais**.

| Valor | NBR 5891 | NONE | TRUNCATE | HALF-UP | CEIL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2,5** | 2 | 2,5 | 2 | 3 | 3 |
| **3,5** | 4 | 3,5 | 3 | 4 | 4 |
| **2,51** | 3 | 2,51 | 2 | 3 | 3 |
| **-2,5** | -2 | -2,5 | -2 | -3 | -2 |

---

## Considerações

### Por que a precisão interna é 50?
A CalcAUY utiliza $10^{50}$ como fator de escala interno para operações que exigem transição de racional para decimal (como raízes enésimas). Isso garante que, mesmo após centenas de operações em cadeia, o erro acumulado seja menor do que a menor unidade monetária existente no mundo.

### Performance
As estratégias `NBR5891` e `HALF_EVEN` possuem um custo computacional levemente superior devido à checagem de paridade, mas a engine utiliza **Hot Caches** e **Bitwise Operators** para garantir que esse impacto seja insignificante em processamentos de massa.
