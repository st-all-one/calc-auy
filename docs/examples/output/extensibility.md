# Método: `.toHTML()` e `.toCustomOutput()`

Gera representações visuais ricas ou permite a extensão total da biblioteca para novos formatos.

## Assinatura
```ts
public toHTML(katex: IKatex, options?: OutputOptions): string
public toCustomOutput<T>(processor: ICalcAUYCustomOutput<T>): T
```

## Exemplos de Uso

### 1. Renderização HTML Acessível
Injeta automaticamente o CSS e o rastro verbal (aria-label).
```ts
import katex from "katex";

const html = output.toHTML(katex);
document.body.innerHTML = html;
```

### 2. Criando um Exportador Customizado (XML)
A CalcAUY é extensível. Você pode criar novos formatos sem mudar a lib.
```ts
const xml = output.toCustomOutput((ctx) => {
  return `<calc result="${ctx.result.n}/${ctx.result.d}">${ctx.audit.latex}</calc>`;
});
```

## Engenharia
O `toHTML` utiliza **Inversão de Dependência**. Você passa o módulo KaTeX para a lib, mantendo o bundle da CalcAUY leve e agnóstico de ambiente (funciona tanto no servidor quanto no navegador).
