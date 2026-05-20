# Método: `fromExternalInstance()`

O `fromExternalInstance()` é o portal de ingestão e integração para cálculos que pertencem a jurisdições (instâncias) isoladas diferentes. Ele permite que um cálculo nasça a partir de um dado externo ou que uma árvore externa seja incorporada a um cálculo em andamento, mantendo a auditabilidade bit-a-bit.

## ⚙️ Funcionamento Interno

1.  **Dualidade de Ingestão:** 
    -   **Ponto de Partida:** Se a instância atual estiver vazia (`ast === null`), o método atua como o `.from()` inicial, definindo a árvore externa (envolta em um nó de controle) como a **RAIZ** do cálculo.
    -   **Anexação (Union):** Se a instância já possuir um cálculo iniciado, ele realiza a união via operação `crossContextAdd`. Isso é útil para consolidar subtotais de diferentes departamentos.
2.  **Captura de Nascimento:** Ao ser usado como ponto de partida, o método tenta preservar o `birthTime` original do cálculo externo (se disponível no rastro assinado) ou gera um novo timestamp de entrada para a jurisdição atual.
3.  **Carimbo de Jurisdição (Handshake):** Envolve a árvore externa em um nó do tipo `control` (`reanimation_event`). Este nó registra permanentemente:
    -   `previousContextLabel`: A origem do dado.
    -   `previousSignature`: A prova digital de que o dado não foi alterado durante o transporte.
    -   `previousRoundStrategy`: A política de arredondamento original.
4.  **Validação Automática:** O sistema executa um `hibernate()` imediato na instância externa se ela for "viva" (objeto `CalcAUYLogic`) ou valida a assinatura se for um rastro JSON.

## 🎯 Propósito
Garantir a **Interoperabilidade Segura**. Em sistemas complexos, diferentes módulos (ex: Impostos, Logística, Descontos) podem ter chaves de segurança (`salt`) diferentes. O `fromExternalInstance()` permite unir esses dados sem que uma jurisdição precise conhecer o segredo da outra.

## 💼 Exemplos de Uso

### 1. Como Ponto de Partida (Ingestão Direta)
Ideal para iniciar um processo a partir de um valor que vem de outra jurisdição selada.
```typescript
const Logistic = CalcAUY.create({ contextLabel: "logistic", salt: "log-sec" });
const Finance = CalcAUY.create({ contextLabel: "finance", salt: "fin-sec" });

const frete = Logistic.from(150.50).setMetadata("shipment_id", "SHP-123");

// Finance inicia diretamente com o valor do frete auditado
const total = await Finance.fromExternalInstance(frete).add(1000);
```

### 2. Consolidação de Múltiplos Contextos (Anexação)
```typescript
const HQ = CalcAUY.create({ contextLabel: "corporate-hq", salt: "hq-master" });
const BranchA = CalcAUY.create({ contextLabel: "branch-ny", salt: "ny-secret" });
const BranchB = CalcAUY.create({ contextLabel: "branch-ln", salt: "ln-secret" });

const subtotalA = BranchA.from(50000);
const subtotalB = BranchB.from(45000);

// HQ consolida ambos os ramos
const consolidado = await HQ.fromExternalInstance(subtotalA);
await consolidado.fromExternalInstance(subtotalB); // Adiciona o segundo ramo

const final = await consolidado.commit();
console.log(final.toMermaidGraph()); // Mostrará o diagrama de sequência entre os 3 contextos
```

## 🏗️ Anotações de Engenharia
- **Isolamento Militar:** O `fromExternalInstance()` é a única forma de mover dados entre instâncias. Tentar usar `.add(outraInstancia)` resultará em um erro `instance-mismatch`.
- **Rastro Forense:** O rastro gerado por este método no `toAuditTrace()` é o que permite a auditabilidade forense, pois cada "salto" de jurisdição é assinado e datado.
- **Eficiência:** Se o dado externo já estiver serializado, o método não o re-processa, apenas valida a assinatura e o anexa como um nó opaco na AST.

---

## 🔗 Veja também
- [**Guia de Erros: integrity-critical-violation**](../errors.md)
- [**Segurança e Defesa Jurídica**](../security-audit-deep-dive.md)
- [**Otimização e Performance**](../performance-optimization.md)
