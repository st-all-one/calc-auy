# Método: `create()` (Static)

O `create()` é a factory principal da CalcAUY. Ele substitui a configuração global antiga por um modelo de **Jurisdições Isoladas**, onde cada instância possui sua própria identidade, segredos e políticas de segurança.

## ⚙️ Funcionamento Interno

1.  **Identidade Única:** Cada chamada ao `.create()` gera um `unique symbol` interno. Isso impede que instâncias diferentes se misturem em operações matemáticas comuns, disparando o erro `instance-mismatch`.
2.  **Branding de Tipos:** Utiliza *Branded Types* do TypeScript para fornecer segurança em tempo de compilação, permitindo que a IDE identifique incompatibilidades entre contextos (ex: Financeiro vs Logística).
3.  **Encapsulamento de Política:** O `salt`, `encoder` e a sensibilidade (`sensitive`) são injetados na instância e protegidos por campos privados reais (`#`), sendo inacessíveis externamente.
4.  **Builder Limpo:** Retorna uma instância de `CalcAUYLogic` em estado inicial (AST nula), pronta para o primeiro `.from()` ou `.parseExpression()`.

## 🎯 Propósito
Garantir o isolamento absoluto de cálculos entre diferentes módulos do sistema ou diferentes clientes (Multi-tenant), mantendo a integridade militar do rastro de auditoria.

## 💼 Exemplos de Uso

### 1. Configuração de Domínio Isolado
```typescript
const Finance = CalcAUY.create({
  contextLabel: "financeiro",
  salt: "segredo_bancario_123",
  sensitive: true
});

const capital = Finance.from(1000);
```

### 2. Uso de Mesmos Labels para Instâncias Distintas
Lembre-se: Labels iguais não significam instâncias iguais.
```typescript
const Calc1 = CalcAUY.create({ contextLabel: "vendas" });
const Calc2 = CalcAUY.create({ contextLabel: "vendas" });

Calc1.from(10).add(Calc2.from(5)); // ❌ Erro: instance-mismatch (IDs únicos)
```

### 3. Diferenciação na IDE
Se as configurações forem diferentes, a IDE acusará erro visual:
```typescript
const C1 = CalcAUY.create({ contextLabel: "A", salt: "S1" });
const C2 = CalcAUY.create({ contextLabel: "A", salt: "S2" });

C1.from(10).add(C2.from(10)); // ❌ Erro de tipagem (Salts diferentes)
```

## 🛠️ Opções de Configuração (`InstanceConfig`)

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `contextLabel` | `string` | **Obrigatório** | Nome amigável da jurisdição para logs e erros. |
| `salt` | `string` | `""` | Sal secreto para assinaturas BLAKE3. |
| `encoder` | `string` | `"HEX"` | Formato da assinatura: `HEX`, `BASE64`, `BASE58`, `BASE32`. |
| `sensitive` | `boolean` | `true` | Se `true`, oculta valores reais nos logs de telemetria. |

## 🏗️ Anotações de Engenharia
- **Segurança de Runtime:** A validação de `contextLabel` é feita em tempo de execução para garantir que strings vazias ou nulas não criem jurisdições ambíguas.
- **Memória:** Por ser uma factory leve, criar múltiplas instâncias não sobrecarrega o heap, permitindo o uso de uma instância por requisição em APIs se necessário.
- **Interoperabilidade:** Para unir instâncias diferentes, utilize o método [`.addFromExternalInstance()`](./addFromExternalInstance.md).

---

## 🔗 Veja também
- [**Guia de Erros: instance-mismatch**](../errors/instance-mismatch.md)
- [**Método: hydrate()**](./hydrate.md)
