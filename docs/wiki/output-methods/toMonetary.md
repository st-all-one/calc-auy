# Método: `toMonetary()`

O `toMonetary()` gera uma representação financeira formatada e localizada, respeitando símbolos de moeda, separadores de milhar e regras culturais de cada país.

## ⚙️ Funcionamento Interno

1.  **Resolução de Locale:** Utiliza a configuração informada ou o padrão da biblioteca (`pt-BR`).
2.  **Cálculo Decimal:** Obtém a string numérica via `toStringNumberInternal()` com a precisão correta (ajustada pelo helper `getEffectivePrecision`).
3.  **Integração Intl:** Utiliza a API nativa `Intl.NumberFormat` do JavaScript para aplicar a máscara monetária.
4.  **Cache de Formatadores:** Mantém instâncias de `Intl.NumberFormat` em cache estático, pois a criação deste objeto é uma das operações mais pesadas do runtime.
5.  **Telemetria:** Monitorado por `TelemetrySpan`.

## 🎯 Propósito
Apresentar o resultado final do cálculo no formato que o usuário final espera ver em sua conta bancária, fatura ou recibo.

## 💼 10 Casos de Uso Reais

1.  **Exibição de Saldo:** Mostrar o valor disponível em conta (ex: `R$ 1.250,50`).
```typescript
// Exemplo 1: Texto de saldo em aplicativo
const balanceText = `Seu saldo atual é: ${res.toMonetary()}`;
```
```typescript
// Exemplo 2: Resumo de conta corrente
accountSummary.total = output.toMonetary({ locale: "pt-BR" });
```

2.  **Checkout de E-commerce:** Exibição do total do carrinho e parcelas.
```typescript
// Exemplo 1: Total do carrinho
const cartTotal = `Total: ${res.toMonetary()}`;
```
```typescript
// Exemplo 2: Detalhe de parcelas (ex: 10x de R$ 50,00)
const installment = `10x de ${output.toMonetary()}`;
```

3.  **Extratos Bancários:** Listagem de transações formatadas.
```typescript
// Exemplo 1: Linha de extrato bancário
const entry = { date: "10/10", label: "Mercado", val: res.toMonetary() };
```
```typescript
// Exemplo 2: Exportação de extrato para PDF
doc.text(`Débito: ${output.toMonetary({ currency: "USD" })}`);
```

4.  **Conversão de Moeda:** Exibição de valores calculados em diferentes moedas (USD, EUR, BRL).
```typescript
// Exemplo 1: Conversão para Dólar
const usdVal = res.toMonetary({ locale: "en-US", currency: "USD" });
```
```typescript
// Exemplo 2: Multi-currency report
const report = currencies.map(c => output.toMonetary({ currency: c }));
```

5.  **Relatórios de Faturamento:** Tabelas financeiras com alinhamento decimal correto.
```typescript
// Exemplo 1: Célula de tabela de faturamento
const cell = `<td>${res.toMonetary()}</td>`;
```
```typescript
// Exemplo 2: Coluna de impostos em Excel
sheet.addRow(["Imposto", output.toMonetary({ decimalPrecision: 4 })]);
```

6.  **Recibos de Pagamento:** Documentos gerados para o cliente após uma compra.
```typescript
// Exemplo 1: Recibo digital (email)
const receipt = `Recebemos o valor de ${res.toMonetary()}`;
```
```typescript
// Exemplo 2: Comprovante de PIX
confirmation.text = `Valor transferido: ${output.toMonetary()}`;
```

7.  **Dashboards de Vendas:** Visualização de KPIs monetários (GMV, Ticket Médio).
```typescript
// Exemplo 1: Card de métrica GMV
<Stat label="GMV Mensal" value={res.toMonetary()} />
```
```typescript
// Exemplo 2: Gráfico de barras com labels
options.plugins.datalabels.formatter = () => output.toMonetary();
```

8.  **Sistemas de Folha de Pagamento:** Exibição de salários, descontos e proventos.
```typescript
// Exemplo 1: Salário líquido no holerite
const netSalary = `Líquido a receber: ${res.toMonetary()}`;
```
```typescript
// Exemplo 2: Demonstrativo de FGTS
payslip.addRow("FGTS", output.toMonetary());
```

9.  **Apps de Controle Financeiro:** Gráficos e textos de economia pessoal.
```typescript
// Exemplo 1: Orçamento mensal
const budget = `Você ainda tem ${res.toMonetary()} para gastar`;
```
```typescript
// Exemplo 2: Planejamento de metas
goal.current = output.toMonetary();
```

10. **APIs de Cotação:** Envio de valores formatados para notificações push.
```typescript
// Exemplo 1: Notificação de variação cambial
push.send(`O Dólar caiu para ${res.toMonetary({ currency: "USD" })}`);
```
```typescript
// Exemplo 2: Alert de preço de ação
alert.message = `Bitcoin atingiu ${output.toMonetary({ currency: "USD" })}`;
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `locale` | `string` | Localidade (ex: 'en-US'). | Muda o símbolo e os separadores (ex: `,` vs `.`). |
| `currency` | `string` | Símbolo da moeda (ex: 'USD'). | Altera o prefixo/sufixo monetário (ex: `$` vs `R$`). |
| `decimalPrecision` | `number` | Precisão da formatação. | Força a moeda a ter N casas (ex: `15.0` vira `R$ 15,000`). |

## 💡 Recomendações
- **Confie no Padrão:** Na maioria dos casos, não passe `currency` ou `locale`, deixe a lib usar os padrões globais definidos no setup.
- **Atenção ao `NONE`:** Se a estratégia for `NONE`, este método tentará exibir todas as 50 casas decimais na moeda, o que é útil para auditoria, mas visualmente "estranho" para usuários comuns.

## 🏗️ Considerações de Engenharia
- **Thread Safety:** O cache de formatadores é seguro e compartilhado entre instâncias para máxima performance.
- **Normalização de Espaços:** Lida automaticamente com o caractere `&nbsp;` (espaço não quebrável) gerado por alguns sistemas operacionais na formatação monetária.
