# Processador: `toImageBuffer()` (via `toCustomOutput`)

O processador de imagem é utilizado para gerar provas visuais imutáveis do rastro de auditoria. É ideal para anexar em PDFs de faturas, enviar por e-mail ou gerar previews em redes sociais.

> [!IMPORTANT]
> Este não é um método nativo da classe `CalcAUYOutput`. Ele deve ser importado da pasta `processor` e executado através do método `.toCustomOutput()`.

## ⚙️ Funcionamento

O processador renderiza a árvore de cálculo utilizando um motor de renderização vetorial (SVG) e, opcionalmente, converte para formatos rasterizados (PNG/JPEG). Ele captura não apenas a fórmula, mas também as assinaturas digitais e o selo de jurisdição.

## 💼 Exemplo de Uso

```typescript
import { imageProcessor } from "@st-all-one/calc-auy/processor/image-buffer";

const result = await Finance.from(5000).mult(1.2).commit();

// Gera um Buffer contendo um PNG da prova de cálculo
const pngBuffer = result.toCustomOutput(imageProcessor, {
  format: "png",
  width: 800,
  includeSignature: true
});

await Deno.writeFile("./evidence-2026.png", pngBuffer);
```

## 🛠️ Opções de Processamento

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `format` | `string` | `"svg"` | Formato de saída: `svg`, `png`, `jpeg`. |
| `width` | `number` | `1200` | Largura da imagem em pixels. |
| `includeSignature` | `boolean` | `true` | Se `true`, estampa o hash BLAKE3 no rodapé da imagem. |
| `font` | `string` | `"Inter"` | Família de fontes a ser utilizada na renderização. |

## 🏗️ Anotações de Engenharia
- **Isolamento de Runtime:** Em ambientes serverless (como Deno Deploy), o processador utiliza implementações de Canvas puramente em JS ou Rust (via WASM) para evitar dependências de sistema operacional.
- **Segurança Forense:** A imagem gerada contém metadados XMP ocultos com o JSON completo do `toAuditTrace()`, permitindo que a imagem em si seja validada programaticamente anos depois.

---

## 🔗 Veja também
- [**Método: toCustomOutput()**](./toCustomOutput.md)
- [**Método: toAuditTrace()**](./toAuditTrace.md)
