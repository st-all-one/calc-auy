import { CalcAUY } from "@calc-auy";
import katex from "katex";
import puppeteer from "puppeteer";
import { dirname, fromFileUrl, join } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));

async function testPngGeneration() {
    console.log("🎬 Iniciando renderização...");

    const calculation = CalcAUY.from(144)
        .pow("1/2")
        .div(2)
        .add(CalcAUY.from(5).pow(2)).pow("7/3")
        .commit({ roundStrategy: "NBR5891" });

    const html = calculation.toHTML(katex, { decimalPrecision: 2 });

    console.log("🌐 Lançando navegador...");
    const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 4 });

        console.log("📝 Injetando conteúdo...");
        await page.setContent(`
            <div id="target" style="display:inline-block; padding:20px; background:white; font-family:sans-serif;">
                ${html}
            </div>
        `);

        // Pequena pausa para garantir o parse do CSS inlined
        await new Promise((r) => setTimeout(r, 500));

        console.log("📸 Gerando screenshot...");
        const element = await page.$("#target");
        const outputPath = join(__dirname, "test_result.png");

        if (element) {
            await element.screenshot({ path: outputPath });
            console.log(`✅ Sucesso: ${outputPath}`);
        }
    } finally {
        await browser.close();
        console.log("🏁 Processo finalizado.");
    }
}

if (import.meta.main) {
    testPngGeneration().catch((e) => {
        console.error("❌ Erro fatal:", e.message);
        Deno.exit(1);
    });
}
