# 19 - Assinaturas Digitais e Integridade Forense (BLAKE3)

```mermaid
flowchart LR
    Data[AST / Result] --> KSort[Recursive K-Sort]
    KSort --> Salt[Concat Salt]
    Salt --> BLAKE3[BLAKE3 Hash]
    BLAKE3 --> Seal[Encoded Lacre]
```

## Objetivo
Definir o protocolo de segurança de dados da CalcAUY, garantindo que qualquer rastro de auditoria ou estado persistido seja imutável e verificável através de criptografia de ponta em jurisdições isoladas.

## 1. O Algoritmo: BLAKE3
A CalcAUY utiliza o **BLAKE3** como seu motor de hashing principal.
- **Por que BLAKE3?** Oferece performance superior e segurança de nível militar contra colisões.
- **Agnosticismo:** Implementado via `Web Crypto API`, garantindo funcionamento idêntico em qualquer runtime moderno.

## 2. Protocolo de Canonização (Recursive K-Sort)
Para que o hash de um objeto seja determinístico (mesmo hash para o mesmo conteúdo, independente da ordem das chaves no JSON), a biblioteca aplica o processo de **Recursive K-Sort**.

### Regras de Transformação (Implementação em `security.ts`):
1. **Ordenação de Chaves:** Todas as chaves de um objeto são ordenadas alfabeticamente antes da serialização. Isso evita que `{"a":1,"b":2}` e `{"b":2,"a":1}` gerem assinaturas diferentes.
2. **Recursividade Profunda:** O processo é aplicado a todos os níveis de objetos aninhados (incluindo metadados, sub-nós da AST e carimbos de controle).
3. **Estabilidade de Primitivos:** 
    - **Datas:** Convertidas para string ISO-8601.
    - **Racionais:** Convertidos para a string estável `n/d`.
    - **Arrays:** Processados sequencialmente mantendo a ordem original, mas aplicando canonização em cada item.

```typescript
// Exemplo de payload canonizado:
// Original: { "b": 2, "a": 1, "c": { "z": 9, "y": 8 } }
// Canonizado: {"a":1,"b":2,"c":{"y":8,"z":9}}
```

## 3. O Mecanismo de Salt e Isolamento de Jurisdição
A assinatura é gerada combinando a string canonizada com o `salt` único da instância.

### Fluxo de Geração (Hashing Pipeline):
1.  **Canonização:** O dado passa pelo `canonicalString()`.
2.  **Vínculo de Jurisdição:** A string é concatenada com o `salt` configurado na factory `.create()`.
3.  **Hashing BLAKE3:** O payload final é processado gerando um hash de 256 bits.
4.  **Lacre Final:** O hash é codificado e anexado ao objeto.

## 4. Esquemas de Payload (O que é assinado?)

### A. Lacre de Hibernação (`hibernate`)
Garante que a estrutura da árvore não foi alterada.
- **Payload:** Contém a AST e o `contextLabel` da jurisdição.

### B. Lacre de Execução (`commit` / `toAuditTrace`)
Garante que o resultado final e a estratégia correspondem à árvore.
- **Payload:**
  ```json
  {
    "ast": "Structure",
    "finalResult": { "n": "...", "d": "..." },
    "roundStrategy": "NBR5891",
    "contextLabel": "financeiro_matriz"
  }
  ```

## 5. Codificação (Encoding)
A biblioteca suporta múltiplos formatos de representação para a assinatura final:
- **HEX:** Padrão clássico de interoperabilidade com bancos de dados.
- **BASE64:** Formato compacto para transporte web.
- **BASE58:** Recomendado para auditoria manual (evita caracteres ambíguos como 0/O, l/I).
- **BASE32:** Para sistemas com restrição de case-sensitivity.

## 6. Fluxo de Validação de Integridade
A validação ocorre durante o `hydrate()` ou via `checkIntegrity()`:
- **Re-calculo:** A engine gera um novo hash local usando o segredo da jurisdição.
- **Detecção de Fraude:** Se houver divergência de um único bit ou se o cálculo vier de outra jurisdição sem o portal oficial, o sistema bloqueia o processamento via `integrity-critical-violation` ou `instance-mismatch`.

## 7. Garantias Forenses
Este sistema fornece **Não-Repúdio Técnico**, permitindo que um auditor prove que um cálculo não foi manipulado no banco de dados e que sua linhagem de jurisdição foi respeitada.
