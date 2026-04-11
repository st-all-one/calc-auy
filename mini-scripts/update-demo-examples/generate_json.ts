
import { manualExamples } from "./manual-examples.ts";
import { KATEX_CSS_MINIFIED } from "../../src/core/constants.ts";
import { join, dirname, fromFileUrl } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));
const OUTPUT_FILE = join(__dirname, "..", "..", "demo", "data", "precalculated_examples.json");

async function generate() {
    console.log("🛠️  Compilando exemplos manuais...");

    const finalData: any = {
        // CSS Único para todos os exemplos HTML
        common_css: KATEX_CSS_MINIFIED + ".calc-auy-result { display: inline-block; margin: 0.5em 0; overflow-x: auto; }",
        operations: {},
        outputs: {}
    };

    for (const ex of manualExamples) {
        console.log(`Adding: [${ex.group}] ${ex.title}...`);
        
        const exampleEntry = {
            title: ex.title,
            context: ex.context,
            code: ex.code,
            result: ex.result
        };

        if (!finalData[ex.group][ex.key]) {
            finalData[ex.group][ex.key] = [];
        }
        finalData[ex.group][ex.key].push(exampleEntry);
    }

    await Deno.writeTextFile(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\n🎉 JSON Compilado: ${OUTPUT_FILE}`);
}

if (import.meta.main) {
    generate().catch(console.error);
}
