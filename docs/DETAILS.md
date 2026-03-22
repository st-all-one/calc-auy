# Manual Mestre: `CurrencyNBR` — Engenharia Financeira de Alta Precisão

Este documento é o mapa didático completo da biblioteca `currency-math-audit`. Ele explica a filosofia de design, os algoritmos fundamentais e as diretrizes de uso para garantir cálculos exatos, auditáveis e acessíveis.

---

## 1. O Que é esta Ferramenta?
A `CurrencyNBR` é uma biblioteca Deno/TypeScript projetada para manipular valores monetários e fórmulas financeiras complexas. Diferente de uma calculadora comum, ela mantém uma **memória histórica** de cada operação, permitindo gerar relatórios visuais (LaTeX) e narrações auditivas (WCAG AAA) em tempo real.

---

## 2. Por que ela Existe? (O Problema)
O JavaScript (e a maioria das linguagens) utiliza o padrão **IEEE 754 (Ponto Flutuante)** para números. Isso é excelente para ciência e performance, mas **desastroso para finanças**.

*   **O Erro de Aproximação:** `0.1 + 0.2` resulta em `0.30000000000000004`.
*   **Perda de Centavos:** Em sistemas de milhões de transações, esses pequenos erros acumulam-se em prejuízos reais.
*   **Falta de Auditoria:** Quando um valor está errado, é difícil reconstruir a fórmula exata que o gerou.

---

## 3. Como ela Resolve? (A Solução)

### 3.1 Escala Fixa com BigInt
Para eliminar o erro de aproximação, não usamos `number`. Usamos **`BigInt`**.
- Internamente, multiplicamos cada valor por **1.000.000.000.000** (10^12).
- Os cálculos são feitos sobre inteiros gigantes.
- A "vírgula" decimal só aparece na hora de exibir o resultado ao usuário.

### 3.2 Máquina de Estados de Auditoria
A classe não armazena apenas um número; ela armazena o **estado da fórmula**. Ela utiliza dois registradores internos para respeitar a matemática sem precisar de um parser complexo:

1.  **Acumulador (`accumulatedValue`):** Guarda resultados parciais de somas e subtrações (baixa precedência).
2.  **Termo Ativo (`activeTermValue`):** Guarda o valor que está sendo operado por multiplicações ou divisões (alta precedência).

---

## 4. Precedência e o Método `.group()`

A biblioteca segue a ordem matemática natural (PEMDAS/BODMAS).

*   **Sem Intervenção:** No cálculo `10 + 5 * 2`, ela sabe que o `5` deve ser multiplicado por `2` antes de ser somado ao `10`.
*   **Forçando Precedência:** Se você precisa de `(10 + 5) * 2`, deve usar o método **`.group()`**.

O .group() resolve o que está pendente no acumulador e no termo ativo, coloca parênteses na expressão LaTeX e cria um novo termo ativo consolidado.

---

## 5. Passo a Passo Guiado (Exemplo Prático)

Aqui está o fluxo completo de como utilizar a biblioteca em um cenário real:

### Passo 1: Instanciação
Sempre inicie o cálculo definindo o valor base. O uso de **Strings** é obrigatório para garantir que o JavaScript não perca decimais antes do processamento.
```typescript
const base = CurrencyNBR.from("1000.00");
```

### Passo 2: Operações em Cadeia
Adicione termos. Note que, sem agrupamento, a multiplicação tem precedência sobre a soma.
```typescript
// Aqui: 1000 + (500 * 0.10) = 1050
const simples = base.add("500.00").mult("0.10");
```

### Passo 3: Agrupamento (Forçando Precedência)
Se você deseja que a soma ocorra **antes** da multiplicação, use o `.group()`.
```typescript
// Aqui: (1000 + 500) * 0.10 = 150
const comGrupo = base.add("500.00").group().mult("0.10");
```

