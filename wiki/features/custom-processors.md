# Processadores de Saída Customizados (Extensibilidade)

```mermaid
flowchart LR
    AST[AST Tree] --> Manager[toCustomOutput]
    Manager --> UserFn["Custom Processor (fn)"]
    UserFn --> Output[Protobuf / XML / ...]
```

## Objetivo
Prover um mecanismo de "Injeção de Lógica de Saída" que permita à CalcAUY suportar qualquer formato de exportação (Protobuf, XML, JSON-LD, etc.) sem sobrecarregar o core.

## A Interface Funcional

```typescript
export type CalcAUYCustomOutput<Toutput> = (
  this: CalcAUYOutput,
  context: CalcAUYCustomOutputContext
) => Toutput;
```

## O Contexto de Dados

O contexto fornece acesso à precisão absoluta do `RationalNumber` e à estrutura completa da AST:

- **`result: RationalNumber`**: Valor final do cálculo (numerador/denominador puros).
- **`ast: CalculationNode`**: Árvore completa para reconstrução customizada.
- **`roundStrategy: RoundingStrategy`**: Estratégia definida no `commit`.
- **`audit`**: Rastros pré-gerados (`latex`, `unicode`, `verbal`).
- **`options: Readonly<OutputOptions>`**: Locale, moeda e precisão.
- **`methods`**: Métodos padrão do `CalcAUYOutput` (`toStringNumber`, `toMonetary`, etc.).

## Exemplo

```typescript
const xmlExporter: CalcAUYCustomOutput<string> = (ctx) => {
  const cents = ctx.methods.toScaledBigInt({ decimalPrecision: 2 });
  const valFormatado = ctx.methods.toStringNumber({ decimalPrecision: 2 });

  return `
    <imposto roundStrategy="${ctx.roundStrategy}">
      <valor_bruto>${ctx.result.n}/${ctx.result.d}</valor_bruto>
      <valor_fiscal>${valFormatado}</valor_fiscal>
      <centavos_inteiros>${cents}</centavos_inteiros>
      <rastro_latex>${ctx.audit.latex}</rastro_latex>
    </imposto>
  `.trim();
};

const xml = resultado.toCustomOutput(xmlExporter);
```

## Casos de Uso
- **Sistemas Legados:** Formatação fixed-width.
- **Mensageria:** Buffers binários ou Protobuf.
- **Auditoria Jurídica:** Relatórios com justificativas baseadas em metadados da AST.

> **Nota:** Para formatos oficiais (Protobuf, CBOR, MsgPack, HTML, Image), veja [processor-packages.md](./processor-packages.md).

---

[↑ Voltar ao índice](../index.md)
