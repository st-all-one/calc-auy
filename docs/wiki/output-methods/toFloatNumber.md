# Método: `toFloatNumber()`

O `toFloatNumber()` converte o resultado de alta precisão da CalcAUY para o tipo primitivo `number` do JavaScript (ponto flutuante de 64 bits).

## ⚙️ Funcionamento Interno

1.  **Geração de String:** O método chama internamente o `toStringNumberInternal()` para obter a melhor representação decimal disponível.
2.  **Cast Nativo:** Utiliza o `Number.parseFloat()` para converter a string em um float nativo.
3.  **Telemetria:** Possui seu próprio `TelemetrySpan` de performance.

## 🎯 Propósito
Garantir compatibilidade com bibliotecas e ferramentas que não suportam `bigint` ou `strings` numéricas, especialmente em contextos de visualização de dados.

## ⚠️ AVISO DE ENGENHARIA
O uso deste método interrompe o rigor de precisão da biblioteca. Uma vez convertido para `number`, o valor fica sujeito às imprecisões do padrão **IEEE 754**. **Nunca utilize este método para cálculos financeiros subsequentes.**

## 💼 10 Casos de Uso Reais

1.  **Gráficos (Chart.js / D3):** Alimentar datasets de bibliotecas de renderização que exigem o tipo `number`.
```typescript
// Exemplo 1: Chart.js Dataset
new Chart(ctx, { data: { datasets: [{ data: [res.toFloatNumber()] }] } });
```
```typescript
// Exemplo 2: D3.js Scale
const yScale = d3.scaleLinear().domain([0, output.toFloatNumber()]).range([height, 0]);
```

2.  **Cálculos de UI Não Críticos:** Ajustar larguras de elementos ou opacidades baseadas em percentuais.
```typescript
// Exemplo 1: Estilo inline em React
<div style={{ width: `${res.toFloatNumber()}%` }} />
```
```typescript
// Exemplo 2: Ajuste de opacidade dinâmica
element.style.opacity = output.toFloatNumber().toString();
```

3.  **Dashboards de BI:** Exibição de tendências onde a diferença na 20ª casa decimal é irrelevante.
```typescript
// Exemplo 1: Formatação simples para dashboard
const summary = `Crescimento de ${res.toFloatNumber().toFixed(2)}%`;
```
```typescript
// Exemplo 2: Agrupamento em memória para visualização rápida
const mean = values.reduce((a, b) => a + b.toFloatNumber(), 0) / values.length;
```

4.  **Bibliotecas de Matemática (Math.js):** Integração com funções trigonométricas ou estatísticas avançadas nativas.
```typescript
// Exemplo 1: Math.sin()
const sinValue = Math.sin(res.toFloatNumber());
```
```typescript
// Exemplo 2: Math.log10()
const logValue = Math.log10(output.toFloatNumber());
```

5.  **Comparação Aproximada:** Verificações rápidas de "maior que" ou "menor que" em lógica de UI.
```typescript
// Exemplo 1: Lógica de cor de status
const color = res.toFloatNumber() > 0 ? "green" : "red";
```
```typescript
// Exemplo 2: Filtro rápido em array de objetos
const expensiveOnes = list.filter(item => item.price.toFloatNumber() > 1000);
```

6.  **Progress Bars:** Cálculo do percentual de progresso de uma operação.
```typescript
// Exemplo 1: Componente de progresso
<ProgressBar now={res.toFloatNumber()} label={`${res.toStringNumber()}%`} />
```
```typescript
// Exemplo 2: Atualização de progresso via Event Listener
onProgress(res.toFloatNumber());
```

7.  **Animações:** Interpolação de valores financeiros em transições visuais.
```typescript
// Exemplo 1: Framer Motion transition
<motion.div animate={{ scale: res.toFloatNumber() }} />
```
```typescript
// Exemplo 2: GSAP Tween
gsap.to(counter, { duration: 1, value: output.toFloatNumber() });
```

8.  **Exportação para PDF Simples:** Inserção de valores em geradores de PDF que esperam tipos numéricos básicos.
```typescript
// Exemplo 1: PDFKit text
doc.text(`Valor: ${res.toFloatNumber()}`);
```
```typescript
// Exemplo 2: jsPDF Table
autoTable(doc, { body: [["Total", res.toFloatNumber()]] });
```

9.  **Compatibilidade Legada:** Envio de dados para sistemas antigos que não possuem suporte a decimais precisos.
```typescript
// Exemplo 1: RPC call para sistema legado
legacyClient.updateBalance(res.toFloatNumber());
```
```typescript
// Exemplo 2: PostMessage para iframe de parceiro
parent.postMessage({ type: "RESULT", value: output.toFloatNumber() }, "*");
```

10. **Testes de fumaça:** Validação visual rápida da magnitude de um resultado.
```typescript
// Exemplo 1: Log rápido no console
console.log("Magnitude do resultado:", res.toFloatNumber());
```
```typescript
// Exemplo 2: Asserção de intervalo aproximado
expect(res.toFloatNumber()).toBeGreaterThan(0.5);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Casas decimais antes do cast. | Influencia o valor da string gerada antes da conversão para float. |

## 💡 Recomendações
- **Use apenas na "última milha"** do software (na camada de apresentação).
- **Evite em cálculos fiscais**, onde cada centavo deve ser mantido como racional.

## 🏗️ Considerações de Engenharia
- **Perda de Precisão:** Se o resultado possuir mais de 15-17 dígitos significativos, as casas decimais finais serão perdidas no arredondamento binário nativo da CPU.
- **Eficiência:** Por chamar `Internal`, ele evita a duplicação de logs, registrando apenas "toFloatNumber".
