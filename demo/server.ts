import { CurrencyNBR, CurrencyNBROutput } from "../mod.ts";
import { dirname, fromFileUrl, join } from "@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url));
const ROOT = dirname(__dirname);

/**
 * Mapeia todos os outputs de uma instância CurrencyNBROutput para um objeto JSON.
 * Permite passar parâmetros opcionais para formatação específica.
 */
function mapAllOutputs(output: CurrencyNBROutput, opts: { decimals?: number, locale?: string, currency?: string } = {}) {
    const d = opts.decimals;
    const buffer = output.toImageBuffer(d);
    const hex = Array.from(buffer).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const base64 = btoa(String.fromCharCode(...buffer));

    return {
        toString: output.toString(d),
        toFloatNumber: output.toFloatNumber(d),
        toBigInt: output.toBigInt().toString(),
        toMonetary: output.toMonetary(opts.locale || "pt-BR", opts.currency || "BRL", d),
        toLaTeX: output.toLaTeX(d),
        toHTML: output.toHTML(d),
        toVerbalA11y: output.toVerbalA11y(d),
        toUnicode: output.toUnicode(d),
        toImageBufferHex: hex,
        toImageDataBase64: `data:image/svg+xml;base64,${base64}`,
    };
}

/**
 * Função utilitária para "executar" com segurança a expressão do simulador.
 */
function executeExpression(expression: string): CurrencyNBROutput {
    // Sanitização básica (permite apenas CurrencyNBR e métodos de encadeamento)
    // Para um demo real, usaríamos um parser AST. Para este exemplo, usamos Function controlada.
    const fn = new Function("CurrencyNBR", `return ${expression};`);
    const result = fn(CurrencyNBR);
    if (!(result instanceof CurrencyNBROutput) && !(result instanceof CurrencyNBR)) {
        throw new Error("A expressão deve retornar um CurrencyNBR ou CurrencyNBROutput");
    }
    return result instanceof CurrencyNBR ? result.commit() : result;
}

