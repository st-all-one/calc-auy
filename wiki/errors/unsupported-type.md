# Erro: `unsupported-type` (400 Bad Request)

```mermaid
sequenceDiagram
    participant App
    participant Calc as CalcAUY
    App->>Calc: from(NaN)
    activate Calc
    Note over Calc: 26-04-25 10:00 (iso)<br/>Erro de Ingestão: unsupported-type<br/>Tipo de dado não permitido (NaN/Null)
    Calc-->>App: Throw CalcAUYError
    deactivate Calc
```

O `unsupported-type` é o guardião da camada de entrada.
 Ele garante que apenas dados que podem ser convertidos com segurança em frações racionais `BigInt` entrem no motor de cálculo.

## 🛠️ Como ocorre
1. **Objetos e Arrays:** Tentar passar estruturas complexas diretamente para o `from()`.
2. **Valores Não-Finitos:** Ingestão de `NaN`, `Infinity` ou `-Infinity` vindos do tipo `number`.
3. **Nulos/Indefinidos:** Passar `null` ou `undefined` explicitamente.

## 💻 Exemplos de Código

### Exemplo 1: Ingestão de NaN
```typescript
// Ocorre frequentemente ao receber resultado de um cálculo JS nativo falho
const valorProblematico = Math.sqrt(-1); // NaN
const calc = CalcAUY.from(valorProblematico);
```

### Exemplo 2: Tipos Complexos
```typescript
// Lança unsupported-type: a lib não adivinha propriedades de objetos
const input = { preco: "10.50" };
const calc = CalcAUY.from(input as any);
```

### Exemplo 3: Valores Nulos
```typescript
// Lança unsupported-type: proteção contra erros de "null pointer"
const val: string | null = null;
const calc = CalcAUY.from(val as any);
```

## ✅ O que fazer
- **Verifique os tipos permitidos:** A lib possui uma tabela rigorosa de quais formatos de input são permitidos, verifique elas na especificação de `inputs` na Wiki.
- **Cast Explícito:** Converta seus dados para `string` ou `bigint` antes da ingestão.
- **Checagem de Finitude:** Se estiver usando `number`, verifique com `Number.isFinite(val)` antes de chamar a CalcAUY.
- **Default Values:** Use o operador nullish coalescing (`??`) para evitar passar nulls: `CalcAUY.from(input ?? "0")`.

## 🧠 Reflexão Técnica: Por que não resolvemos automaticamente?
A CalcAUY opera sob um modelo de **Confiança Zero (Zero Trust)** na camada de ingestão. Se permitíssemos o processamento de objetos complexos ou arrays tentando extrair valores numericos automaticamente (ex: pegando a primeira propriedade de um objeto), estaríamos assumindo um risco de negócio que não pertence à biblioteca matemática.

Valores como `NaN` ou `Infinity` são estados de erro do padrão IEEE 754 que não possuem representação racional real ($n/d$). Tentar "normalizá-los" para `0` ocultaria falhas críticas de upstream. Forçar o erro garante que o desenvolvedor trate a origem do dado, mantendo a cadeia de custódia da informação financeira intacta.

---

## 🔗 Veja também
- [**Guia de Erros**](../errors.md): Lista completa de exceções da CalcAUY.
- [**Central de Documentação**](../entrypoint.md): Voltar para a página principal.
