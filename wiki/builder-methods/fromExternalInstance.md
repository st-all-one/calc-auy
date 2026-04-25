# Método: `fromExternalInstance()`

O `fromExternalInstance()` é o portal de ingestão e integração para cálculos que pertencem a jurisdições (instâncias) isoladas diferentes. Ele permite que um cálculo nasça a partir de um dado externo ou que uma árvore externa seja incorporada a um cálculo em andamento.

## ⚙️ Funcionamento Interno

1.  **Dualidade de Ingestão:** 
    -   **Ponto de Partida:** Se a instância atual estiver vazia, o método atua como o `.from()` inicial, definindo a árvore externa (envolta em `control`) como a **RAIZ** do cálculo.
    -   **Anexação:** Se a instância já possuir um cálculo iniciado, ele realiza a união via operação `crossContextAdd`.
2.  **Captura de Nascimento:** Ao ser usado como ponto de partida (instância vazia), o método captura o `birthTime` para a jurisdição atual, que será selado na AST no momento do fechamento, garantindo o determinismo da assinatura final.
3.  **Carimbo de Jurisdição:** Envolve a árvore externa em um nó do tipo `control`. Este nó registra permanentemente o `previousContextLabel` e a `previousSignature` original.
4.  **Handshake de Segurança:** Valida a integridade da instância externa (viva ou serializada) antes de permitir a entrada do dado.

## 🎯 Propósito
Simplificar a consolidação de dados entre diferentes módulos do sistema (ex: Impostos + Logística), eliminando a verbosidade de nós base artificiais e mantendo a auditabilidade total.

## 💼 Exemplos de Uso

### 1. Como Ponto de Partida (Ingestão Direta)
Ideal para iniciar um processo a partir de um valor que vem de outra jurisdição.
```typescript
const Finance = CalcAUY.create({ contextLabel: "finance" });
const Logistic = CalcAUY.create({ contextLabel: "logistic" });

const frete = Logistic.from(100);

// Finance inicia diretamente com o valor do frete
const total = await Finance.fromExternalInstance(frete).mult(2);
// Resultado na AST: (control(logistic: 100)) * 2
```

### 2. Como Anexo (Integração em Cadeia)
```typescript
const taxa = Finance.from(10);
const frete = Logistic.from(100);

// Anexa a taxa ao frete existente
const base = await frete.fromExternalInstance(taxa);
// Resultado na AST: 100 + (control(finance: 10))
```

## 🏗️ Anotações de Engenharia
- **Limpeza de AST:** Ao usar como ponto de partida, a árvore resultante é mais limpa e eficiente, evitando operações de soma desnecessárias com o valor zero.
- **Segurança Forense:** O nó de controle (`control`) prova que houve uma transferência de jurisdição, tornando o rastro digital juridicamente inquestionável.
- **Imutabilidade:** O método retorna uma nova instância, preservando a pureza do builder fluido.

---

## 🔗 Veja também
- [**Guia de Erros: instance-mismatch**](../errors/instance-mismatch.md)
- [**Padrão Birth Certificate (Spec 20)**](../specs/20-Instance-Isolation-Security.md)
