# `CalcAUY.create()` — Fábrica de Instâncias

## Assinatura

```typescript
public static create<const T extends InstanceConfig & { contextLabel: string }>(
  config: T,
): CalcAUYLogic<T["contextLabel"], T>
```

Cria uma nova instância de cálculo isolada com configuração própria de segurança, arredondamento e identidade.

> `CalcAUY.from()` **não existe**. O único ponto de entrada é `CalcAUY.create()`.

## Parâmetros

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `contextLabel` | `string` | **(obrigatório)** | Rótulo amigável que identifica a jurisdição. Não pode ser vazio. |
| `salt` | `string` | `""` | Chave secreta usada na assinatura BLAKE3. Instâncias com salts diferentes produzem assinaturas incompatíveis. |
| `roundStrategy` | `"NBR5891"` \| `"HALF_UP"` \| `"HALF_EVEN"` \| `"TRUNCATE"` \| `"CEIL"` \| `"NONE"` | `"NBR5891"` | Estratégia de arredondamento padrão da instância. |
| `encoder` | `"HEX"` \| `"BASE64"` \| `"BASE58"` \| `"BASE32"` | `"HEX"` | Codificação da assinatura digital. |
| `sensitive` | `boolean` | `true` | Se `true`, dados sensíveis são ocultados nos logs (`[PII]`). |
| `[BIRTH_TICKET_MOCK]` | `string` | *(interno)* | Timestamp determinístico injetado para testes. Uso interno. |

## Comportamento

### Isolamento de Instância

Cada chamada a `create()` gera um `Symbol` único que funciona como **identidade de instância**:

- Instâncias diferentes produzem **assinaturas diferentes** para o mesmo valor (salt específico)
- Tentar misturar instâncias via `.add()` ou `.mult()` lança `instance-mismatch`
- A única ponte entre contextos é `fromExternalInstance()`, que valida a assinatura e preserva a linhagem

### Isolamento de Cache

O cache de nós (Hot + Cold) é **global** (compartilhado entre instâncias), mas a identidade de instância impede o uso indevido de nós de outro contexto. O cache armazena `LiteralNode`s reutilizáveis com base no input string — independente de qual instância os criou.

### Configuração Default

```typescript
DEFAULT_INSTANCE_CONFIG = {
  sensitive: true,
  salt: "",
  encoder: "HEX",
  contextLabel: "",
  roundStrategy: "NBR5891",
};
```

Apenas `contextLabel` é obrigatório — todos os demais parâmetros são opcionais e recebem o valor padrão.

## Exemplos

### 1. Configuração Básica

```typescript
import { CalcAUY } from "@st-all-one/calc-auy";

const Finance = CalcAUY.create({
  contextLabel: "fin-ops",
  salt: "vault-secret",
  roundStrategy: "HALF_UP",
});

const result = await Finance
  .from(10000)
  .mult(Finance.from(1).add("5.25%").group())
  .commit();

console.log(result.toMonetary({ locale: "pt-BR" }));
// R$ 10.525,00
```

### 2. Ambiente Security-Sensitive (padrão)

```typescript
const Healthcare = CalcAUY.create({
  contextLabel: "icu-dosage",
  salt: "patient-data-protected",
  sensitive: true,  // padrão, oculta valores em logs
  encoder: "BASE64",
});

const dose = await Healthcare
  .from(12.5)
  .mult(0.15)
  .setMetadata("patient", "anon-xyz")
  .commit();

// Logs sanitizados: [PII] oculta valores numéricos
```

### 3. Cross-Context com Encoder Customizado

```typescript
const Branch = CalcAUY.create({
  contextLabel: "branch-ny",
  salt: "branch-salt",
  encoder: "BASE64",
});

const HQ = CalcAUY.create({
  contextLabel: "corporate-hq",
  salt: "hq-salt",
  roundStrategy: "NBR5891",
});

const branchCalc = Branch.from(500000).setMetadata("region", "NY");
// Ponte segura entre jurisdições
const consolidated = await HQ.fromExternalInstance(branchCalc);
```

---

[↑ Voltar ao índice](../index.md)