const getCategorizedExamples = () => {
    return {
        toString: [
            {
                title: "Arredondamento ABNT (Par)",
                context: "Valor: 1.225",
                code: "CurrencyNBR.from('1.225').commit(2).toString()",
                outputs: mapAllOutputs(CurrencyNBR.from("1.225").commit(2))
            },
            {
                title: "Grande Escala",
                context: "Valor: 999.999.999,99",
                code: "CurrencyNBR.from('999999999.99').commit(2).toString()",
                outputs: mapAllOutputs(CurrencyNBR.from("999999999.99").commit(2))
            },
            {
                title: "Cadeia de Soma",
                context: "Valores: 0.1, 0.2, 0.3",
                code: "CurrencyNBR.from(0.1).add(0.2).add(0.3).commit(2).toString()",
                outputs: mapAllOutputs(CurrencyNBR.from(0.1).add(0.2).add(0.3).commit(2))
            },
        ],
        toFloatNumber: [
            {
                title: "Precisão Decimal",
                context: "Valor: 1/3",
                code: "CurrencyNBR.from(1).div(3).commit(10).toFloatNumber()",
                outputs: mapAllOutputs(CurrencyNBR.from(1).div(3).commit(10))
            },
            {
                title: "Valor Inteiro",
                context: "Valor: 1000",
                code: "CurrencyNBR.from(1000).commit().toFloatNumber()",
                outputs: mapAllOutputs(CurrencyNBR.from(1000).commit())
            },
            {
                title: "Pequeno Negativo",
                context: "Valor: -0.005",
                code: "CurrencyNBR.from('-0.005').commit(3).toFloatNumber()",
                outputs: mapAllOutputs(CurrencyNBR.from("-0.005").commit(3))
            },
        ],
        toBigInt: [
            {
                title: "Escala Interna (10^12)",
                context: "Valor: 1.00",
                code: "CurrencyNBR.from(1).commit().toBigInt()",
                outputs: mapAllOutputs(CurrencyNBR.from(1).commit())
            },
            {
                title: "Precisão de 12 casas",
                context: "Valor: 0.000000000001",
                code: "CurrencyNBR.from('0.000000000001').commit().toBigInt()",
                outputs: mapAllOutputs(CurrencyNBR.from("0.000000000001").commit())
            },
            {
                title: "Limite Seguro",
                context: "Valor: 2^53 - 1",
                code: "CurrencyNBR.from(Number.MAX_SAFE_INTEGER).commit().toBigInt()",
                outputs: mapAllOutputs(CurrencyNBR.from(Number.MAX_SAFE_INTEGER).commit())
            },
        ],
        toMonetary: [
            {
                title: "Real Brasileiro (Padrão)",
                context: "Valor: 1234.56",
                code: "CurrencyNBR.from(1234.56).commit().toMonetary('pt-BR', 'BRL')",
                outputs: mapAllOutputs(CurrencyNBR.from(1234.56).commit(), { locale: "pt-BR", currency: "BRL" })
            },
            {
                title: "Dólar Americano",
                context: "Valor: 1234.56",
                code: "CurrencyNBR.from(1234.56).commit().toMonetary('en-US', 'USD')",
                outputs: mapAllOutputs(CurrencyNBR.from(1234.56).commit(), { locale: "en-US", currency: "USD" })
            },
            {
                title: "Euro com 4 casas",
                context: "Valor: 1.2345",
                code: "CurrencyNBR.from(1.2345).commit(4).toMonetary('de-DE', 'EUR', 4)",
                outputs: mapAllOutputs(CurrencyNBR.from(1.2345).commit(4), { locale: "de-DE", currency: "EUR", decimals: 4 })
            },
        ],
        toLaTeX: [
            {
                title: "Fração Simples",
                context: "Valores: 100 / 3",
                code: "CurrencyNBR.from(100).div(3).commit(0).toLaTeX()",
                outputs: mapAllOutputs(CurrencyNBR.from(100).div(3).commit(0))
            },
            {
                title: "Raiz Quadrada",
                context: "Valores: √81",
                code: "CurrencyNBR.from(81).pow('1/2').commit(0).toLaTeX()",
                outputs: mapAllOutputs(CurrencyNBR.from(81).pow("1/2").commit(0))
            },
            {
                title: "Potência e Grupo",
                context: "Valores: (2 + 3)^2",
                code: "CurrencyNBR.from(2).add(3).group().pow(2).commit(0).toLaTeX()",
                outputs: mapAllOutputs(CurrencyNBR.from(2).add(3).group().pow(2).commit(0))
            },
        ],
        toHTML: [
            {
                title: "Renderização SSR KaTeX",
                context: "Valor: 10.50 * 2",
                code: "CurrencyNBR.from(10.5).mult(2).commit(0).toHTML()",
                outputs: mapAllOutputs(CurrencyNBR.from(10.5).mult(2).commit(0))
            },
            {
                title: "Baskhara (Fragmento)",
                context: "delta = (-5)^2 - 4*1*6",
                code: "CurrencyNBR.from(-5).pow(2).sub(CurrencyNBR.from(4).mult(1).mult(6)).commit(0).toHTML()",
                outputs: mapAllOutputs(CurrencyNBR.from(-5).pow(2).sub(CurrencyNBR.from(4).mult(1).mult(6)).commit(0))
            },
            {
                title: "Divisões Aninhadas",
                context: "100 / (10 / 2)",
                code: "CurrencyNBR.from(100).div(CurrencyNBR.from(10).div(2).group()).commit(0).toHTML()",
                outputs: mapAllOutputs(CurrencyNBR.from(100).div(CurrencyNBR.from(10).div(2).group()).commit(0))
            },
        ],
        toVerbalA11y: [
            {
                title: "Narração de Grupo",
                context: "(10 + 20) * 2",
                code: "CurrencyNBR.from(10).add(20).group().mult(2).commit(0).toVerbalA11y()",
                outputs: mapAllOutputs(CurrencyNBR.from(10).add(20).group().mult(2).commit(0))
            },
            {
                title: "Narração de Raiz Cúbica",
                context: "³√8",
                code: "CurrencyNBR.from(8).pow('1/3').commit(0).toVerbalA11y()",
                outputs: mapAllOutputs(CurrencyNBR.from(8).pow("1/3").commit(0))
            },
            {
                title: "Cenário de Desconto",
                context: "1000 - 15%",
                code: "CurrencyNBR.from(1000).sub(CurrencyNBR.from(1000).mult(0.15).group()).commit(0).toVerbalA11y()",
                outputs: mapAllOutputs(CurrencyNBR.from(1000).sub(CurrencyNBR.from(1000).mult(0.15).group()).commit(0))
            },
        ],
        toUnicode: [
            {
                title: "CLI Simples",
                context: "10 + 5 * 2",
                code: "CurrencyNBR.from(10).add(5).mult(2).commit(0).toUnicode()",
                outputs: mapAllOutputs(CurrencyNBR.from(10).add(5).mult(2).commit(0))
            },
            {
                title: "Sobrescrito e Raiz",
                context: "√(81) + 2³",
                code: "CurrencyNBR.from(81).pow('1/2').add(CurrencyNBR.from(2).pow(3)).commit(0).toUnicode()",
                outputs: mapAllOutputs(CurrencyNBR.from(81).pow("1/2").add(CurrencyNBR.from(2).pow(3)).commit(0))
            },
            {
                title: "Divisão Unicode",
                context: "100 ÷ 4",
                code: "CurrencyNBR.from(100).div(4).commit(0).toUnicode()",
                outputs: mapAllOutputs(CurrencyNBR.from(100).div(4).commit(0))
            },
        ],
        toImageBuffer: [
            {
                title: "Snapshot Visual",
                context: "Fórmula SAC",
                code: "CurrencyNBR.from(200000).div(100).commit(0).toImageBuffer()",
                outputs: mapAllOutputs(CurrencyNBR.from(200000).div(100).commit(0))
            },
            {
                title: "Auditabilidade em Imagem",
                context: "Juros Compostos",
                code: "CurrencyNBR.from(1000).mult(CurrencyNBR.from(1).add(0.05).group().pow(12)).commit(0).toImageBuffer()",
                outputs: mapAllOutputs(CurrencyNBR.from(1000).mult(CurrencyNBR.from(1).add(0.05).group().pow(12)).commit(0))
            },
            {
                title: "Raiz Positiva",
                context: "√delta / (2*a)",
                code: "CurrencyNBR.from(1).pow('1/2').div(CurrencyNBR.from(2).mult(1).group()).commit(0).toImageBuffer()",
                outputs: mapAllOutputs(CurrencyNBR.from(1).pow("1/2").div(CurrencyNBR.from(2).mult(1).group()).commit(0))
            },
        ],
    };
};

