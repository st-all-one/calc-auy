# Métodos de Saída (Output)

A fase de saída na CalcAUY é onde a Árvore de Sintaxe Abstrata (AST) é "projetada" para o formato final. Graças à arquitetura baseada em frações racionais, o arredondamento só ocorre nesta etapa, garantindo a máxima integridade durante todo o processamento.

## 🚀 Resumo de Métodos

Os métodos abaixo estão disponíveis na classe `CalcAUYOutput`, retornada após o comando `.commit()`.

### 🔢 Fundamentos Numéricos
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toStringNumber`](./output-methods/toStringNumber.md) | `res.toStringNumber()` | String decimal plana (ex: `"10.50"`). |
| [`toFloatNumber`](./output-methods/toFloatNumber.md) | `res.toFloatNumber()` | Converte para `number` (IEEE 754) - Cuidado com imprecisão. |
| [`toScaledBigInt`](./output-methods/toScaledBigInt.md) | `res.toScaledBigInt({ decimalPrecision: 2 })` | Retorna o valor escalonado (centavos) como `bigint`. |
| [`toRawInternalNumber`](./output-methods/toRawInternalNumber.md) | `res.toRawInternalNumber()` | Retorna o objeto racional bruto `{ n, d }`. |

### 🏦 Financeiro e Localização
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toMonetary`](./output-methods/toMonetary.md) | `res.toMonetary()` | Formatação de moeda localizada (ex: `R$ 10,50`). |
| [`toSlice`](./output-methods/toSlice.md) | `res.toSlice(3)` | Divisão exata em N partes com distribuição de restos. |
| [`toSliceByRatio`](./output-methods/toSliceByRatio.md) | `res.toSliceByRatio(["70%", "30%"])` | Rateio proporcional baseado em pesos. |

### ⚖️ Auditoria e Rastro Forense
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toLaTeX`](./output-methods/toLaTeX.md) | `res.toLaTeX()` | Representação matemática em formato LaTeX. |
| [`toUnicode`](./output-methods/toUnicode.md) | `res.toUnicode()` | Fórmula legível em texto puro (CLI/Logs). |
| [`toLiveTrace`](./output-methods/toLiveTrace.md) | `res.toLiveTrace()` | Objeto vivo para inspeção programática. |
| [`toAuditTrace`](./output-methods/toAuditTrace.md) | `res.toAuditTrace()` | Snapshot JSON assinado digitalmente (Lacre). |
| [`toMermaidGraph`](./output-methods/toMermaidGraph.md) | `res.toMermaidGraph()` | Diagrama de sequência do fluxo de jurisdição. |

### ♿ Acessibilidade (A11y)
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toVerbalA11y`](./output-methods/toVerbalA11y.md) | `res.toVerbalA11y()` | Tradução fonética para leitores de tela em múltiplos idiomas. |

### 🛠️ Extensibilidade (Processadores)
Para gerar formatos complexos como HTML rico ou Imagens, utilize processadores especializados através do método `toCustomOutput`.

| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toHTML`](./output-methods/toHTML.md) | `res.toCustomOutput(htmlProcessor)` | Fragmento HTML renderizado (KaTeX/MathJax). |
| [`toImageBuffer`](./output-methods/toImageBuffer.md) | `res.toCustomOutput(imageProcessor)` | Buffer de imagem (SVG/PNG) do rastro. |
| [`toCustomOutput`](./output-methods/toCustomOutput.md) | `res.toCustomOutput(myFn)` | Injeção de lógica de exportação personalizada. |
| [`toJSON`](./output-methods/toJSON.md) | `res.toJSON(["toMonetary"])` | Agrega múltiplos formatos em um único objeto JSON. |

---

## 💡 Guia de Decisão

- **Persistência em Banco:** Utilize `toScaledBigInt()` para colunas de inteiros ou `toAuditTrace()` para colunas de auditoria (JSONB).
- **Exibição em Dashboards:** Combine `toMonetary()` para o valor e `toHTML()` para mostrar a "prova" do cálculo ao passar o mouse.
- **Relatórios Judiciais:** Sempre utilize `toLaTeX()` e `toAuditTrace()`, garantindo que o rastro possa ser periciado independentemente do sistema.

Para detalhes profundos sobre opções de cada método, clique nos links acima.
