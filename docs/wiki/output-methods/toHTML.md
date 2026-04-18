# Método: `toHTML()`

O `toHTML()` gera um fragmento de código HTML altamente estilizado e acessível que renderiza visualmente a fórmula matemática utilizando o motor KaTeX.

## ⚙️ Funcionamento Interno

1.  **Geração de LaTeX:** Chama internamente o `toLaTeXInternal()` para obter a sintaxe matemática da AST.
2.  **Renderização KaTeX:** Utiliza a biblioteca KaTeX para converter o LaTeX em um conjunto de elementos HTML e CSS.
3.  **Injeção de Acessibilidade:** Gera o rastro verbal (`toVerbalA11yInternal`) e o injeta no atributo `aria-label` do container pai.
4.  **Embutimento de CSS:** Inclui um bloco de `<style>` com o CSS crítico do KaTeX para garantir que a fórmula seja exibida corretamente mesmo em sistemas sem estilos globais.
5.  **Cache de Saída:** Armazena o HTML gerado para evitar re-renderizações custosas do motor KaTeX.

## 🎯 Propósito
Entregar uma experiência visual de "primeira classe" para o usuário final em portais web, mantendo a compatibilidade total com tecnologias assistivas.

## 💼 10 Casos de Uso Reais

1.  **Dashboards Financeiros:** Exibição de fórmulas de cálculo de impostos ou ROI.
```typescript
// Exemplo 1: Widget em Dashboard React
<div dangerouslySetInnerHTML={{ __html: res.toHTML(katex) }} />
```
```typescript
// Exemplo 2: Tooltip rico com fórmula
tooltip.setContent(output.toHTML(katex, { decimalPrecision: 4 }));
```

2.  **Portais de Transparência:** Mostrar ao cidadão como uma verba pública foi distribuída.
```typescript
// Exemplo 1: Renderização em servidor Node.js
const fragment = output.toHTML(katex);
res.send(`<html><body>${fragment}</body></html>`);
```
```typescript
// Exemplo 2: Inject via jQuery
$("#calc-detail").html(res.toHTML(katex));
```

3.  **E-commerce B2B:** Detalhamento visual de descontos progressivos e taxas de frete.
```typescript
// Exemplo 1: Detalhe de linha de pedido
const rowHtml = `<tr><td>Total</td><td>${res.toHTML(katex)}</td></tr>`;
```
```typescript
// Exemplo 2: Modal de justificativa de preço
modal.body = output.toHTML(katex, { locale: "pt-BR" });
```

4.  **Relatórios Online:** Substituição de textos puros por fórmulas matemáticas elegantes.
```typescript
// Exemplo 1: Exportação HTML para portal
const report = blocks.map(b => b.res.toHTML(katex)).join("<hr>");
```
```typescript
// Exemplo 2: Print preview estilizado
const printHtml = `<div class="print-only">${output.toHTML(katex)}</div>`;
```

5.  **Plataformas de CMS (WordPress/Ghost):** Inclusão de blocos de cálculo em artigos.
```typescript
// Exemplo 1: Shortcode handler
const html = `[calc] -> ${res.toHTML(katex)}`;
```
```typescript
// Exemplo 2: Custom Gutenberg Block
edit: () => <div dangerouslySetInnerHTML={{ __html: output.toHTML(katex) }} />
```

6.  **Ferramentas de Suporte:** Agentes de atendimento enviando o rastro visual para o cliente via chat.
```typescript
// Exemplo 1: Bubble de chat com HTML
chat.appendMessage({ html: res.toHTML(katex) });
```
```typescript
// Exemplo 2: Knowledge Base snippet
kb.addArticle(res.toHTML(katex));
```

7.  **Sistemas de RH:** Demonstração visual do cálculo de bônus e PLR.
```typescript
// Exemplo 1: Portal do colaborador
const plrDiv = `Seu bônus: ${res.toHTML(katex)}`;
```
```typescript
// Exemplo 2: Demonstrativo de pagamento digital
paystub.sections.push(output.toHTML(katex));
```

8.  **Documentação de Software:** Exemplos vivos de fórmulas de API renderizadas na página.
```typescript
// Exemplo 1: Docusaurus custom component
const MathExample = () => <div dangerouslySetInnerHTML={{ __html: output.toHTML(katex) }} />;
```
```typescript
// Exemplo 2: JSDoc dynamic generation
/** @example {@link output.toHTML(katex)} */
```

9.  **Apps de Mobile Web:** Renderização de fórmulas complexas em telas pequenas com zoom perfeito.
```typescript
// Exemplo 1: WebView injection
webView.loadHTML(`<html><meta name="viewport" content="width=device-width"> ${res.toHTML(katex)}</html>`);
```
```typescript
// Exemplo 2: Ionic/Capacitor component
this.htmlContent = output.toHTML(katex);
```

10. **Emails em HTML:** Envio de memórias de cálculo via email (requer cuidado com suporte a CSS).
```typescript
// Exemplo 1: Inlined email body
const email = `Seu cálculo: <div style="font-family:serif">${res.toHTML(katex)}</div>`;
```
```typescript
// Exemplo 2: Attachment HTML
const attachment = Buffer.from(output.toHTML(katex));
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Precisão do valor exibido. | Muda o número final na fórmula renderizada. |
| `skipA11y` | `boolean` | Remove o `aria-label`. | Reduz o tamanho do HTML se a acessibilidade for gerida externamente. |

## 💡 Recomendações
- **Forneça a instância do KaTeX.** A biblioteca utiliza inversão de dependência para não inflar o bundle se você não for usar HTML.
- **Use em `dangerouslySetInnerHTML`.** Em React/Vue, o output é uma string HTML segura (com sanitização opcional via política de PII).

## 🏗️ Considerações de Engenharia
- **Self-Contained:** O fragmento contém seu próprio CSS, eliminando o problema de "estilos quebrados" em micro-frontends.
- **Shadow DOM Ready:** Pode ser inserido em Web Components sem interferir nos estilos globais da página.