### Passo 4: Extração de Resultados (Múltiplas Saídas)
Agora você pode escolher como deseja consumir o dado final:
```typescript
// 1. Valor puro para persistência (Banco de Dados)
const valorDB = comGrupo.commit(2); // "150.00"

// 2. Expressão Visual para Auditoria (Frontend)
const visual = comGrupo.toLaTeX(2); // $$ \left( 1000.00 + 500.00 \right) \times 0.10 = 150.00 $$

// 3. Narração Verbal para Acessibilidade (WCAG AAA)
const acessivel = comGrupo.toVerbal(2); 
// "em grupo, 1000,00 mais 500,00, fim do grupo multiplicado por 0,10 é igual a 150 vírgula 00"
```

---

## 6. Dicionário de Métodos e Funcionamento

| Método | Tipo | Descrição | Comportamento Interno |
| :--- | :--- | :--- | :--- |
| `static from(v)` | Criador | Ponto de entrada. | Converte String/Number em BigInt escalado (10^12). |
| `.add(v)` | Operação | Soma. | Move o termo ativo para o acumulador e define o novo valor no ativo. |
| `.sub(v)` | Operação | Subtração. | Move o termo ativo para o acumulador e define o novo valor negativo no ativo. |
| `.mult(v)` | Operação | Multiplicação. | Multiplica apenas o termo ativo atual. |
| `.div(v)` | Operação | Divisão. | Divide apenas o termo ativo atual. Lança erro se `v=0`. |
| `.pow(exp)` | Operação | Potência/Raiz. | Eleva o termo ativo. Aceita frações como "1/2" para raízes. |
| `.mod(v)` | Operação | Resto. | Calcula o resto da divisão do termo ativo. |
| `.group()` | Estrutura | Agrupamento. | Consolida o estado, resolve a soma e coloca parênteses visuais. |
| `.commit(d)` | Finalizador | String Numérica. | Aplica o arredondamento **NBR 5891** e retorna o número. |
| `.toLaTeX(d)` | Finalizador | Auditoria Visual. | Retorna a fórmula completa formatada para KaTeX. |
| `.toHTML(d)` | Finalizador | Bloco Autocontido. | Gera um `div` com HTML e CSS embutidos para exibição imediata. |
| `.toUnicode(d)` | Finalizador | Visualização CLI. | Retorna a fórmula utilizando caracteres Unicode (sobrescritos, símbolos) para terminais. |
| `.toVerbal(d)` | Finalizador | Acessibilidade. | Retorna a narração em português para leitores de tela. |

---

## 6. Como Usar (Lifecycle de uma Chamada)

Para garantir integridade, siga sempre este fluxo:

1.  **Inicie com Strings:** Evite `from(0.1)`. Use `from("0.1")`.
2.  **Encadeamento:** Aproveite a fluidez. `valor.add(10).mult(2).group().pow(2)`.
3.  **Imutabilidade:** Lembre-se que cada método retorna um **novo objeto**. O original nunca muda.
4.  **Finalização:** Escolha sua saída. Use `commit()` para o banco de dados e `toLaTeX()` para a interface.

---

## 7. Acessibilidade WCAG AAA

O método `toVerbal()` é o que torna este projeto único para acessibilidade. Ele traduz:
*   `\frac{a}{b}` -> *"a dividido por b"*
*   `\sqrt[n]{x}` -> *"raiz de índice n de x"*
*   `\left( ... \right)` -> *"em grupo, ... , fim do grupo"*

Isso permite que usuários cegos compreendam auditorias financeiras complexas com a mesma clareza de um usuário vidente.

---

## 8. Considerações Importantes e Segurança

1.  **Arredondamento:** A biblioteca utiliza o **Critério do Par (NBR 5891)**. Isso significa que `1.225` arredonda para `1.22` e `1.235` arredonda para `1.24`. Isso remove o viés estatístico de inflação.
2.  **Estouro de BigInt:** Embora o BigInt suporte números gigantescos, a memória RAM é o limite. Operações de potência extrema (`pow(1000000)`) devem ser evitadas.
3.  **Rigor de Tipagem:** A classe lança erros explícitos para qualquer entrada que não possa ser convertida em um número válido, evitando o surgimento de `NaN` silenciosos.
