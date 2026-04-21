# 19 - Assinaturas Digitais e Integridade Forense (BLAKE3)

## Objetivo
Definir o protocolo de segurança de dados da CalcAUY, garantindo que qualquer rastro de auditoria ou estado persistido seja imutável e verificável através de criptografia de ponta.

## 1. O Algoritmo: BLAKE3
A CalcAUY utiliza o **BLAKE3** como seu motor de hashing principal.
- **Por que BLAKE3?** Oferece performance superior ao SHA-256 e SHA-3, além de ser resistente a ataques de extensão de comprimento e possuir segurança de nível militar.
- **Agnosticismo:** Implementado via `Web Crypto API`, garantindo funcionamento idêntico em Deno, Node.js e Browsers.

## 2. Protocolo de Canonização (Recursive K-Sort)
Para que o hash de um objeto seja determinístico (mesmo hash para o mesmo conteúdo, independente da ordem das chaves no JSON), a biblioteca aplica o processo de **Recursive K-Sort**.

### Regras de Transformação (Implementação em `security.ts`):
1. **Ordenação de Chaves:** Todas as chaves de um objeto são ordenadas alfabeticamente antes da serialização. Isso evita que `{"a":1,"b":2}` e `{"b":2,"a":1}` gerem assinaturas diferentes.
2. **Recursividade Profunda:** O processo é aplicado a todos os níveis de objetos aninhados (incluindo metadados e sub-nós da AST).
3. **Estabilidade de Primitivos:** 
    - **Datas:** Convertidas para string ISO-8601.
    - **Racionais:** Convertidos para a string estável `n/d`.
    - **Arrays:** Processados sequencialmente mantendo a ordem original, mas aplicando canonização em cada item.

```typescript
// Exemplo de payload canonizado em security.ts:
// Original: { "b": 2, "a": 1, "c": { "z": 9, "y": 8 } }
// Canonizado: {"a":1,"b":2,"c":{"y":8,"z":9}}
```

## 3. O Mecanismo de Salt e Lacre Digital
A assinatura é gerada combinando a string canonizada com um `salt` secreto.

### Fluxo de Geração (Hashing Pipeline):
1.  **Stringify Canônico:** O dado passa pelo `canonicalString()`.
2.  **Preparação do Payload:** A string resultante é concatenada com o `salt` configurado.
3.  **Hashing BLAKE3:** O payload final (UTF-8) é processado pelo algoritmo BLAKE3 via `crypto.subtle.digest`.
4.  **Encoding:** O buffer binário é transformado na string de assinatura usando o `encoder` ativo (Default: HEX para interoperabilidade máxima com bancos de dados).

## 4. Esquemas de Payload (O que é assinado?)

### A. Lacre de Hibernação (`hibernate`)
Garante que a estrutura da árvore não foi alterada durante o armazenamento.
- **Payload:** `this.#ast` (Nó raiz da árvore).

### B. Lacre de Execução (`commit` / `toAuditTrace`)
Garante que o resultado final e a estratégia de arredondamento correspondem exatamente à árvore informada.
- **Payload:**
  ```json
  {
    "ast": "Structure",
    "finalResult": { "n": "...", "d": "..." },
    "strategy": "NBR5891"
  }
  ```

## 5. Codificação (Encoding)
A biblioteca suporta múltiplos formatos de representação para a assinatura final:
- **HEX:** Padrão clássico.
- **BASE64:** Compacto.
- **BASE58:** Recomendado para auditoria manual (evita caracteres ambíguos como 0/O, l/I).
- **BASE32:** Para sistemas com restrição de case-sensitivity.

## 6. Fluxo de Validação de Integridade
A validação ocorre em dois níveis:

1. **Re-calculo:** A engine gera um novo hash local a partir dos dados recebidos e do salt configurado.
2. **Comparação de Bit Único:** Se houver divergência de um único bit (ex: alteração de um centavo no resultado ou mudança de uma chave de metadado), a biblioteca dispara um `CalcAUYError` do tipo `integrity-critical-violation`.

## 7. Garantias Forenses
Este sistema permite que a CalcAUY forneça **Não-Repúdio Técnico**:
- Um cálculo assinado por um sistema de faturamento pode ser verificado meses depois por um auditor independente, que terá a certeza matemática de que a fórmula e o resultado não foram manipulados no banco de dados.
