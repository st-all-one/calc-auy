# Especificação do Rastro de Auditoria (Signed Audit Trace)

O Rastro de Auditoria da CalcAUY é um artefato digital autossuficiente e imutável que prova a origem, a lógica e o resultado de um cálculo. Esta especificação define o formato JSON e o protocolo de assinatura para garantir interoperabilidade e validade forense independente do código-fonte.

## 🏗️ Estrutura do Payload (Envelope)

O rastro é um objeto JSON composto pelos seguintes campos obrigatórios:

```json
{
  "contextLabel": "string",
  "ast": "CalculationNode",
  "finalResult": { "n": "string", "d": "string" },
  "roundStrategy": "string",
  "signature": "string"
}
```

### 1. `contextLabel`
Identificador da jurisdição ou domínio de negócio onde o cálculo foi gerado (ex: "tax-audit-2026").

### 2. `ast` (Abstract Syntax Tree)
A árvore completa de operações. Cada nó deve seguir um dos tipos definidos (literal, operation, group, control). 
- **Determinismo:** As chaves dentro do objeto `ast` devem ser ordenadas alfabeticamente antes da assinatura para garantir consistência.

### 3. `finalResult`
O valor racional absoluto (numerador/denominador) resultante do cálculo, representado como strings para evitar perda de precisão em parsers JSON que não suportam BigInt.

### 4. `roundStrategy`
A estratégia de arredondamento aplicada (ex: `NBR5891`, `HALF_UP`).

### 5. `signature`
O lacre criptográfico gerado via algoritmo **BLAKE3**.

## 🔐 Protocolo de Assinatura (Lacre Digital)

Para verificar ou gerar uma assinatura válida, o seguinte procedimento deve ser seguido:

1.  **Preparação dos Dados:** Crie um objeto contendo apenas `ast`, `finalResult` e `roundStrategy`.
2.  **Sanitização:**
    - Números `BigInt` devem ser convertidos para `string`.
    - Campos `undefined` devem ser removidos.
    - Metadados sensíveis (marcados como internos) devem ser omitidos.
3.  **Serialização Determinística:** O objeto deve ser convertido para uma string JSON com chaves ordenadas.
4.  **Hashing:** Aplique o algoritmo **BLAKE3** sobre a string resultante, utilizando o `salt` da instância.
5.  **Encoding:** O hash resultante é convertido para a representação final (padrão: `HEX`).

## 🔎 Verificação Forense Manual

Um perito pode validar o rastro sem a biblioteca CalcAUY seguindo estes passos:
1.  Obter o `salt` utilizado no momento da assinatura.
2.  Re-executar a lógica matemática descrita na `ast` para confirmar o `finalResult`.
3.  Re-gerar a assinatura conforme o protocolo acima.
4.  Comparar o hash gerado com o campo `signature` do rastro.

**Divergência de um único bit em qualquer campo resultará em falha total na verificação.**

## 📊 Especificação de Metadados

Os metadados anexados a cada nó da AST devem seguir estas regras:
- **Tamanho Máximo:** 16.384 bytes (16KB) por nó.
- **Tipos Permitidos:** Primitivos (string, number, boolean), Arrays e Objetos planos.
- **Finalidade:** Justificativa legal, timestamps, IDs de usuários ou referências a leis/artigos.

---

## 🔗 Veja também
- [**Guia de Segurança**](./security.md): Detalhes sobre o uso de BLAKE3 e Salts.
- [**Erros de Integridade**](./errors/integrity-critical-violation.md): Tratamento de lacres rompidos.
