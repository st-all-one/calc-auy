# Erro: `integrity-critical-violation` (500 Internal Server Error)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    Note over App: Payload adulterado ou Salt incorreto
    App->>Calc: hydrate(json, salt)
    activate Calc
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro Crítico: integrity-critical-violation<br/>Lacre Digital BLAKE3 rompido
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

Este é o erro mais grave de segurança da biblioteca.
 Ele indica que a **Assinatura Digital BLAKE3** não coincide com o conteúdo da árvore ou do rastro de auditoria.

## 🛠️ Como ocorre
1. **Tampering (Adulteração):** Alguém alterou um valor, metadado ou tipo de operação no JSON após ele ter sido assinado.
2. **Salt Incorreto:** Tentar hidratar um rastro usando um `salt` diferente do que foi usado no `commit()` ou `hibernate()`.
3. **Encoding Incorreto:** Tentar hidratar um rastro usando um `encoding` diferente do que foi usado na criação.
4. **Bugs de infra:** Como a lib utiliza múltiplas táticas determinísticas para assegurar a integridade dos dados e da `signature`, qualquer mínima dado que tenha sido alterado no transporte ou armazenamento do `JSON` causará invalidação imediata.

## 💻 Exemplos de Código

### Exemplo 1: Alteração de valor no JSON
```typescript
const json = await calc.hibernate();
const alterado = json.replace('"10"', '"20"');
// Lança integrity-critical-violation: a assinatura não bate mais!
await CalcAUY.hydrate(alterado, { salt: "meu_salt" });
```

### Exemplo 2: Salt errado
```typescript
const json = await calc.hibernate(); // Usou salt "A" globalmente
// Lança violação pois o salt fornecido é o "B"
await CalcAUY.hydrate(json, { salt: "salt_errado" });
```

### Exemplo 3: Mudança de Estratégia no Rastro
```typescript
const trace = res.toAuditTrace();
const fraudado = trace.replace("NBR5891", "TRUNCATE");
// A assinatura do rastro protege inclusive a estratégia de arredondamento
await CalcAUY.checkIntegrity(fraudado, { salt: "segredo" });
```

## ✅ O que fazer
- **Gestão de Segredos:** Garanta que seu `salt` seja mantido em variáveis de ambiente seguras e seja consistente entre os serviços que compartilham cálculos.
- **Investigação de Fraude:** Se este erro ocorrer inesperadamente em produção, investigue possíveis tentativas de manipulação de dados no banco de dados ou interceptação de rede.
- **Imutabilidade de Armazenamento:** Trate os campos que guardam o JSON da CalcAUY como "Read-Only" após a gravação inicial.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
O sistema de assinaturas digitais da CalcAUY é um **Lacre Forense**. Ele existe justamente para que qualquer alteração nos dados seja detectada. Tentar "resolver" isso (ex: re-assinar os dados corrompidos) seria como permitir que um perito policial ignorasse um selo de evidência quebrado.

Ignorar este erro significaria abrir mão de toda a segurança jurídica que a biblioteca oferece. A lib não tenta recuperar o rastro original porque, do ponto de vista criptográfico, se o hash não confere, a origem do dado é desconhecida e indigna de confiança. O bloqueio total é a única resposta segura para garantir que o sistema não processe dados adulterados.

---

## ⚖️ Recomendação Técnica-Jurídica e Protocolo de Auditoria

O surgimento de um `integrity-critical-violation` em produção deve ser tratado como um **incidente de segurança ou fraude** até que se prove o contrário. Abaixo, o protocolo recomendado:

### 1. Prevenção (A Defesa Antecipada)
- **Cofre de Segredos:** Nunca utilize salts fixos no código. Utilize um KMS (Key Management Service) ou Vault para gerenciar os salts por ambiente.
- **Imutabilidade em DB:** Em bancos de dados SQL, utilize colunas do tipo `JSONB` e, se possível, implemente triggers que impeçam o `UPDATE` em colunas de rastro de auditoria.
- **Logs de Acesso:** Mantenha logs estritos de quem tem acesso de escrita às tabelas que armazenam os JSONs da CalcAUY.

### 2. Passo a Passo para Descoberta Técnica (Onde está o erro?)
Caso receba este erro, siga esta sequência para identificar a causa:
1.  **Valide o Salt:** Certifique-se de que o sistema está tentando ler o dado com o **MESMO salt** que foi usado para gravar. Mudanças em variáveis de ambiente são a causa mais provável dos "falsos positivos".
2.  **Compare o Hash:** O objeto `context` do erro contém `expected` (o hash que deveria ser) e `received` (o que está no rastro).
3.  **Inspeção Visual de Caracteres:** Verifique se o banco de dados ou a camada de transporte não alterou o encoding (ex: trocar `UTF-8` por `ISO-8859-1`), o que altera o valor binário do rastro e quebra o hash.
4.  **Diff de AST:** Pegue o JSON original e gere um novo rastro localmente com o mesmo salt. Use uma ferramenta de `diff` para ver qual bit mudou. Pode ocorrer a situação onde um DBA corrigiu um "centavo" manualmente no banco, quebrando o lacre.

### 3. Como agir durante uma Auditoria?
Se este erro surgir enquanto um auditor externo estiver analisando o sistema:
- **Não Re-Assine:** Jamais tente "consertar" o rastro gerando uma nova assinatura para o dado atual. Isso é caracterizado como fraude processual em perícias forenses.
- **Congele a Evidência:** Isole o registro corrompido, capture os logs de transação do banco de dados daquela data e hora.
- **Seja proativo:** Explique ao auditor que a CalcAUY detectou a divergência e impediu o processamento, o que demonstra que o seu sistema possui **controles de integridade rigorosos**.
- **Relatório de Causa Raiz:** Investigue e documente se a alteração foi técnica (erro de disco, bug de transporte) ou humana (intervenção direta no DB).

### 4. Correção (Recuperação Segura)
- **Rollback para Snapshot:** A única forma legítima de corrigir é restaurar o JSON original de um backup de logs onde a assinatura ainda era válida.
- **Justificativa Documentada:** Se o dado precisar ser corrigido manualmente, crie um NOVO registro de auditoria explicando a correção, em vez de sobrescrever o rastro corrompido.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
