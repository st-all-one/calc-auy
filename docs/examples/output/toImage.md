# Geração de Imagem (PNG/JPG) no Back-end

A CalcAUY gera um rastro de auditoria visual rico usando HTML e CSS (via KaTeX). Embora a biblioteca forneça um buffer SVG universal, a conversão para formatos rasterizados (como PNG ou JPG) no servidor requer um motor que compreenda HTML e CSS.

## Por que usar Puppeteer?

Diferente de SVGs simples, o rastro da CalcAUY utiliza a tag `<foreignObject>` para embutir estilos complexos e fontes matemáticas. Ferramentas de conversão simples (como ImageMagick ou resvg) geralmente ignoram esse conteúdo. O **Puppeteer** garante fidelidade total de renderização.

## Exemplo Otimizado (Deno + Puppeteer)

Este exemplo demonstra como capturar a fórmula em **altíssima resolução** e com fundo transparente, ideal para embutir em laudos ou compartilhar em redes sociais.

```ts
import { CalcAUY } from "@st-all-one/calc-auy";
import katex from "npm:katex";
import puppeteer from "npm:puppeteer";

// 1. Gere o rastro em HTML (Fontes já estão embutidas em Base64)
const result = CalcAUY.from(144).pow("1/2").div(2).commit();
const html = result.toHTML(katex);

// 2. Configure o Puppeteer para alta fidelidade
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Aumente o deviceScaleFactor para gerar imagens em "4K" (Ultra HD)
await page.setViewport({ 
    width: 800, 
    height: 400, 
    deviceScaleFactor: 4 
});

// 3. Injete o conteúdo com CSS de acabamento
await page.setContent(`
    <style>
        body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .calc-auy-result { 
            display: inline-block !important; 
            padding: 30px !important; 
            background: white !important;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
    </style>
    <div id="capture">${html}</div>
`);

// 4. Capture apenas o elemento da fórmula
const element = await page.$(".calc-auy-result");
if (element) {
    await element.screenshot({ 
        path: "resultado_auditoria.png",
        omitBackground: true // Mantém a transparência ao redor do card
    });
}

await browser.close();
```

## Dicas de Performance

1.  **Cache do Navegador:** Em produção, mantenha uma instância do `browser` aberta (Singleton) em vez de abrir/fechar a cada cálculo.
2.  **Paralelismo:** Use `browser.newPage()` para processar múltiplas imagens simultaneamente na mesma instância do Chromium.
3.  **Resolução vs Tamanho:** Um `deviceScaleFactor: 2` costuma ser suficiente para a maioria dos usos (PDFs/Web). Use `4` apenas para impressões de grande formato.

## Segurança e Independência
Como a CalcAUY já injeta as fontes do KaTeX em Base64 dentro da string retornada pelo `.toHTML()`, você **não precisa** ter as fontes instaladas no servidor ou no Docker. O navegador headless conseguirá desenhar a fórmula corretamente de forma 100% offline.
