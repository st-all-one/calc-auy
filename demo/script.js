// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Utilitário para destacar metadados no JSON
function highlightMetadata(jsonStr) {
    if (typeof jsonStr !== "string") return jsonStr;
    return jsonStr.replace(/"metadata":\s*{[\s\S]*?}/g, (match) => {
        return `<mark class="metadata-marker">${match}</mark>`;
    });
}

// Utilitário para atualizar a seção interativa
function updateInteractiveDisplay(data) {
    const container = document.getElementById("interactive-outputs");
    if (!container) { return; }

    const mapping = {
        toString: data.toString,
        toRawInternalNumber: data.toRawInternalNumber,
        toScaledBigInt: data.toScaledBigInt,
        toMonetary: data.toMonetary,
        toLaTeX: data.toLaTeX,
        toUnicode: data.toUnicode,
        toVerbalA11y: data.toVerbalA11y,
        toMermaidGraph: `<pre class="mermaid-view">${data.toMermaidGraph}</pre>`,
        toCustomOutput: `
            <div class="processor-info"><strong>Processor:</strong> <code>${data.toCustomOutputProcessor}</code></div>
            <div class="custom-val">${data.toCustomOutput}</div>
        `,
        toSliceDemo: data.toSliceDemo,
        toSliceByRatioDemo: data.toSliceByRatioDemo,
        toAuditTrace: (function () {
            try {
                const parsed = typeof data.toAuditTrace === 'string' ? JSON.parse(data.toAuditTrace) : data.toAuditTrace;
                let json = JSON.stringify(parsed, null, 2);
                return `<div class="json-view forensic-trace">${highlightMetadata(json)}</div>`;
            } catch (e) {
                return data.toAuditTrace;
            }
        })(),
        toJson: (function () {
            if (!data.toJson) return '';
            try {
                const parsed = typeof data.toJson === 'string' ? JSON.parse(data.toJson) : data.toJson;
                return `<div class="json-view">${JSON.stringify(parsed, null, 2)}</div>`;
            } catch (e) {
                console.error("Erro no JSON interativo:", e);
                return `<div class="json-view error">Erro no formato JSON</div>`;
            }
        })(),
        toImageBuffer: `
      <div class="image-output-wrapper">
        <img src="${data.toImageDataBase64}" alt="Renderização visual do resultado" class="image-result">
      </div>
    `,
    };

    for (const [key, val] of Object.entries(mapping)) {
        const item = container.querySelector(`[data-type="${key}"]`);
        if (item) {
            const valEl = item.querySelector(".val, .val-math, .img-preview");
            if (valEl) { valEl.innerHTML = val; }
        }
    }

    const htmlOutput = document.getElementById("html-output");
    if (htmlOutput && data.toHTML) {
        htmlOutput.innerHTML = data.toHTML;
    }
}

const methodTitles = {
    "add/sub": "Soma/Sub",
    "mult/div": "Mult/Div",
    "div": "Div Racional",
    "pow": "Pot/Raiz",
    "mod/divInt": "Mod/DivInt",
    "group": "Agrupamento",
    "parser": "Parser",
    "metadata": "Metadados",
    "hibernate/hydrate": "Persistência",
    "string/monetary": "Texto/Moeda",
    "scaledBigInt": "BigInt",
    "unicode/html": "Unicode/HTML",
    "LaTeX/rawInternalBigInt": "LaTeX/Bits",
    "verbalA11y": "Voz (A11y)",
    "customOutput": "Custom",
    "auditTrace": "Auditoria",
    "audit": "JSON",
    "imageBuffer": "Imagem",
    "Visual Audit (Mermaid)": "Visual Audit",
    "Rounding Strategies": "Rounding",
    "Cross-Context Audit": "Cross-Context",
    "Integrity Validation": "Integrity",
};

function renderCategory(examplesByKey, container, navList) {
    for (const [key, examples] of Object.entries(examplesByKey)) {
        const sectionId = `sec-${key.replace("/", "-")}`;

        // Adiciona à barra lateral
        if (navList) {
            const li = document.createElement("li");
            li.innerHTML = `<a href="#${sectionId}">${methodTitles[key] || key}</a>`;
            navList.appendChild(li);
        }

        const section = document.createElement("section");
        section.id = sectionId;
        section.innerHTML = `<h2>${methodTitles[key] || key}</h2>`;

        const grid = document.createElement("div");
        grid.className = "grid";

        examples.forEach((ex) => {
            const article = document.createElement("article");
            article.className = examples.length === 1 ? "card full-width" : "card";

            let resultView = "";
            const res = ex.result;

            if (res === null || res === undefined) {
                resultView = `<div class="card-result-text">--</div>`;
            } else if (typeof res === "string") {
                if (res.startsWith("data:image")) {
                    resultView = `<img src="${res}" alt="Resultado visual" class="image-result">`;
                } else if (res.includes("calc-auy-result")) {
                    resultView = `<div class="card-math-render">${res}</div>`;
                } else if (res.startsWith("{") || res.startsWith("[")) {
                    resultView = `<div class="json-view">${highlightMetadata(res)}</div>`;
                } else {
                    resultView = `<div class="card-result-text">${res}</div>`;
                }
                } else if (typeof res === "number") {
                resultView = `<div class="card-result-text">${res.toString()}</div>`;
            } else {
                resultView = `<div class="card-result-text">${JSON.stringify(res)}</div>`;
            }

            const processorHtml = ex.customProcessor
                ? `<div class="processor-info"><strong>Processor:</strong> <code>${ex.customProcessor}</code></div>`
                : "";

            article.innerHTML = `
                <h3>${ex.title}</h3>
                <p class="context"><strong>Contexto:</strong> ${ex.context}</p>
                <div class="card-code"><code>${ex.code}</code></div>
                <div class="result-label">Resultado:</div>
                <div class="result-area">
                    ${processorHtml}
                    ${resultView}
                </div>
            `;
            grid.appendChild(article);
        });

        section.appendChild(grid);
        container.appendChild(section);
    }
}

