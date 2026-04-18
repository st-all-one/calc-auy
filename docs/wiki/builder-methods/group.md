# Método: `group()`

O `group()` é o operador de isolamento léxico da CalcAUY. Ele envolve a expressão atual em um `GroupNode`, o que equivale matematicamente a colocar parênteses ao redor da fórmula construída até aquele momento.

## ⚙️ Funcionamento Interno

1.  **Otimização de Redundância:** O método verifica o estado atual da árvore. Se o nó raiz já for um grupo ou um literal (onde parênteses não mudam a semântica), ele retorna a instância original sem criar um novo nó, economizando memória.
2.  **Criação de GroupNode:** Envelopa a AST atual como filha de um novo nó do tipo `group`.
3.  **Forçamento de Precedência:** Garante que todas as operações dentro do grupo sejam resolvidas antes de qualquer operação que venha a ser anexada após o fechamento do grupo.
4.  **Renderização Visual:** Sinaliza para os motores de output (LaTeX, Unicode) a necessidade de incluir glifos de parênteses `()`, colchetes `[]` ou chaves `{}` conforme a profundidade.

## 🎯 Propósito
Garantir o controle total sobre a ordem das operações, permitindo que o desenvolvedor isole sub-fórmulas de forma declarativa e segura.

## 💼 10 Casos de Uso Reais

1.  **Isolamento de Soma antes de Multiplicação:** Garantir que $(a + b) * c$ não vire $a + b * c$.
```typescript
// Exemplo 1: Base de cálculo com adicional
const total = CalcAUY.from(100).add(20).group().mult(2);
```
```typescript
// Exemplo 2: Soma de descontos antes da aplicação
const net = CalcAUY.from(50).add(30).group().mult("0.90");
```

2.  **Fórmulas de Proporcionalidade:** Isolar o cálculo de base temporal.
```typescript
// Exemplo 1: Diária proporcional
const daily = CalcAUY.from(3000).div(30).group().mult(days);
```
```typescript
// Exemplo 2: Taxa horária
const hourly = CalcAUY.from(total).div(160).group().mult(extraHours);
```

3.  **Cálculos de Margem de Lucro:** Estruturar a divisão de lucro bruto.
```typescript
// Exemplo 1: Margem sobre venda
const margin = CalcAUY.from(venda).sub(custo).group().div(venda);
```
```typescript
// Exemplo 2: Markup dinâmico
const price = CalcAUY.from(cost).mult(CalcAUY.from(1).add(profit).group());
```

4.  **Isolamento de Torre de Potência:** Definir explicitamente a base de uma exponenciação.
```typescript
// Exemplo 1: (2^3)^2
const tower = CalcAUY.from(2).pow(3).group().pow(2);
```
```typescript
// Exemplo 2: Montante com juros compostos isolados
const m = principal.mult(CalcAUY.from(1).add(rate).group().pow(time));
```

5.  **Cálculos de Média Ponderada:** Agrupar numeradores complexos.
```typescript
// Exemplo 1: Média simples de dois termos
const avg = CalcAUY.from(val1).add(val2).group().div(2);
```
```typescript
// Exemplo 2: Soma ponderada isolada
const score = CalcAUY.from(n1).mult(2).add(CalcAUY.from(n2).mult(3)).group().div(5);
```

6.  **Normalização de Dados:** Isolar a subtração de escala.
```typescript
// Exemplo 1: Min-Max Scaling
const norm = CalcAUY.from(x).sub(min).group().div(CalcAUY.from(max).sub(min).group());
```
```typescript
// Exemplo 2: Desvio do valor esperado
const deviation = CalcAUY.from(real).sub(target).group().div(target);
```

7.  **Aplicação de Impostos em Cascata:** Isolar cada etapa da tributação.
```typescript
// Exemplo 1: IPI sobre valor com ICMS (apenas exemplo didático)
const total = base.mult(1.18).group().mult(1.05);
```
```typescript
// Exemplo 2: Retenção de impostos
const liquid = gross.sub(CalcAUY.from(gross).mult(0.11).group()).sub(tax2);
```

8.  **Lógica de "All-or-Nothing":** Garantir que uma sub-árvore inteira seja multiplicada por zero ou um.
```typescript
// Exemplo 1: Aplicação de flag booleana
const activeVal = base.add(extra).group().mult(isActive ? 1 : 0);
```
```typescript
// Exemplo 2: Multiplicador de penalidade
const penalty = current.mult(hasError.group().mult(2));
```

9.  **Sistemas de Conversão de Moeda:** Isolar o spread bancário.
```typescript
// Exemplo 1: Taxa final de câmbio
const rate = CalcAUY.from(spot).mult(CalcAUY.from(1).sub(spread).group());
```
```typescript
// Exemplo 2: Valor convertido bruto
const converted = CalcAUY.from(amount).div(rate).group();
```

10. **Expressões de Engenharia Civil:** Fórmulas de tração aninhadas.
```typescript
// Exemplo 1: Carga resultante
const load = CalcAUY.from(p1).add(p2).group().div(area);
```
```typescript
// Exemplo 2: Fator de segurança
const safety = CalcAUY.from(resist).div(CalcAUY.from(stress).mult(1.5).group());
```

## 🛠️ Opções Permitidas

- (Nenhuma) - O método apenas envelopa a AST atual.

## 🏗️ Anotações de Engenharia
- **Isolamento Léxico:** Ao injetar uma instância de `CalcAUY` em outra (ex: `a.add(instanciaB)`), o motor da CalcAUY aplica um `group()` automático na `instanciaB` se ela não for um literal. Isso previne que a precedência de `a` "corrompa" a lógica interna de `B`.
- **Impacto no VerbalA11y:** O grupo gera marcadores auditivos como "abre parênteses" e "fecha parênteses", garantindo que usuários cegos entendam a hierarquia do cálculo.
- **Imutabilidade:** Retorna uma nova instância, mantendo o builder fluido e puro.
