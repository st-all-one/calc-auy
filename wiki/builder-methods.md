# Métodos do Builder (CalcAUY)

A fase de construção na CalcAUY é onde a lógica de negócio é traduzida em uma **Árvore de Sintaxe Abstrata (AST)** imutável. Agora, com o **Controle Rigoroso de Instâncias**, cada builder opera em uma jurisdição isolada e segura.

## 🚀 Resumo de Métodos

Os métodos são acessados através da instância criada pela factory `CalcAUY.create()`.

### 🏗️ Criação de Contexto (Static)
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`create`](./builder-methods/create.md) | `CalcAUY.create({label, salt})` | Gera um novo universo de cálculo isolado. |
| [`checkIntegrity`](./builder-methods/checkIntegrity.md) | `await CalcAUY.checkIntegrity(t, {salt})` | Valida assinatura sem reconstruir a árvore. |

### 📥 Ingestão e Persistência (Instância)
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`from`](./builder-methods/from.md) | `instance.from("10.50")` | Ingestão segura de valores. |
| [`parseExpression`](./builder-methods/parseExpression.md) | `instance.parseExpression("1+2")` | Parser de strings matemáticas. |
| [`hydrate`](./builder-methods/hydrate.md) | `await instance.hydrate(j, {salt})` | Reconstrói árvore validando integridade. |
| [`hibernate`](./builder-methods/hibernate.md) | `await instance.hibernate()` | Serializa a árvore com assinatura digital. |
| [`fromExternalInstance`](./builder-methods/fromExternalInstance.md) | `await instance.fromExternalInstance(ext)` | Integração segura entre jurisdições. |

### 🏷️ Estrutura e Auditoria
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`setMetadata`](./builder-methods/setMetadata.md) | `calc.setMetadata("id", 1)` | Anexa justificativas de negócio ao nó. |
| [`group`](./builder-methods/group.md) | `calc.add(5).group()` | Força precedência (parênteses). |

### ⚡ Otimização
| Método | Exemplo Rápido | Descrição |
| :--- | :--- | :--- |
| [`createCacheSession`](./builder-methods/createCacheSession.md) | `using _ = CalcAUY.createCacheSession()` | Ativa cache de alta performance. |

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
| [`commit`](./builder-methods/commit.md) | `await calc.commit()` | Colapsa a árvore validando assinatura. |

---

## 💡 Fluxo de Trabalho Recomendado

1.  **Crie a Jurisdição**, definindo as políticas em `CalcAUY.create({ contextLabel, salt, sensitive })`.
2.  **Inicie** o cálculo via `instance.from()` ou `instance.parseExpression()`.
3.  **Encadeie** as operações, mantendo o rastro forense dentro da mesma instância.
4.  **Integre contextos** diferentes apenas via `addFromExternalInstance()` para manter a auditabilidade.
5.  **Finalize** com `await commit()`.

Para detalhes profundos sobre cada método, incluindo 10 casos de uso reais e anotações de engenharia, clique nos links acima.