async function loadExamples() {
    const container = document.getElementById("categories-container");
    const navLinks = document.querySelector(".nav-links");
    if (!container || !navLinks) { return; }

    try {
        const response = await fetch("/api/examples");
        const data = await response.json();

        if (data.common_css) {
            let styleTag = document.getElementById("katex-common-styles");
            if (!styleTag) {
                styleTag = document.createElement("style");
                styleTag.id = "katex-common-styles";
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = data.common_css;
        }

        container.innerHTML = "";

        // Limpa a barra lateral (mantendo apenas o Interactive)
        navLinks.innerHTML = '<li><a href="#sec-interactive">Interactive</a></li>';

        const groupConfigs = [
            { id: "operations", title: "Cálculo" },
            { id: "audit", title: "Auditoria" },
            { id: "outputs", title: "Output" }
        ];

        groupConfigs.forEach(group => {
            if (data[group.id] && Object.keys(data[group.id]).length > 0) {
                // Adiciona Título do Grupo no Nav
                const navHeader = document.createElement("li");
                navHeader.className = "nav-group-title";
                navHeader.textContent = group.title;
                navLinks.appendChild(navHeader);

                // Adiciona Título do Grupo no Conteúdo
                const header = document.createElement("h1");
                header.className = "group-main-header";
                header.textContent = group.title;
                container.appendChild(header);

                renderCategory(data[group.id], container, navLinks);
            }
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p class="error">Erro ao carregar exemplos: ${err.message}</p>`;
    }
}

let codePromiseResolve = null;

function init() {
    const htmlEl = document.documentElement;
    const currentTheme = htmlEl.getAttribute("data-theme") || "light";

    const darkModeBtn = document.getElementById("modo-escuro");
    if (darkModeBtn) {
        const isDark = currentTheme === "dark";
        darkModeBtn.setAttribute("aria-pressed", isDark);
        darkModeBtn.querySelector("span").textContent = isDark ? "☾" : "☼";
    }

    const contrastBtn = document.getElementById("alto-contraste");
    if (contrastBtn) {
        const isContrast = htmlEl.classList.contains("alto-contraste-init")
            || document.body.classList.contains("alto-contraste");

        if (isContrast) {
            document.body.classList.add("alto-contraste");
            contrastBtn.setAttribute("aria-pressed", "true");
        }
        htmlEl.classList.remove("alto-contraste-init");
    }

    loadExamples();

    globalThis.addEventListener("message", (event) => {
        if (event.data.type === "CODE_RESPONSE") {
            if (codePromiseResolve) {
                codePromiseResolve(event.data.code);
                codePromiseResolve = null;
            }
        } else if (event.data.type === "CODE_ERROR") {
            if (codePromiseResolve) {
                alert(event.data.error);
                codePromiseResolve(null);
                codePromiseResolve = null;
            }
        } else if (event.data.type === "EDITOR_READY") {
            const iframe = document.getElementById("editor-iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "THEME_CHANGE", theme: htmlEl.getAttribute("data-theme") },
                    "*",
                );
            }
        }
    });

    const btnExecutar = document.getElementById("btn-executar");
    if (btnExecutar) {
        btnExecutar.addEventListener("click", async () => {
            const originalText = btnExecutar.textContent;
            const iframe = document.getElementById("editor-iframe");

            if (!iframe || !iframe.contentWindow) { return; }

            const expression = await new Promise((resolve) => {
                codePromiseResolve = resolve;
                iframe.contentWindow.postMessage({ type: "GET_CODE" }, "*");
                setTimeout(() => {
                    if (codePromiseResolve === resolve) {
                        codePromiseResolve(null);
                        codePromiseResolve = null;
                        alert("O editor não respondeu.");
                    }
                }, 2000);
            });

            if (!expression) { return; }

            btnExecutar.disabled = true;
            btnExecutar.textContent = "Processando...";

            try {
                const response = await fetch("/api/calculate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "CalcAUD-Demo",
                    },
                    body: JSON.stringify({ expression }),
                });
                const data = await response.json();
                if (data.error) {
                    alert("Erro na expressão: " + data.error);
                } else {
                    updateInteractiveDisplay(data);
                }
            } catch (err) {
                console.error("Erro no cálculo:", err);
                alert("Erro ao conectar com o servidor.");
            } finally {
                btnExecutar.disabled = false;
                btnExecutar.textContent = originalText;
            }
        });
    }

    if (darkModeBtn) {
        darkModeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const theme = htmlEl.getAttribute("data-theme");
            const newTheme = theme === "dark" ? "light" : "dark";

            htmlEl.setAttribute("data-theme", newTheme);
            try {
                localStorage.setItem("theme", newTheme);
            } catch (_e) { }

            const isDark = newTheme === "dark";
            darkModeBtn.setAttribute("aria-pressed", isDark);
            darkModeBtn.querySelector("span").textContent = isDark ? "☾" : "☼";

            const iframe = document.getElementById("editor-iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type: "THEME_CHANGE", theme: newTheme }, "*");
            }
        });
    }

    if (contrastBtn) {
        contrastBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isPressed = contrastBtn.getAttribute("aria-pressed") === "true";
            document.body.classList.toggle("alto-contraste");
            contrastBtn.setAttribute("aria-pressed", !isPressed);
            try {
                localStorage.setItem("altoContraste", !isPressed);
            } catch (_e) { }
        });
    }
}

if (document.readyState === "complete") {
    init();
} else {
    globalThis.addEventListener("load", init);
}
