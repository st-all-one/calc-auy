import { join, dirname, fromFileUrl } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));
const root = join(__dirname, "..", ".."); 
const constantsPath = join(root, "src", "core", "constants.ts");
const minifiedCssPath = join(__dirname, "katex_inlined.min.css");

const minifiedCss = await Deno.readTextFile(minifiedCssPath);
let constantsContent = await Deno.readTextFile(constantsPath);

const regex = /export const KATEX_CSS_MINIFIED =\s*`[^]*?`;/;
const newDeclaration = `export const KATEX_CSS_MINIFIED =\n    \`${minifiedCss}\`;`;

if (regex.test(constantsContent)) {
  constantsContent = constantsContent.replace(regex, newDeclaration);
  await Deno.writeTextFile(constantsPath, constantsContent);
  console.log("src/core/constants.ts updated successfully.");
} else {
  console.error("Could not find KATEX_CSS_MINIFIED declaration in src/core/constants.ts");
  Deno.exit(1);
}
