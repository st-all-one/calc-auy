import { CalcAUY, type CalcAUYError } from "../../mod.ts";

/**
 * CalcAUY Front-end Demo Engine
 * 2026 - Licensed under MPL-2.0
 */

// Expose to browser global scope
(globalThis as any).CalcAUY = CalcAUY;

/**
 * Executes a sample calculation using CalcAUY directly in the browser.
 */
(globalThis as any).runDemo = () => {
    const outputEl = document.getElementById("resultado");
    if (!outputEl) { return; }

    outputEl.innerHTML = "<em>Calculando localmente...</em>";

    try {
        // Exemplo de cálculo: (100 + 50.50) * 2.5
        const res = CalcAUY.from(100)
            .add(50.50)
            .mult("2.5")
            .setMetadata("origin", "browser_demo")
            .commit();

        outputEl.innerHTML = `
            <div style="margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                <strong>Resultado Processado no Navegador:</strong>
            </div>
            <p><strong>Valor Numérico:</strong> ${res.toString()}</p>
            <p><strong>Formatação Monetária:</strong> ${res.toMonetary({ locale: "pt-BR" })}</p>
            <p><strong>Acessibilidade (Voz):</strong> <em>"${res.toVerbalA11y({ locale: "pt-BR" })}"</em></p>
            <p><strong>LaTeX (para renderização):</strong> <code>${res.toLaTeX()}</code></p>
            <p><strong>Unicode:</strong> ${res.toUnicode()}</p>
            <div style="margin-top: 15px; padding: 10px; background: #f0f4f8; border-radius: 4px; border-left: 4px solid var(--primary);">
                <strong>Renderização toHTML():</strong><br>
                ${res.toHTML((globalThis as any).katex)}
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #fff; border: 1px solid #ccc; border-radius: 4px;">
                <strong>Rastro de Auditoria (toAuditTrace):</strong>
                <pre style="font-size: 0.8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${
            JSON.stringify(JSON.parse(res.toAuditTrace()), null, 2)
        }</pre>
            </div>
            <hr>
            <small>Este cálculo foi executado sem nenhuma chamada de rede ao servidor após o carregamento inicial da página.</small>
        `;
    } catch (error) {
        outputEl.innerHTML = `<p style="color:red"><strong>Erro no Cálculo:</strong> ${
            (error as CalcAUYError).message
        }</p>`;
    }
};

console.log("CalcAUY Browser Demo carregada e pronta.");
