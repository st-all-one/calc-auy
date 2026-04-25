# Erro: `math-overflow` (422 Unprocessable Entity)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    activate Calc
    App->>Calc: pow(1000000)
    App->>Calc: commit()
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro de Sistema: math-overflow<br/>Cálculo excede 1 milhão de bits
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

Embora o `BigInt` do JavaScript suporte números gigantescos,
 a CalcAUY impõe um limite de segurança de **1 milhão de bits** para prevenir exaustão de memória e ataques de negação de serviço (DoS).

## 🛠️ Como ocorre
1. **Torres de Potência:** Exponenciações sucessivas (ex: `10^10^10`).
2. **Fatoriais ou Cadeias Massivas:** Multiplicações extremamente longas de números muito grandes.
3. **Recursão Explosiva:** Árvores com profundidade que geram numeradores ou denominadores que excedem a capacidade de bits definida.

## 💻 Exemplos de Código

### Exemplo 1: Explosão de Potência
```typescript
// Lança math-overflow: o resultado excede 1M de bits rapidamente
const calc = CalcAUY.from(10).pow(10).pow(10).pow(10);
await calc.commit();
```

### Exemplo 2: Multiplicação Gigante
```typescript
let calc = CalcAUY.from("1e100000"); // Número já muito grande
calc = calc.mult(calc).mult(calc);
await calc.commit();
```

### Exemplo 3: Divisão por Epsilon minúsculo
```typescript
// Dividir um número grande por uma fração extremamente pequena
const calc = bigNode.div("1e-1000000");
```

## ✅ O que fazer
- **Análise de Escala:** Verifique se a lógica do seu negócio realmente exige números dessa magnitude. Frequentemente, overflows são sinais de loops infinitos ou fórmulas de exponenciação mal projetadas.
- **Uso de Escalas:** Para valores astronômicos, considere trabalhar com logaritmos ou reduzir a base antes do cálculo.
- **Filtros de Entrada:** Limite o valor máximo que um usuário pode digitar em campos de expoente ou multiplicador.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
Embora o `BigInt` do JavaScript seja teoricamente limitado apenas pela memória disponível, na prática, operações com números de milhões de bits consomem CPU e RAM de forma exponencial. Um único cálculo mal-projetado poderia derrubar um servidor inteiro.

O limite de **1 milhão de bits** é uma guarda de segurança necessária para manter a estabilidade da aplicação host. A CalcAUY não tenta "arredondar" ou "truncar" o overflow porque isso produziria um resultado matemático completamente errado. Em um sistema de auditoria, **um erro explícito de capacidade é preferível a um número silenciosamente errado**.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
