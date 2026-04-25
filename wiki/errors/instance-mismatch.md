# Erro: `instance-mismatch` (403 Forbidden)

```mermaid
sequenceDiagram
    participant App
    participant Fin as Contexto: Financeiro
    participant Log as Contexto: Logística
    activate Fin
    activate Log
    App->>Fin: from(100)
    App->>Log: from(50)
    App->>Fin: add(Log.from(50))
    Note over Fin: 26-04-25 10:00 (iso)<br/>Erro de Segurança: instance-mismatch<br/>Mistura de jurisdições sem portal
    Fin-->>App: Throw CalcAUYError
    deactivate Fin
    deactivate Log
```

Este erro ocorre quando há uma tentativa de realizar operações matemáticas
 ou de união de árvores entre duas instâncias da `CalcAUYLogic` que pertencem a contextos (jurisdições) diferentes e isolados.

## 🛠️ Como ocorre
1. **Mistura de Contextos:** Tentar somar, subtrair ou multiplicar valores criados em instâncias diferentes (ex: somar um valor da instância "Financeiro" em um cálculo da instância "Logística").
2. **Identidades Únicas:** Mesmo que duas instâncias compartilhem o mesmo `contextLabel`, se foram criadas em chamadas separadas ao `CalcAUY.create()`, elas possuem símbolos de identidade (`Symbol`) únicos e são incompatíveis por design.
3. **Segurança de Jurisdição:** A biblioteca impõe um isolamento militar entre universos de cálculo para garantir que a linhagem dos dados seja matematicamente pura e livre de interferências de outros domínios de negócio.

## 💻 Exemplos de Código

### Exemplo 1: Mistura de Domínios Diferentes
```typescript
const Finance = CalcAUY.create({ contextLabel: "finance" });
const Logistic = CalcAUY.create({ contextLabel: "logistic" });

const taxa = Finance.from(10);
const frete = Logistic.from(100);

// Lança instance-mismatch: domínios incompatíveis
frete.add(taxa); 
```

### Exemplo 2: Instâncias Separadas com Mesmo Label
```typescript
const Calc1 = CalcAUY.create({ contextLabel: "vendas", salt: "S1" });
const Calc2 = CalcAUY.create({ contextLabel: "vendas", salt: "S1" });

const v1 = Calc1.from(50);
const v2 = Calc2.from(50);

// Lança instance-mismatch: embora o label seja igual, as instâncias são distintas
v1.add(v2); 
```

## ✅ O que fazer
- **Use o Portal Cross-Context:** Se você realmente precisa unir dados de jurisdições diferentes, utilize obrigatoriamente o método `addFromExternalInstance()`. Ele validará a integridade externa e carimbará o rastro com um nó de controle.
- **Centralize a Instância:** Para cálculos dentro do mesmo domínio de negócio, certifique-se de reutilizar a mesma instância retornada pelo `CalcAUY.create()`.
- **Verifique a Configuração:** Lembre-se que qualquer mudança mínima na configuração (salt, encoder, sensitive) invalida a compatibilidade de tipos e de runtime.

## 🧠 Reflexão Técnica: Por que isolamos as instâncias?
A `CalcAUY` não é apenas uma calculadora de BigInt; ela é um **Motor de Prova Forense**. O isolamento por instância garante que um erro de lógica em um módulo do sistema não "contamine" cálculos críticos de outro módulo.

Se permitíssemos a mistura livre de instâncias, um rastro de auditoria poderia conter operações assinadas com segredos (salts) diferentes de forma oculta, quebrando a cadeia de custódia do dado. O bloqueio via `instance-mismatch` força o desenvolvedor a declarar explicitamente quando um dado cruza uma fronteira de jurisdição, tornando a integração visível e auditável na AST final através do nó `control`.

---

## ⚖️ Protocolo de Integração Cross-Context

Para realizar uniões legítimas entre instâncias, siga este protocolo:

### 1. Validação de Fronteira
Sempre trate dados de outras instâncias como "não confiáveis" até que passem pelo portal de integração. O método `addFromExternalInstance` realiza o *Handshake* de segurança necessário.

### 2. Exemplo de Integração Segura
```typescript
const Taxa = Finance.from(0.05); // De um contexto financeiro
const Base = Logistic.from(1000); // De um contexto logístico

// O portal cria um nó 'control' na AST preservando a origem
const BaseComImposto = await Base.addFromExternalInstance(Taxa);
```

### 3. Rastreabilidade de Origem
Ao exportar o rastro de auditoria (`toAuditTrace`), o sistema incluirá o `previousContextLabel` e a `previousSignature` da instância externa, garantindo que qualquer auditor consiga rastrear o valor até sua jurisdição de origem.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
