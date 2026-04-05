# CalcAUY: Visão Panorâmica da Engenharia
### "Cálculo Auditável e com Acessibilidade" (Audit + A11y)

A **CalcAUY** é uma biblioteca de alta precisão para TypeScript/JavaScript, projetada para substituir o uso inseguro de `number` (IEEE 754) em sistemas financeiros, fiscais e de auditoria. Ela se diferencia por não calcular valores imediatamente, mas sim construir uma Árvore de Sintaxe Abstrata (AST) imutável que preserva a intenção do cálculo até o momento do output.

---

## 1. Os Quatro Pilares da CalcAUY

1.  **Precisão Racional Absoluta:** Utiliza `RationalNumber` (bigint n/d) com 50 casas decimais de precisão interna.
2.  **Imutabilidade Total:** Cada operação retorna uma nova instância, garantindo rastro histórico.
3.  **Auditabilidade Nativa (The "A"):** Métodos para injeção de metadados e rastro forense (Audit Trace).
4.  **Acessibilidade Universal (The "Y"):** Tradução verbal integrada (A11y) para leitura de fórmulas.

---

## 2. O Ciclo de Vida do Cálculo

### Fase 1: Input (Ingestão Restritiva)
- **Método:** `CalcAUY.from("10.50")`.

### Fase 2: Construção e Enriquecimento (Fluent API & AST)
Nesta fase, você monta a fórmula e **anexa o contexto de negócio**.
- **Operações:** `.add()`, `.sub()`, `.mult()`, `.div()`, etc.
- **Ingestão de Expressões:** `.parseExpression("10 + 5")` permite converter strings matemáticas complexas diretamente em nós da árvore, com suporte a precedência total e auto-agrupamento.
- **Auditoria Contextual:** `.setMetadata(key, value)` permite anexar IDs de faturas.
- **Hibernação Parcial:** `.getAST()` permite extrair a árvore em qualquer ponto da construção para salvar o progresso no banco de dados.

### Fase 3: Execução (Commit)
- **Método:** `.commit(strategy)` -> Selagem matemática do cálculo.

### Fase 4: Exportação (Rich Outputs)
Com o cálculo selado, você extrai o resultado no formato desejado. É aqui que você define a **precisão decimal** de exibição.
- **Métodos:** `.toMonetary()`, `.toStringNumber()`, `.toLaTeX()`, `.toVerbalA11y()`, `.toAuditTrace()`, `.toImageBuffer()`.
- **Rateio de Precisão:** `.toSlice()` e `.toSliceByRatio()` garantem que você possa dividir um valor entre parcelas ou sócios sem "perder" centavos no arredondamento (Algoritmo de Maior Resto).

---

## 3. Ferramentas de Auditoria e Persistência

### `setMetadata(key: string, value: unknown)`
Essencial para auditoria. Permite que cada nó da árvore saiba *por que* foi criado.
*Exemplo:* `.add(50).setMetadata("motivo", "Taxa de Conveniência")`. No rastro de auditoria, o valor 50 estará vinculado a esta explicação.

### `toSlice()` e `toSliceByRatio()`
Essencial para ERPs e sistemas de faturamento. Se você tem `10.00` e precisa dividir em 3 parcelas, a **CalcAUY** retorna `["3.34", "3.33", "3.33"]`. A soma das fatias é **sempre** idêntica ao valor total, eliminando as famosas "diferenças de 1 centavo" em balanços contábeis.

### `hibernate()` e `hydrate(json)`
Permite a **persistência e composição de cálculos** (Hibernação). 
- **`hibernate()`**: Captura e serializa a árvore atual em uma **string JSON** para armazenamento duradouro.
- **`getAST()`**: Retorna o objeto da árvore (AST) para uso programático.
- **`hydrate(json | object)`**: Reconstrói uma instância ativa.  - **Como Raiz**: Inicia uma nova cadeia de cálculo (`CalcAUY.hydrate(AST).add(10)`).
  - **Como Operando**: Quando injetado em outro cálculo (`calc.mult(CalcAUY.hydrate(AST))`), ele se comporta como uma instância normal e é **automaticamente protegido por parênteses**, garantindo a integridade da precedência matemática.

---

## 4. Guia de DX (Developer Experience)

```typescript
import { CalcAUY } from "calc-auy";

// Construção com auditoria e possibilidade de pausa
const calculoBase = CalcAUY.from(1000)
  .mult(1.10)
  .setMetadata("taxa", "Juros de Mora");

// Hibernação: Salva o estado para uso futuro
const snapshot = calculoBase.hibernate();

// Reidratação e Composição: Retoma ou injeta em outro cálculo
// 2. Selagem do cálculo (Execução Racional)
const resultadoFinal = CalcAUY.from(500)
  .add(
    CalcAUY.hydrate(snapshot) // Injetado e auto-agrupado como (1000 * 1.10)
  )
  .commit({ roundStrategy: "NBR-5891" });

console.log(resultadoFinal.toMonetary({ locale: "pt-BR", decimalPrecision: 2 }));
console.log(resultadoFinal.toStringNumber({ decimalPrecision: 2 })); // "1600.00"
```

---

## 5. Configurações e Momentos

| O que configurar | Onde/Quando | Impacto |
| :--- | :--- | :--- |
| **Metadados** | Fase de Construção (`.setMetadata`) | Contexto de negócio no `toAuditTrace`. |
| **Persistência** | Qualquer momento (`.hibernate()`) | Permite salvar/retomar o cálculo (JSON). |
| **Estratégia** | Fase de Commit (`.commit({ strategy })`) | Define a lógica matemática do colapso. |
| **Locale / Moeda** | Fase de Output (`.toX()`) | Internacionalização e localização. |
---
**CalcAUY: Rigor Matemático, Transparência de Auditoria e Inclusão por Acessibilidade.**
