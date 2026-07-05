# API do Builder (CalcAUYLogic)

## Factory

### `CalcAUY.create()`

Cria uma instância isolada de `CalcAUYLogic` com identidade própria, segredo criptográfico e políticas de segurança. Cada instância é uma **jurisdição** que impede mistura entre contextos diferentes.

```typescript
// Assinatura
CalcAUY.create(config: InstanceConfig): CalcAUYLogic
```

Onde `InstanceConfig`:
- `contextLabel` — `string` (obrigatório) — identificador da jurisdição
- `salt` — `string` (opcional, padrão `""`) — chave secreta para BLAKE3
- `roundStrategy` — `RoundingStrategy` (opcional, padrão `"NBR5891"`)
- `encoder` — `"HEX"` | `"BASE64"` | `"BASE58"` | `"BASE32"` (opcional, padrão `"HEX"`)
- `sensitive` — `boolean` (opcional, padrão `true`)

```typescript
// Contexto financeiro
const Financeiro = CalcAUY.create({
  contextLabel: "financeiro",
  salt: "secret-fin",
  roundStrategy: "HALF_EVEN",
});

// Contexto logístico (jurisdição isolada)
const Logistica = CalcAUY.create({
  contextLabel: "logistica",
  salt: "secret-log",
});
```

### `CalcAUY.checkIntegrity()`

Valida a assinatura digital BLAKE3 de um rastro serializado sem reconstruir a árvore. Ideal para middlewares e gateways que só precisam provar não-adulteração.

```typescript
// Assinatura
CalcAUY.checkIntegrity(data: object | string, config: { salt: string; encoder?: "HEX" | "BASE64" | "BASE58" | "BASE32" }): Promise<void>
```

```typescript
// Validação rápida em middleware
app.post("/verify", async (req) => {
  await CalcAUY.checkIntegrity(req.body, { salt: "api-secret" });
  return { status: "valid" };
});
```

---

## Ingestion

### `.from(value)`

Ingere um valor literal e o converte para a representação racional interna (`n/d`). Suporta `string`, `number`, `bigint`, percentuais (`"18%"`) e notação científica (`"1.38e-23"`).

```typescript
from(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from("18%");
```

```typescript
calc.from(42).add(1).commit(); // 43
```

```typescript
// Notação científica
calc.from("1.380649e-23");
```

### `.parseExpression(string)`

Converte uma string de expressão matemática em AST usando parser de descida recursiva com precedência PEMDAS e associatividade à direita para potências.

```typescript
parseExpression(expression: string): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.parseExpression("(custo + frete) * (1 + margem)");
```

```typescript
calc.parseExpression("1000 * (1 + 0.02) ^ 12");
```

---

## Arithmetic

### `.add(value)`

Anexa uma operação de adição à AST. A precisão racional é mantida até o `commit()`, evitando erros como `0.1 + 0.2 = 0.30000000000000004`.

```typescript
add(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from("1/3").add("1/3").add("1/3"); // 1
```

```typescript
// Composição com sub-árvore
calc.from(10).add(CalcAUY.create({ contextLabel: "sub", salt: "s" }).from(3).pow(2).mult(5).group());
```

### `.sub(value)`

Anexa uma subtração. Internamente tratada como `A + (-B)` para consistência algébrica.

```typescript
sub(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(100).sub(20).group().div(100); // Margem: (100 - 20) / 100
```

```typescript
// Dedução de imposto
calc.from(5000).sub(CalcAUY.create({ contextLabel: "t", salt: "s" }).from(5000).mult("0.11").group());
```

### `.mult(value)`

Anexa uma multiplicação. A engine mantém a fração exata — `0.1 * 0.2` é `2/100`, não `0.020000000000000004`.

```typescript
mult(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(100).mult("1.30").mult("1.18"); // Cascata de taxas
```

```typescript
// Capitalização
calc.from(1000).mult(CalcAUY.create({ ctx: "r", salt: "s" }).from("1.01").pow(12));
```

### `.div(value)`

Anexa uma divisão racional. Rejeita divisor zero em tempo de construção. Preserva dízimas como frações exatas.

```typescript
div(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(10).div(3); // 10/3 — jamais 3.333...
```

```typescript
// Preço médio: Receita / (Vendidos + Brindes)
calc.from(50000).div(CalcAUY.create({ ctx: "q", salt: "s" }).from(100).add(20).group());
```

### `.pow(exp)`

Potenciação com expoentes inteiros ou fracionários (raízes). Usa Square-and-Multiply para inteiros e método de Newton para frações (precisão interna de 50 casas).

```typescript
pow(exp: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(16).pow("0.5"); // 4
```

```typescript
// Juros compostos
calc.from(1000).mult(CalcAUY.create({ ctx: "r", salt: "s" }).from("1.01").pow(12));
```

