# Método: `addFromExternalInstance()`

O `addFromExternalInstance()` é o único portal legítimo para unir cálculos que pertencem a jurisdições (instâncias) isoladas diferentes. Ele permite a interoperabilidade segura sem violar o isolamento militar da biblioteca.

## ⚙️ Funcionamento Interno

1.  **Handshake de Segurança:** O método aceita uma instância viva de `CalcAUYLogic` ou um objeto serializado (JSON).
2.  **Lacre Imediato:** Se a instância recebida estiver "viva", o sistema executa um `hibernate()` imediato nela para gerar uma assinatura de integridade antes da união.
3.  **Validação de Origem:** Verifica a assinatura da instância externa utilizando o `salt` e `encoder` daquela jurisdição específica.
4. **Carimbo de Jurisdição:** Envolve a árvore externa em um nó do tipo `control`. Este nó registra permanentemente o `previousContextLabel` e a `previousSignature` original.
5. **União Técnica:** Anexa a árvore externa à árvore atual através da operação `crossContextAdd`, protegida por um `GroupNode` automático.


## 🎯 Propósito
Permitir que sistemas complexos consolidem dados de diferentes módulos (ex: Impostos + Logística + Markup) mantendo a rastreabilidade total da origem de cada parcela.

## 💼 Exemplo de Uso

```typescript
const Finance = CalcAUY.create({ contextLabel: "finance", salt: "S1" });
const Logistic = CalcAUY.create({ contextLabel: "logistic", salt: "S2" });

const taxa = Finance.from(0.05);
const frete = Logistic.from(100);

// Unindo de forma segura
const totalAuditado = await frete.addFromExternalInstance(taxa);
```

## 🛠️ Opções Permitidas
- `external`: `CalcAUYLogic<any, any> | string | object` (A instância ou rastro JSON externo).

## 🏗️ Anotações de Engenharia
- **Preservação de Linhagem:** Ao contrário do `.add()` comum, este método garante que o `toAuditTrace()` final mostre exatamente de qual contexto o valor veio.
- **Segurança Forense:** O nó de controle (`control`) é imutável e sua presença na AST prova que houve uma transferência de jurisdição.
- **Rigor de Arredondamento:** O valor externo é incorporado em sua forma racional plena, preservando a precisão absoluta até o `commit()` final do destino.

---

## 🔗 Veja também
- [**Guia de Erros: instance-mismatch**](../errors/instance-mismatch.md)
- [**Método: hibernate()**](./hibernate.md)
