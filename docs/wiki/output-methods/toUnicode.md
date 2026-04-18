# Método: `toUnicode()`

O `toUnicode()` gera uma representação matemática legível utilizando glifos Unicode especiais (sobrescritos, subscritos e símbolos matemáticos), permitindo visualização rica em ambientes de texto puro.

## ⚙️ Funcionamento Interno

1.  **Mapeamento de Homóglifos:** Traduz números e letras para suas versões Unicode subscritas (ex: `roundNBR5891` vira `roundₙᵦᵣ₅₈₉₁`).
2.  **Símbolos Especiais:** Utiliza glifos como `√` para raízes e `·` para multiplicação conforme definido nas normas de tipografia matemática.
3.  **Renderização de Potência:** Converte expoentes para sobrescritos Unicode (ex: `x²`).
4.  **Telemetria:** Possui span de telemetria individual.

## 🎯 Propósito
Permitir a auditoria de fórmulas em ambientes onde a renderização gráfica (HTML/Canvas) não está disponível, como terminais, logs de texto e aplicativos de mensagens simples.

## 💼 10 Casos de Uso Reais

1.  **Logs de Produção:** Registro da fórmula calculada em arquivos de log legíveis por humanos.
```typescript
// Exemplo 1: Log formatado no Winston/Pino
logger.info(`Fórmula processada: ${res.toUnicode()}`);
```
```typescript
// Exemplo 2: Snapshot de erro em log de texto
fs.appendFileSync("error.log", `Falha no cálculo: ${output.toUnicode()}\n`);
```

2.  **CLI Tools:** Exibição de resultados formatados diretamente no terminal do desenvolvedor.
```typescript
// Exemplo 1: Output em ferramenta Deno CLI
console.log(" \x1b[1mRastro de Auditoria:\x1b[0m", res.toUnicode());
```
```typescript
// Exemplo 2: Tabela de CLI formatada
const table = new Table({ head: ["ID", "Fórmula Unicode"] });
table.push([id, output.toUnicode()]);
```

3.  **Bots de Slack/Discord:** Envio de confirmações de cálculo com visualização clara de potência e raiz.
```typescript
// Exemplo 1: Mensagem para Slack (Block Kit)
await slack.chat.postMessage({ text: `Cálculo aprovado: \`${res.toUnicode()}\`` });
```
```typescript
// Exemplo 2: Embed para Discord
channel.send({ content: `✅ Resultado auditado: ${output.toUnicode()}` });
```

4.  **Notificações SMS/Push:** Envio de resumos de transações com fórmulas simples.
```typescript
// Exemplo 1: Payload de Push Notification
const push = { title: "Cálculo Concluído", body: res.toUnicode({ decimalPrecision: 2 }) };
```
```typescript
// Exemplo 2: SMS de verificação
twilio.send(`Saldo calculado via ${output.toUnicode()}`);
```

5.  **Comentários de Código Automáticos:** Inserção do rastro de cálculo em metadados de sistemas de versão.
```typescript
// Exemplo 1: Commit message automática
const msg = `Auto-fix: recalculado valor base via ${res.toUnicode()}`;
```
```typescript
// Exemplo 2: Header de arquivo gerado
const header = `/** CalcAUY Trail: ${output.toUnicode()} **/`;
```

6.  **Sistemas de Tickets (Jira/Zendesk):** Colar o rastro de um erro matemático de forma legível.
```typescript
// Exemplo 1: Comentário em issue do Jira
jira.addComment(issueId, `Anomalia detectada na fórmula: {code}${res.toUnicode()}{code}`);
```
```typescript
// Exemplo 2: Descrição de bug report
const body = `Reprodução: executando ${output.toUnicode()} resulta em divergência.`;
```

7.  **Debugging Rápido:** Verificação de precedência via `console.log` sem precisar de um navegador.
```typescript
// Exemplo 1: Debug inline
const res = a.add(b).commit();
console.debug(res.toUnicode());
```
```typescript
// Exemplo 2: Condicional de debug
if (process.env.DEBUG) logger.debug(`AST: ${output.toUnicode()}`);
```

8.  **Emails de Texto Puro:** Envio de relatórios financeiros simples sem depender de HTML.
```typescript
// Exemplo 1: Body de email plain-text
const emailBody = `O montante de R$ 10,50 foi derivado de: ${res.toUnicode()}`;
```
```typescript
// Exemplo 2: Template de notificação bancária
const text = `Confirmação de juros compostos: ${output.toUnicode()}`;
```

9.  **READMEs de Projetos:** Documentação de exemplos de uso da biblioteca com fórmulas reais.
```typescript
// Exemplo 1: Geração de docs automática
const md = `### Exemplo Real \n\`${res.toUnicode()}\``;
```
```typescript
// Exemplo 2: Snippet de demonstração
console.log("// O output abaixo foi gerado pela CalcAUY:\n", output.toUnicode());
```

10. **IoT / Displays Simples:** Exibição de fórmulas em telas de cristal líquido (LCD) que suportam Unicode.
```typescript
// Exemplo 1: Envio para display I2C
lcd.print(res.toUnicode({ decimalPrecision: 1 }));
```
```typescript
// Exemplo 2: Telemetria em painel de LED
broadcastToPanel(`TOTAL: ${output.toUnicode()}`);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Precisão do resultado no rastro. | Define quantas casas o valor final após o `=` terá. |

## 💡 Recomendações
- **Use para auditoria imediata.** É a forma mais barata (em termos de CPU) de ver o que aconteceu na AST.
- **Atenção à Fonte:** Nem todas as fontes de terminais suportam todos os glifos Unicode (especialmente os de Unicode 17.0).

## 🏗️ Considerações de Engenharia
- **String Imutável:** O resultado é uma string padrão, compatível com qualquer sistema que suporte UTF-8.
- **Performance:** É significativamente mais rápido que o `toLaTeX`, pois não envolve construção de sintaxe complexa de escape.
