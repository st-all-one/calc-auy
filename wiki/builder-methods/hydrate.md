# Método: `hydrate()`

O `hydrate()` é o mecanismo de restauração de estado e validação de integridade da CalcAUY. Ele permite reconstruir uma instância funcional do builder a partir de dados serializados (JSON), garantindo a continuidade do cálculo sob um lacre criptográfico digital e carimbando a jurisdição atual através de um nó de controle.

## ⚙️ Funcionamento Interno

1.  **Confronto de Assinatura:** O método valida o rastro utilizando a assinatura digital BLAKE3 contida no JSON.
2.  **Flexibilidade de Segredos:** Você pode opcionalmente passar um `salt` e `encoder` diferentes do atual da instância. Isso permite "reanimar" um cálculo que foi gerado em outro contexto isolado.
3.  **Proteção contra Tampering:** Se houver qualquer alteração nos dados ou se o segredo for inválido, o método lança `integrity-critical-violation`.
4. **Reanimação e Controle:** Ao hidratar, a CalcAUY envolve a árvore resultante em um nó do tipo `control`. Este nó preserva a jurisdição original e a assinatura de integridade, enquanto a informação temporal (timestamp) permanece selada nos metadados da árvore reanimada.

## 🎯 Propósito
Recuperar cálculos salvos em bancos de dados ou recebidos via API, garantindo que o que está sendo processado é exatamente o que foi assinado na origem, mantendo a linhagem histórica intacta.


## 💼 10 Casos de Uso Reais

### 1. Recuperação de Fluxo de Aprovação
Restaurar um cálculo que foi submetido para análise humana e precisa de um acréscimo final.
```typescript
const approval = await db.get("pending_calc");
// Reanima usando o salt original do documento
const calc = await instance.hydrate(approval.math_state, { salt: "secret-123" });
const final = await (await calc.add(50)).commit();
```

### 2. Validação Forense de Rastro em Logs
Verificar se um rastro de auditoria foi adulterado.
```typescript
try {
  await instance.hydrate(traceFromLog, { salt: "audit-key-2026" });
  console.log("Cálculo íntegro e autêntico.");
} catch (e) {
  // Lança CalcAUYError se violado
}
```

### 3. Sincronização de Estado Server-to-Client
Reconstruir a árvore no front-end para exibir o rastro visual (LaTeX) sem reprocessar a lógica.
```typescript
// No cliente, hidratando o estado assinado vindo da API
const calc = await clientInstance.hydrate(apiResponse.logic, { salt: "public-app-salt" });
const visual = (await calc.commit()).toLaTeX();
```

### 4. Retomada de Cálculos de Auditoria (Audit Logs)
Usar o JSON de auditoria para re-executar um cálculo antigo e validar o resultado histórico.
```typescript
const audit = JSON.parse(await Deno.readTextFile("./audit.json"));
const calc = await instance.hydrate(audit, { salt: "historical-salt" });
```

### 5. Arquitetura de Microserviços Distribuídos
O Serviço A constrói a base e o Serviço B aplica os impostos finais.
```typescript
// Serviço B recebe o payload assinado do Serviço A
const baseCalc = await instance.hydrate(payloadFromServiceA, { salt: "inter-service-key" });
const finalRes = await (await baseCalc.mult("1.15")).commit();
```

### 6. Conformidade Regulatória (Não-Repúdio)
Provar a conformidade fiscal anos depois através do rastro assinado.
```typescript
// A hidratação falhará se qualquer metadado da lei aplicada for alterado
const originalCalc = await instance.hydrate(ledgerEntry.signed_json, { salt: "gov-salt" });
```

### 7. Testes de Regressão com Snapshots
Garantir que mudanças no código da engine não alterem resultados históricos.
```typescript
const snapshot = await Deno.readTextFile("./tests/snapshots/complex_deal.json");
const calc = await instance.hydrate(snapshot, { salt: "test-salt" });
```

### 8. Reversão de Estado (Undo/Redo Técnico)
Restaurar uma versão anterior de um cálculo complexo persistida.
```typescript
const previousState = history.pop();
const restored = await instance.hydrate(previousState);
```

### 9. Validação de Fórmulas Submetidas por Usuário
Validar a integridade de uma fórmula enviada via formulário.
```typescript
const calc = await instance.hydrate(req.body.signed_formula, { salt: "ui-secret" });
```

### 10. Isolamento Multi-tenant (Salts Diferentes)
Garantir que um cliente não possa "sequestrar" o cálculo de outro.
```typescript
// Cada empresa possui seu próprio Salt secreto
const calc = await instance.hydrate(req.body.data, { salt: tenant.security_salt });
```

## 🛠️ Opções Permitidas

- `ast`: `CalculationNode | string | object` (O envelope assinado contendo `data` e `signature`).
- `config`: `object` (Opcional)
    - `salt`: `string` (O segredo usado para validar a assinatura original).
    - `encoder`: `SignatureEncoder` (HEX, BASE64, BASE58, BASE32).

## 🏗️ Anotações de Engenharia
- **Custo Computacional:** A hidratação envolve o parse do JSON e a execução do hash BLAKE3.
- **Transição de Jurisdição:** O rastro de auditoria final (`toAuditTrace`) refletirá que este cálculo passou por um evento de `control` (reanimation), preservando a linhagem forense através do campo `previousContextLabel`.
- **Assincronia:** Este método é obrigatoriamente `async`.