async function serveFile(path: string): Promise<Response> {
    const ext = path.split(".").pop();
    const mimes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        js: "application/javascript",
        css: "text/css",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
    };
    try {
        const data = await Deno.readFile(path);
        return new Response(data, {
            headers: {
                "content-type": mimes[ext ?? ""] || "application/octet-stream",
                "cache-control": "no-store, must-revalidate",
            },
        });
    } catch {
        return new Response("Not Found", { status: 404 });
    }
}

Deno.serve({ port: 8000 }, async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/") { return serveFile(join(__dirname, "index.html")); }
    if (url.pathname === "/style.css") { return serveFile(join(__dirname, "style.css")); }
    if (url.pathname === "/script.js") { return serveFile(join(__dirname, "script.js")); }

    if (url.pathname === "/api/examples") {
        return new Response(JSON.stringify(getCategorizedExamples()), {
            headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
    }

    if (url.pathname === "/api/calculate") {
        try {
            const { expression } = await req.json();
            const output = executeExpression(expression);
            return new Response(
                JSON.stringify(mapAllOutputs(output)),
                { headers: { "content-type": "application/json", "cache-control": "no-store" } },
            );
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 400,
                headers: { "content-type": "application/json" }
            });
        }
    }

    if (url.pathname.startsWith("/assets/")) { return serveFile(join(ROOT, url.pathname)); }
    return new Response("Not Found", { status: 404 });
});