### `.mod(value)`

Retorna o resto da divisão euclidiana (opera com BigInts no commit). Útil para validação de dígitos verificadores e cálculos de ciclo.

```typescript
mod(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(11).mod(3); // 2
```

```typescript
calc.from(somaDigitos).mod(11); // DV módulo 11
```

### `.divInt(value)`

Retorna o quociente inteiro descartando o resto. Difere de `div()` que preserva a fração completa.

```typescript
divInt(value: InputValue): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(100).divInt(3); // 33
```

```typescript
calc.from(totalMinutes).divInt(60); // Horas inteiras
```

---

## Structure

### `.group()`

Envolve a expressão atual em um `GroupNode` (parênteses). Força a precedência da sub-expressão antes de operações seguintes.

```typescript
group(): CalcAUYLogic
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from(100).add(20).group().mult(2); // (100 + 20) * 2
```

```typescript
// Média
calc.from(val1).add(val2).group().div(2);
```

### `.setMetadata(key, value)`

Anexa metadados de negócio ao nó atual. Essencial para auditoria forense — o "porquê" de cada operação.

```typescript
setMetadata(key: string, value: MetadataValue): CalcAUYLogic
```

Onde `MetadataValue` é `string | number | boolean | null`.

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
calc.from("0.18").setMetadata("lei", "Art. 155 CF/88");
```

```typescript
calc.from(5000).setMetadata("pii", true); // Oculta em logs sensíveis
```

---

## Persistence

### `.hibernate()`

Serializa a AST atual em string JSON determinística (BigInts viram strings), permitindo armazenamento em banco, cache ou rede.

```typescript
hibernate(): Promise<string>
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const snapshot = await calc.from(100).add(50).hibernate();
await db.drafts.update({ id }, { logic: snapshot });
```

```typescript
// Salvamento em localStorage
localStorage.setItem("draft", await calc.hibernate());
```

Ver também: [Guia de Persistência](../features/persistence.md), [Assinatura do Cálculo](../security/calculation-signature.md)

### `.hydrate(data)`

Reconstrói uma instância funcional a partir de dados serializados, validando a assinatura BLAKE3. Envolve a árvore em um nó de controle que preserva a jurisdição original.

```typescript
hydrate(data: object | string, config?: { salt?: string; encoder?: "HEX" | "BASE64" | "BASE58" | "BASE32" }): Promise<CalcAUYLogic>
```

```typescript
const calc = CalcAUY.create({ contextLabel: "ex", salt: "fixo" });
const restored = await calc.hydrate(jsonFromDB, { salt: "secret" });
await restored.add(50).commit();
```

```typescript
// Validação forense
try {
  await calc.hydrate(traceFromLog, { salt: "audit-key" });
} catch {
  // integrity-critical-violation
}
```

Ver também: [Guia de Segurança](../security/security.md)

### `.fromExternalInstance(data)`

Portal de integração entre jurisdições. Permite iniciar ou anexar um cálculo a partir de uma instância externa ou rastro assinado, mantendo a linhagem forense.

```typescript
fromExternalInstance(data: CalcAUYLogic | string | object): Promise<CalcAUYLogic>
```

```typescript
const Finance = CalcAUY.create({ contextLabel: "finance", salt: "fin" });
const Logis = CalcAUY.create({ contextLabel: "logistic", salt: "log" });

const frete = Logis.from(150.50);
const total = await Finance.fromExternalInstance(frete).add(1000).commit();
```

```typescript
// Consolidação multi-contexto
const consolidado = await HQ.fromExternalInstance(subtotalA);
await consolidado.fromExternalInstance(subtotalB);
```

Ver também: [Segurança e Defesa Jurídica](../security/security.md)

---

## Execution

### `.commit()`

Colapsa a AST em um `CalcAUYOutput`. Executa a avaliação recursiva com simplificação GCD. Método assíncrono e **sem parâmetros**.

A estratégia de arredondamento é definida na criação da instância; a precisão decimal, nos métodos de saída:

```typescript
const calc = CalcAUY.create({
  contextLabel: "ex",
  salt: "fixo",
  roundStrategy: "TRUNCATE", // ← aqui, não no commit()
});
const icms = await calc.from("1000").mult("18%").commit();
console.log(icms.toStringNumber({ decimalPrecision: 2 })); // precisão no output
```

```typescript
const exact = CalcAUY.create({
  contextLabel: "exato", salt: "n", roundStrategy: "NONE",
});
const dizima = await exact.from(1).div(3).commit();
console.log(dizima.toStringNumber()); // "0.3333..." (50 casas)
```

Ver também: [Estratégias de Arredondamento](../features/rounding.md), [API de Saída](./output-methods.md)

---

[↑ Voltar ao índice](../index.md)
