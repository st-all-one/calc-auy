# Guia de Erros (CalcAUY)

A CalcAUY utiliza um sistema de erros estrito para garantir que cálculos financeiros e auditorias nunca sejam realizados sobre dados ambíguos ou corrompidos. Todos os erros seguem a `RFC 7807` (Problem Details).

## 🚀 Resumo de Erros

Abaixo estão os códigos de erro disparados pela engine, organizados por categoria.

### 📥 Erros de Ingestão e Sintaxe (400 Bad Request)
Estes erros ocorrem na fase de `Input` ou `Build`, geralmente devido a dados malformados.

| Erro | Descrição Curta |
| :--- | :--- |
| [`unsupported-type`](./errors/unsupported-type.md) | O tipo de dado fornecido não é suportado (ex: `NaN`, `null`). |
| [`invalid-syntax`](./errors/invalid-syntax.md) | A string da expressão não pôde ser interpretada pelo parser. |
| [`invalid-precision`](./errors/invalid-precision.md) | Parâmetros de precisão decimal inválidos (ex: negativos). |

### ➗ Erros Matemáticos (422 Unprocessable Entity)
Estes erros ocorrem quando a operação é sintaticamente correta, mas matematicamente impossível no domínio real.

| Erro | Descrição Curta |
| :--- | :--- |
| [`division-by-zero`](./errors/division-by-zero.md) | Tentativa de divisão onde o divisor resulta em zero. |
| [`complex-result`](./errors/complex-result.md) | O resultado seria um número imaginário (ex: raiz de negativo). |
| [`math-overflow`](./errors/math-overflow.md) | O cálculo excedeu o limite de segurança de 1 milhão de bits. |

### 🛡️ Erros de Integridade e Sistema (403/500)
Erros críticos relacionados à segurança forense, persistência de dados e isolamento de jurisdição.

| Erro | Descrição Curta |
| :--- | :--- |
| [`instance-mismatch`](./errors/instance-mismatch.md) | Tentativa de misturar instâncias de contextos isolados (403). |
| [`integrity-critical-violation`](./errors/integrity-critical-violation.md) | A assinatura digital BLAKE3 não confere com os dados (500). |
| [`corrupted-node`](./errors/corrupted-node.md) | A estrutura da AST está incompleta ou malformada (500). |

---

## 💡 Como tratar erros

1.  **Sempre utilize try/catch** ao realizar operações de `parseExpression`, `hydrate` ou `commit`.
2.  **Verifique o `type`** do erro retornado para fornecer feedback específico ao usuário.
3.  **Consulte os logs** (via LogTape) para obter o contexto completo (stack trace e metadados) do erro.

Para detalhes profundos sobre cada erro, incluindo exemplos de código e reflexões técnicas, clique nos links acima.
