# Método: `setMetadata()`

O `setMetadata()` é a funcionalidade que transforma a CalcAUY de uma simples calculadora em uma ferramenta de auditoria forense. Ele permite anexar chaves e valores contextuais ao nó atual da Árvore de Sintaxe Abstrata (AST), garantindo que cada operação matemática carregue sua justificativa de negócio.

## ⚙️ Funcionamento Interno

1.  **Imutabilidade de Nó:** Como toda a biblioteca é imutável, o método não altera o nó atual. Ele cria uma cópia profunda do nó, injetando ou atualizando a chave no mapa de metadados.
2.  **Validação de Valor:** Invoca o `validateMetadata()`, garantindo que o valor seja serializável (strings, números, booleanos ou nulo) e não contenha referências circulares que quebrem o `JSON.stringify`.
3.  **Preservação na Hierarquia:** Os metadados ficam "presos" ao nó onde foram inseridos. Se você adicionar metadados a um nó de soma, eles não contaminarão os operandos filhos, mantendo a pureza da auditoria.
4.  **Telemetria de Depuração:** Em modo `debug`, o logger registra a anexação do metadado e o snapshot da estrutura resultante.

## 🎯 Propósito
Acoplar o "porquê" ao "quanto". É essencial para compliance, permitindo que auditores saibam exatamente qual regra de negócio gerou cada parcela de um cálculo complexo.

## 💼 10 Casos de Uso Reais

1.  **Identificação de Regras Fiscais:** Marcar qual artigo da lei justifica uma alíquota.
```typescript
// Exemplo 1: Alíquota de ICMS
const tax = CalcAUY.from("0.18").setMetadata("lei", "Art. 155 CF/88");
```
```typescript
// Exemplo 2: Isenção de IPI
const zeroTax = CalcAUY.from(0).setMetadata("motivo", "Decreto Federal 10.000");
```

2.  **Rastreabilidade de Operador:** Registrar quem realizou a modificação em um cálculo manual.
```typescript
// Exemplo 1: Auditoria de ajuste manual
const adj = CalcAUY.from(50).setMetadata("editor", "stallone_ls");
```
```typescript
// Exemplo 2: Registro de aprovador
const approved = res.setMetadata("approved_by", "manager_id_99");
```

3.  **Timestamp de Operação:** Marcar o momento exato de cada etapa do cálculo.
```typescript
// Exemplo 1: Log de criação
const start = CalcAUY.from(100).setMetadata("created_at", Date.now());
```
```typescript
// Exemplo 2: Momento de aplicação de juros
const withJuros = base.add(10).setMetadata("calc_time", new Date().toISOString());
```

4.  **Proteção de PII (Privacidade):** Marcar nós que contêm dados sensíveis para ocultação em logs.
```typescript
// Exemplo 1: Salário de funcionário
const sal = CalcAUY.from(5000).setMetadata("pii", true);
```
```typescript
// Exemplo 2: CPF ou identificador pessoal
const cpfNode = CalcAUY.from(123).setMetadata("pii", true);
```

5.  **Categorização Contábil:** Definir o centro de custo ou conta contábil.
```typescript
// Exemplo 1: Lançamento de débito
const debit = CalcAUY.from(150).setMetadata("account", "6.1.1.01");
```
```typescript
// Exemplo 2: Centro de custo de marketing
const mktExp = res.setMetadata("cost_center", "MKT_001");
```

6.  **Versioning de Fórmulas:** Registrar qual versão do algoritmo foi utilizada.
```typescript
// Exemplo 1: Algoritmo de risco
const score = CalcAUY.from(base).setMetadata("version", "v2.1.4");
```
```typescript
// Exemplo 2: Tabela de preços sazonal
const price = res.setMetadata("price_list", "BLACK_FRIDAY_2026");
```

7.  **Depuração de Árvores Complexas:** Inserir "breadcrumbs" para facilitar o rastreio técnico.
```typescript
// Exemplo 1: Marcador de etapa de cálculo
const step1 = CalcAUY.from(10).add(5).setMetadata("debug_label", "subtotal_base");
```
```typescript
// Exemplo 2: Identificador de ramo de árvore
const branch = res.setMetadata("branch", "legacy_logic_fallback");
```

8.  **Tradução Customizada (A11y):** Fornecer dicas para o gerador verbal.
```typescript
// Exemplo 1: Pronúncia customizada
const node = CalcAUY.from(10).setMetadata("voice_hint", "dez unidades");
```
```typescript
// Exemplo 2: Label para leitor de tela
const tagged = res.setMetadata("label", "Total líquido com descontos");
```

9.  **Integração com ERPs:** Armazenar IDs externos para sincronização.
```typescript
// Exemplo 1: ID de registro no SAP
const sync = CalcAUY.from(99.90).setMetadata("sap_id", "00012345");
```
```typescript
// Exemplo 2: Chave estrangeira de banco de dados
const linked = res.setMetadata("external_ref", "GUID-AAA-BBB");
```

10. **Lógica de Interface (UI):** Armazenar cores ou ícones associados ao valor.
```typescript
// Exemplo 1: Cor de status baseada no cálculo
const warning = CalcAUY.from(-10).setMetadata("ui_color", "red");
```
```typescript
// Exemplo 2: Ícone de tendência
const trend = res.setMetadata("icon", "trending_up");
```

## 🛠️ Opções Permitidas

- `key`: `string` (O nome do metadado).
- `value`: `MetadataValue` (`string | number | boolean | null`).

## 🏗️ Anotações de Engenharia
- **Preservação de Contexto:** Como o `setMetadata` retorna um novo `CalcAUY`, ele pode ser encadeado. Ex: `.from(10).setMetadata("a", 1).setMetadata("b", 2)`. O nó resultante terá ambas as chaves.
- **Overhead Controlado:** Os metadados são armazenados em um objeto simples dentro do nó. O uso excessivo (milhares de chaves por nó) pode aumentar o tamanho do JSON de hibernação, mas não afeta a performance do cálculo matemático puro.
- **Sanitização:** Se o metadado `pii: true` estiver presente, a CalcAUY ocultará os detalhes técnicos desse nó em logs de nível `info`.
