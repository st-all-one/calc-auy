# Métodos de Saída (Output)

A fase de saída na CalcAUY é onde a Árvore de Sintaxe Abstrata (AST) é colapsada e transformada no formato desejado. Graças à arquitetura baseada em frações racionais, o arredondamento só ocorre nesta etapa final, garantindo a máxima integridade dos dados.

## 🚀 Resumo de Métodos

Abaixo estão os métodos disponíveis na classe `CalcAUYOutput` (gerada após o `.commit()`), com exemplos rápidos de uso.

### 🔢 Fundamentos Numéricos
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toStringNumber`](./output-methods/toStringNumber.md) | `res.toStringNumber()` | String decimal plana (ex: `"10.50"`). |
| [`toFloatNumber`](./output-methods/toFloatNumber.md) | `res.toFloatNumber()` | Converte para `number` nativo do JS. |
| [`toScaledBigInt`](./output-methods/toScaledBigInt.md) | `res.toScaledBigInt({ p: 2 })` | Retorna centavos como `bigint` (`1050n`). |
| [`toRawInternalNumber`](./output-methods/toRawInternalNumber.md) | `res.toRawInternalNumber()` | Retorna o objeto racional bruto (n/d). |

### 🏦 Financeiro e Localização
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toMonetary`](./output-methods/toMonetary.md) | `res.toMonetary()` | Formatação de moeda (ex: `R$ 10,50`). |

### ⚖️ Auditoria e Rastro
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toLaTeX`](./output-methods/toLaTeX.md) | `res.toLaTeX()` | Fórmula em sintaxe matemática LaTeX. |
| [`toUnicode`](./output-methods/toUnicode.md) | `res.toUnicode()` | Fórmula legível em texto puro (Unicode). |
| [`toASTObject`](./output-methods/toASTObject.md) | `res.toASTObject()` | Objeto de auditoria puro (clonado). |
| [`toAuditTrace`](./output-methods/toAuditTrace.md) | `res.toAuditTrace()` | Snapshot JSON completo da execução. |

### ♿ Acessibilidade e Web
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toVerbalA11y`](./output-methods/toVerbalA11y.md) | `res.toVerbalA11y()` | Descrição fonética para leitores de tela. |
| [`toHTML`](./output-methods/toHTML.md) | `res.toHTML(katex)` | Fragmento HTML renderizado com KaTeX. |
| [`toImageBuffer`](./output-methods/toImageBuffer.md) | `res.toImageBuffer(katex)` | Gera um buffer de imagem SVG do rastro. |

### 🍕 Distribuição e Rateio
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toSlice`](./output-methods/toSlice.md) | `res.toSlice(3)` | Divide o total em N partes iguais. |
| [`toSliceByRatio`](./output-methods/toSliceByRatio.md) | `res.toSliceByRatio([0.7, 0.3])` | Rateio proporcional baseado em pesos. |

### 🛠️ Agregação e Extensibilidade
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`toJSON`](./output-methods/toJSON.md) | `res.toJSON(["toMonetary"])` | Agrega múltiplos formatos em um JSON. |
| [`toCustomOutput`](./output-methods/toCustomOutput.md) | `res.toCustomOutput(myFn)` | Injeção de processadores customizados. |

---

## 💡 Qual método escolher?

- **Para APIs:** Use `toStringNumber()` ou `toJSON()`.
- **Para Bancos de Dados:** Use `toScaledBigInt()` para colunas de inteiros.
- **Para Documentos Legais:** Sempre anexe o resultado do `toAuditTrace()`.
- **Para Interfaces de Usuário:** Combine `toMonetary()` com `toHTML()`.

Para detalhes profundos sobre opções, casos de uso e engenharia de cada método, clique nos links acima.
