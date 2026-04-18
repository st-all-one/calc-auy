# Método: `add()`

O método `add()` anexa uma operação de adição à Árvore de Sintaxe Abstrata (AST). Ele representa a união de dois valores ou sub-expressões sob a semântica da soma aritmética, permitindo composições recursivas de alta complexidade.

## ⚙️ Funcionamento Interno

1.  **Auto-Agrupamento Inteligente:** Se o valor passado for outra instância de `CalcAUY`, o builder verifica se a raiz dessa sub-árvore é uma operação de menor ou igual precedência. Se for, ele aplica um `GroupNode` automático para garantir que a soma externa não quebre a integridade da sub-fórmula.
2.  **Aritmética de Numeradores:** Internamente, a soma de duas frações $n1/d1 + n2/d2$ é resolvida como $(n1*d2 + n2*d1) / (d1*d2)$.
3.  **Lazy Evaluation:** O custo computacional da soma é diferido. O `add()` apenas gera um novo nó na árvore; a simplificação via MDC e o colapso dos valores só ocorrem no `commit()`.

## 🎯 Propósito
Acumular resultados de sub-rotinas, aplicar acréscimos dinâmicos e consolidar árvores de decisão matemática.

## 💼 10 Casos de Uso Reais (Engenharia de Composição)

1.  **Composição de Sub-Fórmulas Aninhadas:** Somar o resultado de uma potência multiplicada.
```typescript
// Exemplo 1: 10 + (3^2 * 5) = 55
const res = CalcAUY.from(10).add(CalcAUY.from(3).pow(2).mult(5).group());
```
```typescript
// Exemplo 2: (1 + 1) + ((2 + 2) * 2) = 10
const res = CalcAUY.from(1).add(1).group().add(CalcAUY.from(2).add(2).group().mult(2).group());
```

2.  **Acúmulo de Dízimas Periódicas:** Somar frações que não fecham em base decimal.
```typescript
// Exemplo 1: 1/3 + 1/3 + 1/3 = 1.0000...
const total = CalcAUY.from("1/3").add("1/3").add("1/3");
```
```typescript
// Exemplo 2: (10/3) + (20/3) = 10
const res = CalcAUY.from("10/3").add("20/3");
```

3.  **Composição de Imposto sobre Base Adicional:** Somar base e frete antes da tributação.
```typescript
// Exemplo 1: (Base + Frete) + (Base + Frete * Taxa)
const final = CalcAUY.from(base).add(frete).group().add(CalcAUY.from(base).add(frete).group().mult(tax).group());
```
```typescript
// Exemplo 2: Agregação de custos marginais
const total = custoBase.add(CalcAUY.from(seguro).mult("1.1").group());
```

4.  **Cálculo de Juros Compostos com Aportes:** Somar o principal elevado à potência a um novo aporte.
```typescript
// Exemplo 1: (P * (1+i)^n) + Aporte
const m = principal.mult(rateNode.pow(12)).group().add(aporteExtra);
```
```typescript
// Exemplo 2: Acúmulo de rendimento e capital fixo
const total = rendimento.add(CalcAUY.from(5000).mult(0.5).group());
```

5.  **União de Séries Matemáticas:** Implementação manual de somatórios.
```typescript
// Exemplo 1: Σ (x^n) para n=1..2
const serie = CalcAUY.from(x).pow(1).add(CalcAUY.from(x).pow(2).group());
```
```typescript
// Exemplo 2: Aproximação de Taylor (primeiros termos)
const taylor = CalcAUY.from(1).add(x).add(CalcAUY.from(x).pow(2).div(2).group());
```

6.  **Redução de Árvores Distribuídas:** Consolidar resultados de workers diferentes.
```typescript
// Exemplo 1: Somar resultados de batches paralelos
const total = worker1Result.add(worker2Result).add(worker3Result);
```
```typescript
// Exemplo 2: Soma de reducers assíncronos
const global = results.reduce((acc, curr) => acc.add(curr), CalcAUY.from(0));
```

7.  **Cálculo de Score com Bônus Condicional:** Somar valor base a uma sub-árvore de bônus.
```typescript
// Exemplo 1: Score + (Nível * Multiplicador)
const xp = currentXP.add(CalcAUY.from(lvl).mult(100).group());
```
```typescript
// Exemplo 2: Ranking com ajuste de handicap
const rank = baseScore.add(CalcAUY.from(kills).div(deaths).group());
```

8.  **Agregação de Metadados em Cadeia:** Somar valores mantendo o rastro de metadados de cada parcela.
```typescript
// Exemplo 1: A (meta: id1) + B (meta: id2)
const res = CalcAUY.from(10).setMetadata("id", 1).add(CalcAUY.from(20).setMetadata("id", 2));
```
```typescript
// Exemplo 2: Soma de parcelas auditadas individualmente
const total = p1.setMetadata("ref", "NF1").add(p2.setMetadata("ref", "NF2"));
```

9.  **Ajuste de Erro Absoluto:** Somar uma constante de correção a uma fórmula complexa.
```typescript
// Exemplo 1: (Leitura / Escala) + Offset
const correct = sensor.div(1024).group().add("0.0005");
```
```typescript
// Exemplo 2: Calibração de precisão
const val = formula.add(CalcAUY.from(1).div(1000000).group());
```

10. **Lógica de Interface "Progressiva":** Somar incrementos visuais.
```typescript
// Exemplo 1: Largura Atual + (Passo * Frame)
const width = current.add(CalcAUY.from(step).mult(f).group());
```
```typescript
// Exemplo 2: Offset de scroll calculado
const top = scroll.add(CalcAUY.from(headerHeight).sub(padding).group());
```

## 🛠️ Opções Permitidas
- `value`: `InputValue` (`string | number | bigint | CalcAUY`).

## 🏗️ Anotações de Engenharia
- **Complexidade de Árvore:** Adicionar nós via `add()` é $O(1)$. No entanto, árvores com profundidade excessiva (> 5000 nós) podem atingir o limite de recursão do motor V8 durante o `commit()`. Para estes casos, use `ProcessBatchAUY`.
- **Rigor de Arredondamento:** Diferente de somar `numbers`, onde o erro de precisão ocorre a cada `+`, aqui a precisão é mantida absoluta até o final. `CalcAUY.from(0.1).add(0.2)` resultará exatamente em `0.3` no output, e não em `0.30000000000000004`.
