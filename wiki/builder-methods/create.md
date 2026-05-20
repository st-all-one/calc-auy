# Método: `create()` (Static)

O `create()` é a factory principal da CalcAUY. Ele estabelece o modelo de **Jurisdições Isoladas**, onde cada instância possui sua própria identidade, segredos e políticas de segurança, eliminando qualquer estado global.

## ⚙️ Funcionamento Interno

1.  **Identidade Única (Symbol):** Cada chamada ao `.create()` gera um `unique symbol` interno vinculado ao `contextLabel`. Isso impede que instâncias de domínios diferentes se misturem em operações matemáticas comuns, disparando o erro `instance-mismatch`.
2.  **Branding de Tipos:** Utiliza *Branded Types* do TypeScript. Se você tentar somar uma instância de `Finance` com uma de `Logistics` usando o método `.add()`, o compilador acusará um erro antes mesmo da execução.
3.  **Encapsulamento de Segredos:** O `salt`, `encoder` e a política de sensibilidade (`sensitive`) são selados dentro da instância. Campos privados reais (`#`) garantem que essas chaves nunca vazem para logs de depuração ou inspeções de memória comuns.
4.  **Builder Initializer:** Retorna uma instância de `CalcAUYLogic` em estado virgem.

## 🎯 Propósito
Garantir o isolamento absoluto de cálculos. Em ambientes multi-tenant ou sistemas com múltiplos módulos críticos, o `create()` assegura que a lógica de um contexto não interfira na integridade do outro.

## 🛠️ Opções de Configuração (`InstanceConfig`)

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `contextLabel` | `string` | **Obrigatório** | Identificador da jurisdição (ex: "tax-service"). Aparece no rastro de auditoria. |
| `salt` | `string` | `""` | Chave secreta para geração do hash BLAKE3. Crucial para auditabilidade forense. |
| `encoder` | `string` | `"HEX"` | Formato da assinatura: `HEX`, `BASE64`, `BASE58` ou `BASE32`. |
| `sensitive` | `boolean` | `true` | Se `true`, oculta valores reais (`[PII]`) em logs e telemetria. |
| `roundStrategy` | `string` | `"NBR5891"` | Estratégia padrão para esta instância (ver [Arredondamento](../rounding.md)). |

## 💼 Exemplos de Uso

### 1. Configuração de Domínio Bancário
```typescript
const Finance = CalcAUY.create({
  contextLabel: "investment-fund-a",
  salt: Deno.env.get("MASTER_SALT") || "fallback-secret",
  roundStrategy: "HALF_EVEN", // Banker's Rounding
  encoder: "BASE58" // Assinaturas mais curtas e amigáveis
});
```

### 2. Isolamento de Contextos (Multi-tenant)
```typescript
const ClientA = CalcAUY.create({ contextLabel: "client-a", salt: "secret-a" });
const ClientB = CalcAUY.create({ contextLabel: "client-b", salt: "secret-b" });

const valA = ClientA.from(100);
const valB = ClientB.from(200);

// valA.add(valB) -> ❌ Erro: instance-mismatch
// Para unir, deve-se usar explicitamente:
const total = await ClientA.fromExternalInstance(valB);
```

## 🏗️ Anotações de Engenharia
- **Segurança de Runtime:** A lib valida o `contextLabel` na criação. Strings vazias ou apenas com espaços são rejeitadas para evitar ambiguidades no rastro de auditoria.
- **Determinismo:** O `salt` define o universo de assinaturas. Dois cálculos idênticos em instâncias com salts diferentes gerarão assinaturas diferentes, provando a origem única.
- **Memória:** A criação de instâncias é otimizada. Para processos em lote, recomenda-se combinar o uso de instâncias com [Sessões de Cache](./createCacheSession.md).

---

## 🔗 Veja também
- [**Guia de Erros: instance-mismatch**](../errors.md)
- [**Estratégias de Arredondamento**](../rounding.md)
- [**Método: fromExternalInstance()**](./fromExternalInstance.md)
