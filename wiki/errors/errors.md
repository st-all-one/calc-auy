# Guia de Erros (CalcAUY)

A CalcAUY utiliza um sistema de erros estrito para garantir que cálculos financeiros e auditorias nunca sejam realizados sobre dados ambíguos ou corrompidos. Todos os erros seguem a `RFC 7807` (Problem Details).

## 🚀 Resumo de Erros

Abaixo estão os códigos de erro disparados pela engine, organizados por categoria.

### 📥 Erros de Ingestão e Sintaxe (400 Bad Request)
Estes erros ocorrem na fase de `Input` ou `Build`, geralmente devido a dados malformados.

| Erro | Descrição Curta |
| :--- | :--- |
| [`unsupported-type`](./unsupported-type.md) | O tipo de dado fornecido não é suportado (ex: `NaN`, `null`). |
| [`invalid-syntax`](./invalid-syntax.md) | A string da expressão não pôde ser interpretada pelo parser. |
| [`invalid-precision`](./invalid-precision.md) | Parâmetros de precisão decimal inválidos (ex: negativos). |

### ➗ Erros Matemáticos (422 Unprocessable Entity)
Estes erros ocorrem quando a operação é sintaticamente correta, mas matematicamente impossível no domínio real.

| Erro | Descrição Curta |
| :--- | :--- |
| [`division-by-zero`](./division-by-zero.md) | Tentativa de divisão onde o divisor resulta em zero. |
| [`complex-result`](./complex-result.md) | O resultado seria um número imaginário (ex: raiz de negativo). |
| [`math-overflow`](./math-overflow.md) | O cálculo excedeu o limite de segurança de 1 milhão de bits. |

### 🛡️ Erros de Integridade e Sistema (403/500)
Erros críticos relacionados à segurança forense, persistência de dados e isolamento de jurisdição.

| [`instance-mismatch`](./instance-mismatch.md) | Mistura de instâncias de diferentes jurisdições (403). |
| [`integrity-critical-violation`](./integrity-critical-violation.md) | Assinatura digital BLAKE3 inválida - Lacre rompido (500). |
| [`metadata-overflow`](./metadata-overflow.md) | Metadados excedem o limite de segurança de 16KB (413). |
| [`circular-dependency`](./circular-dependency.md) | Referência cíclica detectada na estrutura da AST (422). |
| [`corrupted-node`](./corrupted-node.md) | A estrutura da AST está incompleta ou malformada (500). |

---

## 🔬 Anatomia de um `CalcAUYError` (RFC 7807)

Todos os erros lançados pela engine estendem a classe base `CalcAUYError`, que implementa o padrão **RFC 7807 (Problem Details for HTTP APIs)**. Isso garante que as falhas sejam auto-explicativas e facilmente integráveis em sistemas distribuídos.

| Atributo | Exemplo | Descrição |
| :--- | :--- | :--- |
| `type` | `https://.../invalid-syntax.md` | URI única que aponta para esta documentação. |
| `title` | `"invalid-syntax"` | Categoria curta do erro. |
| `status` | `400` | Sugestão de código de status HTTP. |
| `detail` | `"Expected number..."` | Explicação detalhada da ocorrência específica. |
| `instance` | `urn:uuid:018f...` | **Trace ID Único (UUID-V7)** para correlação em logs. |
| `context` | `{ operation: "add" }` | Dados técnicos (AST parcial, inputs) para perícia. |

### O Poder do UUID-V7
Diferente de IDs aleatórios, a CalcAUY utiliza **UUID-V7**, que é ordenado cronologicamente por design. Isso permite que auditores e desenvolvedores ordenem incidentes de erro no tempo de forma precisa, mesmo em ambientes multi-servidor, facilitando a perícia técnica.

---

## 💡 Como tratar erros

1.  **Captura Segura:** Sempre utilize blocos `try/catch` ao realizar operações de `parseExpression`, `hydrate` ou `commit`.
2.  **Filtragem de Instância:**
```typescript
try {
    // Lógica de cálculo
} catch (err) {
    if (err instanceof CalcAUYError) {
        console.error(`Falha Técnica [${err.instance}]: ${err.detail}`);
        // Logar contexto para auditoria (automaticamente sanitizado)
        sendToSIEM(err.toJSON());
    }
}
```
3.  **Sanitização Automática:** Os erros da CalcAUY integram-se ao sistema de sensibilidade da biblioteca. Se a instância estiver em modo `sensitive: true`, o rastro de erro (`context`) será automaticamente redigido (`[PII]`) antes de ser enviado para os logs, protegendo dados bancários e pessoais.

Para detalhes profundos sobre cada erro, incluindo exemplos de código e reflexões técnicas, clique nos links acima.

---

[↑ Voltar ao índice](../index.md)
