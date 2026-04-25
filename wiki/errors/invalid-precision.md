# Erro: `invalid-precision` (400 Bad Request)

```mermaid
sequenceDiagram
    participant App
    participant Result as CalcAUYOutput
    App->>Result: toStringNumber({ decimalPrecision: -1 })
    activate Result
    Note over Result: 26-04-25 10:00 (iso)<br/>Erro de Projeção: invalid-precision<br/>Precisão negativa não permitida
    Result-->>App: Throw CalcAUYError
    deactivate Result
```

Este erro ocorre durante a fase de **Projeção (Output)**
 quando os parâmetros de precisão decimal solicitados são tecnicamente impossíveis ou fora dos limites de segurança.

## 🛠️ Como ocorre
1. **Precisão Negativa:** Solicitar `-1` ou menos casas decimais.
2. **Parâmetros Malformados:** Passar valores que não são inteiros para a configuração de precisão.

## 💻 Exemplos de Código

### Exemplo 1: toStringNumber com precisão negativa
```typescript
const res = await CalcAUY.from(10).commit();
// Lança invalid-precision
res.toStringNumber({ decimalPrecision: -2 });
```

### Exemplo 2: toScaledBigInt inválido
```typescript
const res = await CalcAUY.from(1.5).commit();
// Não é possível escalar para um número negativo de casas
res.toScaledBigInt({ decimalPrecision: -5 });
```

### Exemplo 3: Precisão Absurda
```typescript
// Embora o BigInt suporte muito, a lib impõe limites de sanidade
res.toStringNumber({ decimalPrecision: 1000000 });
```

## ✅ O que fazer
- **Valores Default:** Utilize as constantes da lib ou garanta que a precisão seja sempre `>= 0`.
- **Math.max:** Use `Math.max(0, precisaoSolicitada)` ao passar parâmetros dinâmicos.
- **Configuração Global:** Defina a precisão padrão na sua camada de serviço para evitar passar valores errados repetidamente.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
Embora a biblioteca pudesse simplesmente usar `Math.max(0, p)` para tratar precisões negativas, ela opta por lançar um erro para **preservar a intenção do desenvolvedor**. Solicitar uma precisão negativa ou absurdamente alta é geralmente um sinal de erro de cálculo na camada de apresentação.

Se a CalcAUY corrigisse isso silenciosamente, o desenvolvedor nunca saberia que sua lógica de formatação está produzindo valores inesperados. A falha explícita garante que a camada de output seja tão rigorosa quanto a camada de cálculo, mantendo a consistência de ponta a ponta.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
