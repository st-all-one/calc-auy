# Método: `toImageBuffer()`

O `toImageBuffer()` gera um buffer de dados contendo o código de uma imagem vetorial (SVG) que representa visualmente o cálculo e seu rastro de auditoria.

## ⚙️ Funcionamento Interno

1.  **Pipeline de Renderização:** Executa o fluxo `AST -> LaTeX -> HTML`.
2.  **Encapsulamento SVG:** Envolve o HTML renderizado pelo KaTeX em uma estrutura `<svg>` utilizando a técnica de `foreignObject`.
3.  **Ajuste Dinâmico:** Calcula a altura e largura necessária baseada na complexidade da fórmula (ex: frações exigem mais altura).
4.  **Encoding:** Converte a string SVG resultante em um `Uint8Array` (UTF-8) pronto para gravação em disco ou envio via rede.
5.  **Telemetria:** Monitorado individualmente para medir o custo de geração vetorial.

## 🎯 Propósito
Fornecer uma representação visual estática e imutável que pode ser visualizada em qualquer sistema de arquivos ou navegador, sem a necessidade de uma engine de renderização ativa no cliente.

## 💼 10 Casos de Uso Reais

1.  **Exportação de PDF:** Inserção de imagens de alta fidelidade em documentos gerados no servidor.
```typescript
// Exemplo 1: PDFKit image insertion
const buffer = res.toImageBuffer(katex);
doc.image(buffer, { width: 400 });
```
```typescript
// Exemplo 2: Puppeteer background image
const imgBase64 = Buffer.from(output.toImageBuffer(katex)).toString('base64');
```

2.  **Compartilhamento em Redes Sociais:** Geração de cartões de rastro matemático para redes como WhatsApp.
```typescript
// Exemplo 1: WhatsApp Bot image send
client.sendImage(chatId, res.toImageBuffer(katex), "trail.svg");
```
```typescript
// Exemplo 2: Twitter API media upload
const mediaId = await twitter.upload(output.toImageBuffer(katex));
```

3.  **Anexos de Email:** Envio de imagens SVG que são suportadas pela maioria dos clientes de email modernos.
```typescript
// Exemplo 1: Nodemailer attachment
transporter.sendMail({ attachments: [{ filename: 'audit.svg', content: res.toImageBuffer(katex) }] });
```
```typescript
// Exemplo 2: Mailgun inline image
const data = { inline: new mailgun.Attachment({ data: output.toImageBuffer(katex), filename: 'calc.svg' }) };
```

4.  **Arquivamento de Longo Prazo:** Salvar a "foto" do cálculo junto com o log em sistemas de storage (S3).
```typescript
// Exemplo 1: AWS S3 Upload
s3.putObject({ Key: `audits/${id}.svg`, Body: res.toImageBuffer(katex), ContentType: "image/svg+xml" });
```
```typescript
// Exemplo 2: Google Cloud Storage
storage.bucket(bucket).file(`${id}.svg`).save(output.toImageBuffer(katex));
```

5.  **Integração com Apps Mobile Nativos:** Exibição do rastro em componentes de imagem nativos (iOS/Android).
```typescript
// Exemplo 1: React Native Image source
const uri = `data:image/svg+xml;base64,${base64Encode(res.toImageBuffer(katex))}`;
```
```typescript
// Exemplo 2: Flutter custom painter input
const svgData = new TextDecoder().decode(output.toImageBuffer(katex));
```

6.  **Geração de QR Codes Compostos:** Criação de imagens de auditoria que acompanham boletos.
```typescript
// Exemplo 1: Boleto PDF generation
boleto.addExtraImage(res.toImageBuffer(katex), { x: 10, y: 50 });
```
```typescript
// Exemplo 2: QR Code metadata linking to image
const qr = await QRCode.toDataURL(`https://audit.com/v/${id}`);
```

7.  **Sistemas de Cache de Imagem:** Servir o rastro pré-renderizado via CDN para economizar CPU.
```typescript
// Exemplo 1: Redis image cache
await redis.set(`img:${id}`, Buffer.from(res.toImageBuffer(katex)));
```
```typescript
// Exemplo 2: Cloudflare Workers KV
await KV.put(`audit_img_${id}`, output.toImageBuffer(katex));
```

8.  **Provas Digitais:** Documento visual anexado a processos eletrônicos.
```typescript
// Exemplo 1: Registro em cartório digital
const proof = { visual: sha256(res.toImageBuffer(katex)) };
```
```typescript
// Exemplo 2: Snapshot para blockchain metadata
const nftMeta = { image_buffer: output.toImageBuffer(katex) };
```

9.  **Impressão Térmica:** Conversão de SVG para bitmaps para impressão em cupons fiscais.
```typescript
// Exemplo 1: Sharp library conversion
const png = await sharp(res.toImageBuffer(katex)).png().toBuffer();
```
```typescript
// Exemplo 2: ESC/POS printer stream
printer.printImageBuffer(output.toImageBuffer(katex));
```

10. **Watermarking:** Inclusão do rastro matemático como marca d'água em documentos digitais.
```typescript
// Exemplo 1: Jimp overlay
image.composite(await Jimp.read(res.toImageBuffer(katex)), 0, 0);
```
```typescript
// Exemplo 2: Canvas watermark
ctx.drawImage(await loadSvg(output.toImageBuffer(katex)), 10, 10);
```

## 🛠️ Opções Permitidas (`OutputOptions`)

| Opção | Tipo | Descrição | Impacto no Output |
| :--- | :--- | :--- | :--- |
| `decimalPrecision` | `number` | Precisão do valor na imagem. | Define quantas casas decimais aparecerão no SVG. |

## 💡 Recomendações
- **Use SVG para escalabilidade.** Por ser vetorial, a imagem nunca perde qualidade, independentemente do zoom.
- **Combine com `toAuditTrace`.** Salve o JSON para a máquina e o SVG para o humano.

## 🏗️ Considerações de Engenharia
- **ForeignObject Support:** O SVG utiliza `foreignObject` para embutir HTML/CSS do KaTeX. Note que alguns visualizadores de imagem muito antigos podem ter dificuldade em renderizar este recurso específico (embora browsers modernos e PDFs funcionem perfeitamente).
- **Encoding Eficiente:** O retorno como `Uint8Array` economiza ciclos de conversão se o destino for um buffer de escrita.
