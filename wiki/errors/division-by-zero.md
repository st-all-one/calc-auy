# Erro: `division-by-zero` (422 Unprocessable Entity)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    activate Calc
    App->>Calc: from(10)
    App->>Calc: div(0)
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro Matemático: division-by-zero<br/>Tentativa de divisão por zero detectada
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

Este erro ocorre quando a lógica do cálculo tenta realizar uma divisão onde o divisor (denominador) resulta em zero.
 A CalcAUY bloqueia isso tanto na ingestão quanto na execução (`commit`).

## 🛠️ Como ocorre
1. **Divisão Direta:** Uso explícito do divisor zero em `div()` ou `divInt()`.
2. **Expressão Dinâmica:** Uma sub-expressão ou variável que, ao ser avaliada, resulta em zero no denominador.
3. **Frações Literais:** Ingestão de strings como `"10/0"`.

## 💻 Exemplos de Código

### Exemplo 1: Divisão Direta
```typescript
const calc = CalcAUY.from(10).div(0);
// O erro pode ser lançado imediatamente ou no commit()
```

### Exemplo 2: Denominador Calculado
```typescript
// (10 / (5 - 5)) -> Divisão por zero
const calc = CalcAUY.from(10).div(CalcAUY.from(5).sub(5).group());
await calc.commit(); // Lança division-by-zero
```

### Exemplo 3: Divisão Inteira
```typescript
// divInt também é protegida
const calc = CalcAUY.from(100).divInt("0");
```

## ✅ O que fazer
- **Proteção de Variável:** Valide se o seu divisor não é zero antes de encadear o método `.div()`.
- **Lógica de Fallback:** Utilize `group()` e `add()` pequenos (como um epsilon, se aplicável ao negócio) ou trate o erro para retornar um valor padrão (ex: 0 ou nulo).
- **Validação de Negócio:** Em rateios, garanta que o número de fatias (`parts`) seja sempre `>= 1`.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
Em matemática financeira e contábil, **não existe um valor padrão seguro para divisão por zero**. Retornar `0` seria matematicamente falso, e retornar um valor tendendo ao infinito corromperia o balanço de qualquer transação.

A biblioteca não tenta "resolver" isso automaticamente (por exemplo, adicionando um valor minúsculo ao denominador) porque isso alteraria o resultado final de forma imprevisível e não auditável. Ao lançar a exceção, a CalcAUY força o sistema chamador a decidir qual é a regra de negócio correta para aquele cenário de exceção (ex: cancelar a operação ou usar um fallback definido por lei).

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
