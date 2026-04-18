# Método: `toCustomOutput()`

O `toCustomOutput()` é o ponto máximo de extensibilidade da CalcAUY. Ele permite que desenvolvedores injetem funções customizadas para gerar formatos proprietários ou integrações não nativas.

## ⚙️ Funcionamento Interno

1.  **Construção de Contexto:** Cria um objeto imutável contendo a AST, o resultado racional, a estratégia e rastros pré-gerados (LaTeX, Unicode, Verbal).
2.  **Bind de Métodos:** Disponibiliza referências seguras para todos os métodos de exportação da classe dentro do contexto.
3.  **Execução do Processador:** Invoca a função fornecida pelo usuário, passando o contexto como argumento e definindo o `this` como a instância de output.
4.  **Telemetria:** Monitorado como uma operação de extensão.

## 🎯 Propósito
Permitir que a biblioteca cresça sem modificações no core, suportando layouts de exportação específicos de cada empresa ou país.

## 💼 10 Casos de Uso Reais

1.  **Exportadores de XML de NF-e:** Gerar o layout específico exigido pela SEFAZ.
```typescript
// Exemplo 1: Gerador de XML de Nota Fiscal
const nfe = res.toCustomOutput((ctx) => `<vUnCom>${ctx.methods.toStringNumber({ decimalPrecision: 10 })}</vUnCom>`);
```
```typescript
// Exemplo 2: Tag de imposto complexa
const xmlTax = output.toCustomOutput(ctx => `<vICMS v="${ctx.methods.toStringNumber()}"/>`);
```

2.  **Integração com Blockchain:** Gerar um payload assinado com o hash do rastro matemático.
```typescript
// Exemplo 1: Payload para Smart Contract
const payload = res.toCustomOutput(ctx => ({ val: ctx.result.n.toString(), hash: sha256(ctx.audit.latex) }));
```
```typescript
// Exemplo 2: Minting metadata
const metadata = output.toCustomOutput(ctx => sign(ctx.audit.unicode));
```

3.  **Geração de CSV Customizado:** Formatação de colunas com delimitadores e encodings proprietários.
```typescript
// Exemplo 1: Linha de CSV com Pipe
const csv = res.toCustomOutput(ctx => `FIN|${ctx.methods.toScaledBigInt()}|${ctx.audit.unicode}`);
```
```typescript
// Exemplo 2: Exportação TSV
const tsvRow = output.toCustomOutput(ctx => ["TOTAL", ctx.methods.toStringNumber()].join("\t"));
```

4.  **Exportação Protobuf:** Conversão do resultado para protocolos binários de alta performance.
```typescript
// Exemplo 1: Mensagem gRPC
const grpcMsg = res.toCustomOutput(ctx => MyProto.encode({ amount: ctx.methods.toScaledBigInt() }));
```
```typescript
// Exemplo 2: Serialização Avro
const avroBytes = output.toCustomOutput(ctx => avroSchema.toBuffer({ val: ctx.methods.toStringNumber() }));
```

5.  **Integração com Legacy Mainframes:** Formatação de strings fixed-width (EBCDIC ou similar).
```typescript
// Exemplo 1: Campo COBOL PIC 9(15)V99
const cobol = res.toCustomOutput(ctx => ctx.methods.toScaledBigInt().toString().padStart(17, "0"));
```
```typescript
// Exemplo 2: Header de arquivo de lote
const header = output.toCustomOutput(ctx => `H${new Date().toISOString()}${ctx.methods.toScaledBigInt()}`);
```

6.  **Geradores de Excel Avançados (XLSX):** Inserção de fórmulas reais do Excel baseadas na AST.
```typescript
// Exemplo 1: Injeção de fórmula em planilha
const cell = res.toCustomOutput(ctx => ({ f: `=${excelParser.fromAST(ctx.ast)}`, v: ctx.methods.toFloatNumber() }));
```
```typescript
// Exemplo 2: Spreadsheet cell metadata
const excelMeta = output.toCustomOutput(ctx => ({ type: "n", value: ctx.methods.toStringNumber() }));
```

7.  **Sistemas de Gráficos Customizados:** Extração de coordenadas para renderizações 3D ou Canvas.
```typescript
// Exemplo 1: Coordenada Y para gráfico Canvas
const y = res.toCustomOutput(ctx => canvasHeight - ctx.methods.toFloatNumber() * scale);
```
```typescript
// Exemplo 2: Pontos de curva de juros
const point = output.toCustomOutput(ctx => ({ x: ctx.options.time, y: ctx.methods.toFloatNumber() }));
```

8.  **Validação de Regras de Negócio:** Aplicação de travas proprietárias sobre o rastro antes da exportação.
```typescript
// Exemplo 1: Verificação de limite operacional
const isValid = res.toCustomOutput(ctx => ctx.methods.toFloatNumber() < businessRules.maxLimit);
```
```typescript
// Exemplo 2: Auditoria de conformidade interna
const report = output.toCustomOutput(ctx => auditTool.validate(ctx.audit.latex));
```

9.  **Logística / Etiquetas:** Geração de conteúdo para impressoras Zebra (ZPL).
```typescript
// Exemplo 1: Comando ZPL para etiqueta de preço
const zpl = res.toCustomOutput(ctx => `^FO50,50^A0N,50,50^FDTotal: ${ctx.methods.toMonetary()}^FS`);
```
```typescript
// Exemplo 2: Barcode metadata
const barcode = output.toCustomOutput(ctx => `BAR|${ctx.methods.toScaledBigInt()}`);
```

10. **Serialização Binária (MessagePack):** Compactação extrema para transmissão de dados de alta frequência.
```typescript
// Exemplo 1: Serialização direta de rastro e resultado
const msgpackBuffer = res.toCustomOutput(ctx => msgpack.encode({
  val: ctx.methods.toStringNumber(),
  audit: ctx.audit.unicode,
  strategy: ctx.strategy
}));
```
```typescript
// Exemplo 2: Payload otimizado para cache distribuído
const binaryCache = output.toCustomOutput(ctx => {
  return msgpack.encode([ctx.result.n.toString(), ctx.result.d.toString(), ctx.strategy]);
});
```

## 🛠️ Opções Permitidas

| Componente | Tipo | Descrição |
| :--- | :--- | :--- |
| `processor` | `ICalcAUYCustomOutput` | Função que recebe o `ICalcAUYCustomOutputContext`. |

## 💡 Recomendações
- **Use o rastro auditável.** O `ctx.audit` já contém LaTeX e Unicode prontos, economizando processamento no seu custom output.
- **Mantenha a imutabilidade.** Evite tentar alterar o estado da engine dentro do processador.

## 🏗️ Considerações de Engenharia
- **Full Access:** O processador tem acesso ao numerador e denominador brutos (`result.n`, `result.d`), permitindo precisão absoluta na exportação.
- **Inversão de Controle:** A CalcAUY entrega os dados, o desenvolvedor decide a forma, mantendo o core agnóstico de formatos de arquivo específicos.
