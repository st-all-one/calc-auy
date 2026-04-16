# CalcAUY: Visão Panorâmica da Engenharia
### "Cálculo Auditável e com Acessibilidade" (Audit + A11y)

A **CalcAUY** é uma biblioteca de alta precisão para TypeScript/JavaScript, projetada para substituir o uso inseguro de `number` (IEEE 754) em sistemas financeiros, fiscais e de auditoria. Ela se diferencia por não calcular valores imediatamente, mas sim construir uma Árvore de Sintaxe Abstrata (AST) imutável que preserva a intenção do cálculo até o momento do output.

---

## 🚀 Comece Aqui
- **[Guia de Início Rápido](./start.md)**: Aprenda a dominar a precisão absoluta em 2 minutos.
- **[Receitas e Exemplos](./examples.md)**: ICMS, Folha de Pagamento, Rateio e Batch Processing.
- **[Manual de Auditoria e PII](./audit.md)**: Como gerar provas matemáticas e proteger dados sensíveis.
- **[Enciclopédia Técnica (Specs)](./specs.md)**: O índice completo de especificações do motor.

---

## 🏗️ Os Quatro Pilares da CalcAUY

1.  **Precisão Racional Absoluta:** Utiliza `RationalNumber` (bigint n/d) com 50 casas decimais de precisão interna.
2.  **Imutabilidade Total:** Cada operação retorna uma nova instância, garantindo rastro histórico.
3.  **Auditabilidade Nativa (The "A"):** Métodos para injeção de metadados e rastro forense (Audit Trace).
4.  **Acessibilidade Universal (The "Y"):** Tradução verbal integrada (A11y) para leitura de fórmulas.

---

## 🔄 O Ciclo de Vida do Cálculo

### Fase 1: Input (Ingestão Restritiva)
- **Método:** `CalcAUY.from("10.50")`. Aceita strings, bigints e expressões.

### Fase 2: Construção e Enriquecimento (Fluent API & AST)
Nesta fase, você monta a fórmula e **anexa o contexto de negócio**.
- **Operações:** `.add()`, `.sub()`, `.mult()`, `.div()`, `.pow()`, `.mod()`, `.divInt()`.
- **Auditoria Contextual:** `.setMetadata(key, value)` vincula regras de negócio ao cálculo.
- **Hibernação:** `.hibernate()` serializa a árvore em JSON para salvar no banco de dados.

### Fase 3: Execução (Commit)
- **Método:** `.commit({ roundStrategy })`. Onde a estratégia de arredondamento (ex: **NBR-5891**) é aplicada para selar o cálculo.

### Fase 4: Exportação (Rich Outputs)
Com o cálculo selado, você extrai o resultado no formato desejado.
- **Formatos:** `.toMonetary()`, `.toStringNumber()`, `.toLaTeX()`, `.toHTML()`, `.toUnicode()`, `.toImageBuffer()`.
- **Rateio Forense:** `.toSlice()` e `.toSliceByRatio()` garantem rateios sem perda de centavos.

---

## 🛡️ Segurança e Performance
- **Security by Default:** Logs de infraestrutura ocultam dados sensíveis (PII) por padrão.
- **Anti-DoS:** Proteção nativa contra "JSON Bombs" e estouro de BigInt (limite de 1M de bits).
- **Yielding:** Processamento em massa (`ProcessBatchAUY`) que não trava o Event Loop do servidor.

---
**CalcAUY: Rigor Matemático, Transparência de Auditoria e Inclusão por Acessibilidade.**
