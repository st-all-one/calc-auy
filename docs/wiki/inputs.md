# Guia Exaustivo de Entradas (Inputs)

Este documento detalha rigorosamente todos os tipos de entrada permitidos e proibidos na CalcAUY. A engine foi projetada com um sistema de ingestão estrito para garantir que a precisão racional seja mantida desde o primeiro contato com o dado.

---

## 1. Tipos de Dados Permitidos (Primitives & Objects)

A biblioteca aceita quatro categorias fundamentais de entrada através do método `CalcAUY.from()`:

| Tipo | Justificativa de Engenharia | Exemplo |
| :--- | :--- | :--- |
| **`string`** | **Recomendado.** Evita a conversão para binário do motor JS, preservando a dízima exata. | `"1250.50"` |
| **`bigint`** | Ideal para valores inteiros massivos (Satoshis, Wei) que excedem 2^53. | `9007199254740992n` |
| **`number`** | Permitido para conveniência, mas sujeito a imprecisões prévias do IEEE 754. | `10.5` |
| **`CalcAUY`** | Permite a composição de árvores de cálculo e sub-fórmulas. | `calc.add(subCalc)` |

---

## 2. Representações em String (O Rigor do Parser)

A CalcAUY utiliza um Parser de Ingestão que reconhece padrões matemáticos universais.

### A. Inteiros e BigInts
Suporta números inteiros com ou sem o sufixo `n` e permite o uso de sublinhados (`_`) como separadores visuais.
- **Padrão:** `"1000"`, `"1000n"`
- **Engenharia:** `"1_000_000"` (Tratado como `1000000`). O sublinhado é o separador neutro preferido em ambientes de engenharia (Python, Rust, Java).
- **Sinal:** `"+100"`, `"-100"`

### B. Frações Racionais
A forma mais pura de entrada. Permite definir a relação exata entre numerador e denominador.
- **Sintaxe:** `"Numerador/Denominador"`
- **Exemplos:** `"1/3"`, `"22/7"`, `"-1/2"`.
- **Vantagem:** Diferente de `0.333...`, a string `"1/3"` é armazenada como uma fração real, eliminando erro acumulado em multiplicações subsequentes.

### C. Decimais (Ponto Fixo)
Utiliza obrigatoriamente o ponto `.` como separador decimal.
- **Padrão:** `"10.50"`, `".5"` (Tratado como `0.5`), `"10."` (Tratado como `10`).
- **Engenharia:** `"1_250.509_9"`. Sublinhados são permitidos tanto na parte inteira quanto na decimal.

### D. Notação Científica (E-Notation)
Suporta escalas de engenharia para valores astronômicos ou microscópicos.
- **Sintaxe:** `[Base]e[Expoente]`
- **Exemplos:** `"1.2e3"` (1200), `"5.972e24"` (Massa da Terra), `"1e-10"`.
- **Justificativa:** Essencial para cálculos de precisão física onde o número de zeros tornaria a string ilegível e propensa a erros manuais.

### E. Percentuais
A CalcAUY reconhece o sufixo `%` e realiza a normalização automática.
- **Funcionamento:** `"10.5%"` é imediatamente convertido para a fração `105/1000`.
- **Auditabilidade:** O rastro original `"10.5%"` é preservado no metadado `originalInput` para transparência no rastro de auditoria.

---

## 3. Entradas NÃO Permitidas

Para manter a integridade forense, a CalcAUY bloqueia entradas ambíguas ou matematicamente inválidas.

### ❌ Separadores Localizados (Vírgula como Decimal)
- **Input:** `"10,50"`
- **Resultado:** `CalcAUYError: invalid-syntax`
- **Motivação:** A vírgula é ambígua internacionalmente (separador de milhar em países anglo-saxões, decimal em países latinos). Para evitar erros de magnitude de 1000x, a lib exige o padrão ISO/Engenharia (Ponto).

### ❌ Valores Não-Finitos (NaN e Infinity)
- **Input:** `NaN`, `Infinity`, `-Infinity`
- **Resultado:** `CalcAUYError: unsupported-type`
- **Motivação:** A CalcAUY é uma engine de números racionais reais. Estados indefinidos do IEEE 754 não possuem representação fracionária válida e corromperiam a árvore de auditoria.

### ❌ Divisão por Zero em Ingestão
- **Input:** `"10/0"`
- **Resultado:** `CalcAUYError: division-by-zero`
- **Motivação:** Divisões por zero resultam em indefinição matemática. O erro é lançado na ingestão para evitar que uma árvore inválida seja construída.

