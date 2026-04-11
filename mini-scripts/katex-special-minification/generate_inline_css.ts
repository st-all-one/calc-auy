
import { encodeBase64 } from "@std/encoding/base64";
import { join, dirname, fromFileUrl } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));
const FONTS_DIR = join(__dirname, "fonts");
const CSS_FILE = join(__dirname, "katex.css");

const requestedFonts = [
  "KaTeX_Main-Regular.woff2",
  "KaTeX_Size1-Regular.woff2",
  "KaTeX_Size2-Regular.woff2",
  "KaTeX_Size3-Regular.woff2",
  "KaTeX_Size4-Regular.woff2",
  "KaTeX_AMS-Regular.woff2",
  "KaTeX_Math-Italic.woff2",
];

async function generate() {
  const fontData = new Map<string, string>();
  for (const font of requestedFonts) {
    const data = await Deno.readFile(`${FONTS_DIR}/${font}`);
    const b64 = encodeBase64(data);
    fontData.set(font, `data:font/woff2;base64,${b64}`);
  }

  let css = await Deno.readTextFile(CSS_FILE);

  // 1. Extract and process @font-face blocks
  const fontFaceRegex = /@font-face\s*{[^}]*}/g;
  const fontFaceBlocks = css.match(fontFaceRegex) || [];
  const processedFontFaces: string[] = [];

  for (const block of fontFaceBlocks) {
    let keep = false;
    let newBlock = block;
    for (const [font, dataUri] of fontData.entries()) {
      if (block.includes(font)) {
        keep = true;
        // Replace src: url(...) format(...) with just our data uri
        // We target specifically the woff2 part and discard others for minimalism
        newBlock = newBlock.replace(/src:\s*url\([^)]+\)\s*format\("woff2"\)[^;]*/, `src: url(${dataUri}) format("woff2")`);
        // Remove trailing commas if any from discarded formats (woff/ttf)
        newBlock = newBlock.replace(/format\("woff2"\)\s*,\s*url\([^)]+\)\s*format\("[^"]+"\)/g, `format("woff2")`);
        break;
      }
    }
    if (keep) {
      processedFontFaces.push(newBlock);
    }
  }

  // 2. Remove all @font-face from original CSS to avoid duplicates or unused fonts
  css = css.replace(fontFaceRegex, "");

  // 3. Minify
  function minify(c: string) {
    return c
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
      .replace(/\s+/g, " ")             // Collapse whitespace
      .replace(/\s*([{:;])\s*/g, "$1")  // Remove spaces around delimiters
      .replace(/;}/g, "}")              // Remove last semicolon in block
      .trim();
  }

  const minifiedFontFaces = processedFontFaces.map(minify).join("");
  const minifiedBody = minify(css);

  const finalCss = minifiedFontFaces + minifiedBody;
  
  // Salva o resultado em um arquivo na mesma pasta
  const outputPath = join(__dirname, "katex_inlined.min.css");
  await Deno.writeTextFile(outputPath, finalCss);
  
  console.log(`✅ CSS inlined gerado com sucesso em: ${outputPath}`);
}

if (import.meta.main) {
  generate();
}
