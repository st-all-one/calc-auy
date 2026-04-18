# Método: `toLaTeX()`

O `toLaTeX()` reconstrói a expressão matemática completa armazenada na AST utilizando a sintaxe padrão LaTeX. Ele inclui automaticamente o invólucro de arredondamento para garantir que o rastro reflita a realidade técnica do cálculo.

## ⚙️ Funcionamento Interno

1.  **Recursão de AST:** O método percorre a árvore de sintaxe das folhas para a raiz.
2.  **Mapeamento de Símbolos:** Traduz operações para comandos LaTeX (ex: `div` vira `\frac{n}{d}`, `pow` vira `x^{y}`).
3.  **Encapsulamento de Arredondamento:** Envolve a fórmula em um comando `\text{round}_{estratégia}(fórmula, precisão)`.
4.  **Escapamento de Caracteres:** Garante que símbolos como `%` sejam escapados (`\%`) para evitar erros de renderização.
5.  **Telemetria:** Monitorado por `TelemetrySpan` para medir o custo da reconstrução da string.

## 🎯 Propósito
Fornecer uma representação visual matematicamente rigorosa que pode ser renderizada em documentos acadêmicos, jurídicos ou interfaces web ricas (via KaTeX/MathJax).

## 💼 10 Casos de Uso Reais

1.  **Laudos Periciais:** Inclusão da fórmula exata do cálculo de juros em documentos judiciais.
```typescript
// Exemplo 1: Exportação para documento jurídico
const memo = `A fórmula aplicada foi: $${res.toLaTeX()}$`;
```
```typescript
// Exemplo 2: Snapshot de laudo pericial
const pericia = { formula_latex: output.toLaTeX() };
```

2.  **Dashboards de Investimentos:** Exibição da fórmula de precificação de derivativos complexos.
```typescript
// Exemplo 1: Título de gráfico financeiro
chartTitle.innerHTML = `Modelo: ${res.toLaTeX({ decimalPrecision: 6 })}`;
```
```typescript
// Exemplo 2: Tooltip matemático em dashboard
tooltip.setLaTeX(output.toLaTeX());
```

3.  **Relatórios Acadêmicos:** Exportação de resultados de cálculos de engenharia.
```typescript
// Exemplo 1: Geração de anexo em LaTeX
const reportSection = `\\section{Metodologia} \n ${res.toLaTeX()}`;
```
```typescript
// Exemplo 2: Exportação JSON para portal acadêmico
res.toJSON(["toLaTeX"]);
```

4.  **Sistemas de E-Learning:** Geração dinâmica de problemas matemáticos para alunos.
```typescript
// Exemplo 1: Questão de múltipla escolha
const question = `Qual o resultado de: $${res.toLaTeX()}$?`;
```
```typescript
// Exemplo 2: Resolução detalhada (Passo a passo)
const hint = `Observe a precedência: $${output.toLaTeX()}$`;
```

5.  **Documentação de APIs:** Fornecer o rastro visual do que o endpoint calculou.
```typescript
// Exemplo 1: Swagger UI Custom documentation
apiDoc.description = `Endpoint que executa: ${res.toLaTeX()}`;
```
```typescript
// Exemplo 2: Readme dinâmico de projeto
fs.writeFileSync("CALC.md", `Fórmula base: $${output.toLaTeX()}$`);
```

6.  **Memoriais de Cálculo:** Anexo técnico em faturas B2B complexas.
```typescript
// Exemplo 1: Texto de rodapé de nota fiscal
invoice.notes = `Justificativa matemática: ${res.toLaTeX()}`;
```
```typescript
// Exemplo 2: Anexo técnico em PDF
doc.addMathContent(output.toLaTeX());
```

7.  **Sistemas de Auditoria Fiscal:** Prova documental de como um imposto foi derivado.
```typescript
// Exemplo 1: Envio para SEFAZ (rastro)
const taxProof = { rationale: res.toLaTeX() };
```
```typescript
// Exemplo 2: Log de auditoria para Receita
logger.audit("IMPOSTO_CALCULADO", { math: output.toLaTeX() });
```

8.  **Blogs Técnicos:** Inclusão de fórmulas geradas via código em posts Markdown.
```typescript
// Exemplo 1: Conversão para arquivo .md
const post = `Calculado via CalcAUY: $${res.toLaTeX()}$`;
```
```typescript
// Exemplo 2: Template de blog (Hugo/Jekyll)
const frontmatter = `math_formula: "${output.toLaTeX()}"`;
```

9.  **Geração de PDFs Ricos:** Inserção de fórmulas matemáticas via bibliotecas como `Puppeteer`.
```typescript
// Exemplo 1: Template HTML para Puppeteer
const html = `<div>Fórmula: <script>document.write(katex.renderToString("${res.toLaTeX()}"))</script></div>`;
```
```typescript
// Exemplo 2: PDFMake math integration
pdfContent.push({ text: output.toLaTeX(), style: 'math' });
```

10. **Validação de Precedência:** Ferramenta de depuração para desenvolvedores verificarem se a AST foi montada corretamente.
```typescript
// Exemplo 1: Log técnico de depuração
if (DEBUG) console.debug("AST Structure (LaTeX):", res.toLaTeX());
```
```typescript
// Exemplo 2: Comparação de estruturas de árvore
assertEqual(res.toLaTeX(), expectedLatex);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Precisão do resultado final no rastro. | Altera o valor exibido após o sinal de `=` e o parâmetro de precisão na função `round`. |

## 💡 Recomendações
- **Use em conjunto com KaTeX.** É a forma mais rápida de renderizar esse output no navegador.
- **Sempre exiba o rastro LaTeX** em sistemas onde o cálculo pode ser contestado legalmente.

## 🏗️ Considerações de Engenharia
- **Auto-Agrupamento:** O gerador de LaTeX respeita os `GroupNodes`, garantindo que parênteses desnecessários sejam evitados, mas os críticos sejam mantidos.
- **Dízimas:** Se a estratégia for `NONE`, o resultado final no LaTeX exibirá até 50 casas decimais.
