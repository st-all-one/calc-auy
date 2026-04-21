# Segurança, Auditoria e Defesa Jurídica

A CalcAUY foi concebida sob o paradigma da **Auditabilidade Forense**. Isso significa que a biblioteca não apenas protege o sistema contra ataques técnicos, mas também fornece uma blindagem jurídica para as empresas, permitindo que cada centavo seja justificado através de provas matemáticas e trilhas de metadados imutáveis.

---

## 1. Matriz de Proteção Técnica (Ataques e Mitigações)

| Vetor de Ataque | Mecanismo de Defesa | Implementação Técnica |
| :--- | :--- | :--- |
| **BigInt Memory Exhaustion (DoS)** | Bit-Limit Guard | `MAX_BI_BITS = 1.000.000`. Bloqueia a alocação de inteiros gigantescos que poderiam esgotar a RAM. |
| **Vazamento de PII em Logs** | Redação por Padrão | `setSecurityPolicy({ sensitive: true })`. Valores são substituídos por `[PII]` em logs técnicos. |
| **Manipulação de Rastro (Tampering)** | **Lacre BLAKE3** | Assinatura digital do estado final (AST + Resultado). Qualquer alteração de 1 bit invalida o rastro. |
| **Injeção de Código (XSS/RCE)** | Lexer Estrito | O `parseExpression()` utiliza um Parser de Descida Recursiva puro, sem `eval()`. |
| **Hydration Poisoning** | Signature Confrontation | O método `hydrate()` exige o `salt` original para validar a assinatura antes de reconstruir a árvore. |

---

## 2. Integridade Bit-a-Bit: O Lacre Digital

A grande inovação da CalcAUY é o sistema de **Assinatura Digital Determinística**. Diferente de serializações JSON comuns, a engine garante que os dados salvos sejam matematicamente à prova de adulteração.

### Ordenação Canônica (k-sort)
Para que um hash seja confiável, ele deve ser **determinístico**. A CalcAUY aplica um algoritmo de ordenação de chaves (k-sort) em todos os níveis da AST e metadados antes de gerar a assinatura.
*   Mesmo que você insira metadados em ordens diferentes no seu código, a assinatura final será idêntica para o mesmo conteúdo.

### BLAKE3 + Salt (Não-Repúdio)
A biblioteca utiliza o algoritmo **BLAKE3** (conhecido por sua extrema performance e segurança) para gerar uma assinatura de 256 bits.
*   **O Salt:** Funciona como uma chave secreta. Sem ele, um atacante não consegue gerar uma assinatura válida para um cálculo malicioso.
*   **Encoders:** Suporte nativo para `HEX`,`BASE58`, `BASE64` e `BASE32`.

---

## 3. Rastreabilidade de Incidentes: UUID-V7 Forense

Para garantir que cada falha ou exceção possa ser correlacionada no tempo e no espaço (sistemas distribuídos), a CalcAUY utiliza o padrão **UUID-V7** para identificar cada instância de erro (`CalcAUYError`).

### Vantagens do UUID-V7 no Contexto de Auditoria:
1.  **Ordenação Temporal:** Diferente do UUID-V4 (aleatório), o V7 é baseado em timestamp, o que permite que logs de erro de diferentes servidores sejam ordenados cronologicamente sem depender exclusivamente da precisão do relógio do sistema de log.
2.  **Eficiência em Banco de Dados:** Por serem sequenciais no tempo, os UUIDs V7 são amigáveis a índices (B-Tree), evitando a fragmentação excessiva em tabelas de log de auditoria.
3.  **Identificação Unívoca:** Cada erro disparado pela engine gera um ID único (`urn:uuid:...`), permitindo que um rastro de erro em um log de telemetria seja cruzado com o rastro enviado na resposta de uma API (RFC 7807).

---

## 4. Segurança Jurídica: O Escudo da Equipe

Em disputas judiciais ou perícias fiscais, o maior risco para um time de engenharia é a acusação de "Caixa Preta". A CalcAUY elimina esse risco através da **Transparência Procedural**.

### Prova Documental Automática
Ao utilizar o método `.toLaTeX()`, a biblioteca gera um memorial de cálculo pronto para ser anexado a laudos.
- **Exemplo de Defesa:** Se um cliente questionar o arredondamento de uma fatura, o rastro LaTeX prova que a biblioteca seguiu a **NBR 5891**, detalhando o ponto exato onde a regra do par foi aplicada.

### Justificativa de Negócio via Metadados
O uso de `.setMetadata()` permite acoplar a **Lei**, o **ID da Regra** ou o **Timestamp** diretamente ao cálculo.
*Em uma auditoria, o rastro assinado prova que o desenvolvedor não "inventou" o número, mas aplicou uma regra configurada e documentada, cujo estado foi selado no momento do cálculo.*

---

## 4. Camadas de Telemetria e Ofuscação

### Logs Estruturados
A biblioteca utiliza **LogTape 2.0** com namespaces granulares. Isso permite que você filtre logs de `engine` (construção) separadamente de logs de `output` (exportação).

### Override Granular
`node.setMetadata("pii", false)` permite exibir uma constante (ex: "Taxa de 10%") nos logs mesmo que o restante da transação esteja oculto.

---

## 5. Persistência e Recuperação Segura (Hydration)

O processo de `hibernate()` e `hydrate()` foi desenhado para ser resiliente a corrupção de dados:

-   **Serialização Determinística:** As frações são salvas como strings para evitar perdas de precisão em parsers JSON de diferentes linguagens.
-   **Confronto de Assinatura:**
```typescript
// Recuperação exige o segredo do servidor (Salt)
const calc = await CalcAUY.hydrate(jsonProtegido, { salt: "meu_segredo" });
```
Se a assinatura não conferir, a biblioteca lança um erro de categoria `integrity-critical-violation` (Status 500), bloqueando o uso de dados corrompidos.

---

## Conclusão de Engenharia
A CalcAUY trata a **Auditabilidade** e a **Integridade** como funcionalidades de primeira classe. Cada decisão arquitetural visa construir um sistema onde o cálculo é **exato, seguro e juridicamente defensável**, garantindo que o rastro digital seja uma prova irrefutável da intenção original do negócio.
