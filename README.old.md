# Currency Math Audit 🧮💰

**Precisão industrial, auditoria visual e acessibilidade total para cálculos financeiros.**

A `currency-math-audit` é uma biblioteca Deno/TypeScript projetada para sistemas que não podem errar um único centavo. Ela elimina os problemas de ponto flutuante do JavaScript através de uma escala fixa de **12 casas decimais** usando `BigInt`, enquanto gera automaticamente trilhas de auditoria em **LaTeX** e narrações em linguagem natural (**WCAG AAA**).

---

## 🌟 Principais Destaques

-   **Precisão de 12 Casas:** Operações exatas sem os erros do padrão IEEE 754 (`0.1 + 0.2` é exatamente `0.3`).
-   **Arredondamento NBR 5891:** Implementação rigorosa do "Arredondamento do Banqueiro" (Critério do Par).
-   **Auditabilidade Visual:** Gera expressões KaTeX prontas para exibição em interfaces de auditoria.
-   **Acessibilidade WCAG AAA:** Método `toVerbal()` que narra o cálculo em português claro para leitores de tela.
-   **Matemática Avançada:** Suporte a juros compostos, amortizações, raízes N-ésimas e potências complexas.

---

## 🚀 Início Rápido

### Instalação (Deno)
```typescript
import { CurrencyNBR } from "...";
```

### Exemplo de Uso
```typescript
const principal = CurrencyNBR.from("1000.00");
const taxa = CurrencyNBR.from(1).add("0.05").group(); // (1 + 0.05)
const montante = principal.mult(taxa.pow(12));           // P * (1+i)^12

console.log(montante.commit(2));   // "1795.86"
console.log(montante.toLaTeX(2));  // $$ 1000.00 \times {\left( 1 + 0.05 \right)}^{12} = 1795.86 $$
console.log(montante.toVerbal(2)); // "... multiplicado por em grupo, 1 mais 0,05, fim do grupo elevado a 12 ..."
```

---

## 🛠️ Comandos do Projeto

O projeto utiliza o Deno como runtime e gerenciador de tarefas:

-   **`deno task demo`**: Inicia o servidor de demonstração interativo em `http://localhost:8000`.
-   **`deno task test`**: Executa a suite de 18 testes (Core, Acessibilidade e Estresse).
-   **`deno task fmt`**: Formata o código seguindo os padrões do projeto.
-   **`deno task lint`**: Executa a análise estática de código.

---

## 📚 Documentação Detalhada

Para um mergulho profundo, consulte nossa pasta [`docs/`](./docs/):

1.  **[Manual Didático (DETAILS.md)](./docs/DETAILS.md)**: Entenda o motor de registradores e o ciclo de vida do cálculo.
2.  **[Guia de Exemplos (EXAMPLES.md)](./docs/EXAMPLES.md)**: Cenários Reais de SAC, ICMS, Baskhara e IRRF.
3.  **[Relatório Técnico (TECHNICAL_REPORT.md)](./docs/TECHNICAL_REPORT.md)**: Especificações de algoritmos (Newton-Raphson, NBR 5891).

---

## ⚖️ Conformidade e Normas

-   **Financeiro:** ABNT NBR 5891:1977 (Regras de Arredondamento).
-   **Acessibilidade:** WCAG 2.1 AAA & eMAG (Governo Eletrônico Brasileiro).
-   **Segurança:** Imutabilidade total dos objetos e proteção contra divisão por zero.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