### ❌ Texto Não-Numérico ou Sujeira
- **Input:** `"R$ 10.50"`, `"10.50 total"`, `"abc"`
- **Resultado:** `CalcAUYError: invalid-syntax`
- **Motivação:** A engine não faz "guess-work" (adivinhação). Símbolos de moeda ou textos devem ser tratados na camada de aplicação ou via metadados. O input deve ser puramente numérico.

### ❌ Números que Excedem o Limite de Segurança
- **Input:** BigInts superiores a 1 milhão de bits.
- **Resultado:** `CalcAUYError: math-overflow`
- **Motivação:** Proteção contra ataques de ReDoS ou exaustão de memória (RAM) por alocação de inteiros gigantescos.

### ❌ Sublinhados (`_`) Malformados
- **Inputs:** `"1__000"`, `"_100"`, `"100_"`
- **Resultado:** `CalcAUYError: invalid-syntax`
- **Motivação:** O sublinhado deve ser exclusivamente um separador *entre* dígitos. O uso de dois ou mais consecutivos, ou no início/fim da string, viola o rigor léxico e pode causar ambiguidade em parsers de outras linguagens.

### ❌ Espaços Internos ou Delimitadores de Milhar
- **Inputs:** `"1 000"`, `"10. 50"`, `"1.000,00"`
- **Resultado:** `CalcAUYError: invalid-syntax`
- **Motivação:** Espaços em branco são permitidos apenas nas extremidades da string (trimming). Internamente, causam erro de parser. O ponto `.` é exclusivo para decimais, não para milhares.

### ❌ Operadores Inválidos ou Subsequentes no `parseExpression()`
- **Inputs:** `"1 ++ 2"`, `"1 + * 2"`, `"1 ** 2"`
- **Resultado:** `CalcAUYError: invalid-syntax` (Parser Error)
- **Motivação:** A CalcAUY exige uma gramática matemática estrita. 
    - Operadores binários requerem um operando em cada lado.
    - O operador de potência é `^`, não `**` (padrão Python/JS).
    - Incrementos (`++`) não existem na engine racional.

---

## 5. Estruturas de Árvore Inválidas (`hydrate()`)

O método `hydrate()` reconstrói cálculos a partir de objetos JSON. Ele aplica uma validação estrutural profunda antes de aceitar a entrada.

### ❌ Tipos de Nó Desconhecidos
- **Input:** `{ "kind": "magic-op", ... }`
- **Motivação:** A engine aceita apenas `literal`, `operation` e `group`. Qualquer outro valor no campo `kind` invalida o rastro de auditoria.

### ❌ Valores Racionais Malformados
- **Input:** `{ "kind": "literal", "value": { "n": "abc", "d": "1" } }`
- **Motivação:** O numerador (`n`) e denominador (`d`) devem ser strings representando BigInts válidos. Conteúdo alfanumérico impede a reconstrução matemática.

### ❌ Ausência de Campos Obrigatórios
- **Input:** `{ "kind": "operation", "left": { ... } }` (Faltando `right` ou `type`)
- **Motivação:** Operações binárias são objetos completos. A ausência de um dos ramos da árvore torna a execução impossível.

---

## 6. Tokens Permitidos no `parseExpression()`

Além da ingestão direta via `from()`, o método `parseExpression()` aceita strings de fórmulas complexas. Os tokens válidos são:

| Categoria | Símbolos / Exemplo | Descrição |
| :--- | :--- | :--- |
| **Números** | `123`, `10.5`, `1e3` | Literais numéricos seguindo as regras da Seção 2. |
| **Operadores** | `+`, `-`, `*`, `/` | Operações aritméticas básicas. |
| **Avançados** | `^`, `//`, `%` | Potência, Divisão Inteira e Módulo. |
| **Agrupamento** | `(`, `)` | Parênteses para controle de precedência. |

---

## 7. Comparativo de Precisão na Ingestão

| Entrada | Tipo | Valor Interno (n/d) | Precisão Preservada |
| :--- | :--- | :--- | :--- |
| `0.1 + 0.2` | `number` | `10808639105689191/36028797018963968` | **Baixa** (IEEE 754 bias) |
| `"0.1"` + `"0.2"` | `string` | `3/10` | **Absoluta** (Exato) |
| `"1/3"` | `string` | `1/3` | **Absoluta** (Dízima Pura) |

**Recomendação de Ouro:** Para sistemas financeiros e de auditoria, **sempre utilize Strings** para ingestão. O tipo `number` deve ser reservado apenas para contadores simples ou integrações onde a precisão binária já é aceita.
