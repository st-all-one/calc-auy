# Métodos do Builder (CalcAUY)

A fase de construção na CalcAUY é onde a lógica de negócio é traduzida em uma **Árvore de Sintaxe Abstrata (AST)** imutável. Nesta etapa, nenhuma operação matemática é executada; os valores e operadores são acumulados de forma racional para garantir precisão absoluta no momento do fechamento.

## 🚀 Resumo de Métodos

Abaixo estão os métodos públicos da classe `CalcAUY`, organizados por sua função no ciclo de vida do builder.

### 📥 Ingestão e Persistência
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`from`](./builder-methods/from.md) | `CalcAUY.from("10.50")` | Ingestão segura de valores (Static). |
| [`parseExpression`](./builder-methods/parseExpression.md) | `CalcAUY.parseExpression("1+2")` | Parser de strings matemáticas (Static). |
| [`hydrate`](./builder-methods/hydrate.md) | `CalcAUY.hydrate(json)` | Reconstrói árvore a partir de JSON (Static). |
| [`hibernate`](./builder-methods/hibernate.md) | `calc.hibernate()` | Serializa a árvore atual para JSON. |

### 🏷️ Estrutura e Auditoria
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`setMetadata`](./builder-methods/setMetadata.md) | `calc.setMetadata("id", 1)` | Anexa justificativas de negócio ao nó. |
| [`group`](./builder-methods/group.md) | `calc.add(5).group()` | Força precedência (parênteses). |
| [`getAST`](./builder-methods/getAST.md) | `calc.getAST()` | Retorna o objeto da árvore bruta. |

### ⚡ Configuração e Otimização
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`setLoggingPolicy`](./builder-methods/setLoggingPolicy.md) | `calc.setLoggingPolicy(p)` | Define proteção de PII nos logs. |
| [`createCacheSession`](./builder-methods/createCacheSession.md) | `using _ = CalcAUY.session()` | Ativa cache de alta performance. |

### ➗ Operações Aritméticas (Fluentes)
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`add`](./builder-methods/add.md) | `calc.add(value)` | Adição aritmética. |
| [`sub`](./builder-methods/sub.md) | `calc.sub(value)` | Subtração aritmética. |
| [`mult`](./builder-methods/mult.md) | `calc.mult(value)` | Multiplicação (PEMDAS). |
| [`div`](./builder-methods/div.md) | `calc.div(value)` | Divisão racional (infinita). |
| [`pow`](./builder-methods/pow.md) | `calc.pow(exp)` | Potenciação e Raízes (Newton). |
| [`math-operations`](./builder-methods/math-operations.md) | `calc.mod(v)`, `calc.divInt(v)` | Aritmética modular e quocientes. |

### 🏁 Execução
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`commit`](./builder-methods/commit.md) | `calc.commit()` | Colapsa a árvore e gera o Output. |

---

## 💡 Fluxo de Trabalho Recomendado

1.  **Crie** a instância via `CalcAUY.from()` ou `parseExpression()`.
2.  **Encadeie** as operações (`add`, `mult`, etc.) e use `group()` para garantir a precedência.
3.  **Enriqueça** com `setMetadata()` em pontos críticos para auditoria.
4.  **Finalize** com `commit()` escolhendo a estratégia de arredondamento ideal.

Para detalhes profundos sobre cada método, incluindo 10 casos de uso reais e anotações de engenharia, clique nos links acima.
