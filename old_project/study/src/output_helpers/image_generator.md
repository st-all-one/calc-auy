# Auditoria Técnica: `src/output_helpers/image_generator.ts`

## 1. Propósito
O módulo `image_generator.ts` provê a funcionalidade de exportação visual binária para a CalcAUD. Sua responsabilidade é gerar uma representação gráfica (SVG) do cálculo realizado, encapsulando tanto a fórmula matemática quanto o resultado final em uma imagem auto-contida. Isso permite a inclusão da auditoria matemática em documentos PDF, e-mails estáticos e outros sistemas que não suportam execução de JavaScript ou CSS dinâmico.

## 2. Implementação Técnica
A implementação utiliza uma abordagem de **Engenharia Heurística de ViewBox**.
- **Composição Visual:** Reutiliza o HTML gerado pelo `html_generator.ts` e o incorpora dentro de um elemento `<foreignObject>` no SVG.
- **Cálculo de Dimensões (Heurística):**
  - **Largura:** Estima a largura horizontal baseando-se na contagem de caracteres da expressão (`textLength * averagePxPerChar * scaleFactor`). Aplica um *clamping* entre 300 e 2000 pixels.
  - **Altura Dinâmica:** Detecta a presença de elementos LaTeX que ocupam mais espaço vertical (frações e raízes) através de expressões regulares (`/\\frac/g`, `/\\sqrt/g`) e expande o ViewBox proporcionalmente.
- **Encodificação:** Utiliza `TextEncoder` para converter a string XML do SVG resultante em um `Uint8Array` (buffer binário).

## 3. Onde e Como é Usado
- **Dependência de Exportação:** É importado e consumido pela classe `CalcAUDOutput` (`src/output.ts`) no método `toImageBuffer()`.
- **Fluxo de Dados:** Recebe os dados de expressão e resultado, processa a geometria do SVG e retorna os bytes da imagem.

## 4. Padrões de Design
- **Adapter Pattern:** Adapta conteúdo HTML para o domínio visual do SVG através do `foreignObject`.
- **Heuristic-based Sizing:** Utiliza regras práticas para resolver a impossibilidade técnica de medir o tamanho real de um elemento HTML em um ambiente de execução sem renderização real (como o Deno ou Node.js sem DOM).

## 5. Parecer do Auditor
- **Engenharia de Layout:** A lógica de expansão vertical para frações e raízes é um detalhe de implementação refinado que evita cortes em fórmulas complexas.
- **Portabilidade Absoluta:** Ao incluir o CSS do KaTeX dentro do SVG, a imagem gerada é verdadeiramente universal e manterá a aparência correta independentemente de onde for visualizada.
- **Robustez de Saída:** A escolha do formato SVG (em vez de PNG/JPG) garante que a auditoria financeira nunca perca nitidez (pixelização), independentemente do zoom aplicado no documento final.
