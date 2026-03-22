// Utilitário para atualizar a seção interativa
function updateInteractiveDisplay(data) {
  const container = document.getElementById("interactive-outputs");
  if (!container) return;

  const mapping = {
    toString: data.toString,
    toFloatNumber: data.toFloatNumber,
    toBigInt: data.toBigInt,
    toMonetary: data.toMonetary,
    toLaTeX: data.toLaTeX,
    toUnicode: data.toUnicode,
    toVerbalA11y: data.toVerbalA11y,
    toHTML: data.toHTML,
    toImageBuffer: `
      <div class="binary-view">${data.toImageBufferHex}</div>
      <img src="${data.toImageDataBase64}" alt="Renderização visual do resultado" class="image-result">
    `,
  };

  for (const [key, val] of Object.entries(mapping)) {
    const item = container.querySelector(`[data-type="${key}"]`);
    if (item) {
      const valEl = item.querySelector(".val, .val-math, .img-preview");
      if (valEl) valEl.innerHTML = val;
    }
  }
}

// Carregar e categorizar exemplos
async function loadExamples() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  try {
    const response = await fetch("/api/examples");
    const categories = await response.json();
    container.innerHTML = "";

    const methodTitles = {
      toString: "2. Exemplos do toString()",
      toFloatNumber: "3. Exemplos do toFloatNumber()",
      toBigInt: "4. Exemplos do toBigInt()",
      toMonetary: "5. Exemplos do toMonetary()",
      toLaTeX: "6. Exemplos do toLaTeX()",
      toHTML: "7. Exemplos do toHTML()",
      toVerbalA11y: "8. Exemplos do toVerbalA11y()",
      toUnicode: "9. Exemplos do toUnicode()",
      toImageBuffer: "10. Exemplos do toImageBuffer()",
    };

    for (const [method, examples] of Object.entries(categories)) {
      const section = document.createElement("section");
      section.id = `sec-${method}`;
      section.innerHTML = `<h2>${methodTitles[method]}</h2>`;
      
      const grid = document.createElement("div");
      grid.className = "grid";

      examples.forEach((ex) => {
        const article = document.createElement("article");
        article.className = "card";
        
        let resultView = "";
        if (method === "toImageBuffer") {
          resultView = `
            <div class="binary-view-small">${ex.outputs.toImageBufferHex}</div>
            <div class="card-img-preview">
              <img src="${ex.outputs.toImageDataBase64}" alt="Image Result">
            </div>
          `;
        } else if (method === "toHTML") {
          resultView = `<div class="card-math-render">${ex.outputs.toHTML}</div>`;
        } else {
          resultView = `<div class="card-result-text">${ex.outputs[method]}</div>`;
        }

        article.innerHTML = `
          <h3>${ex.title}</h3>
          <p class="context"><strong>Contexto:</strong> ${ex.context}</p>
          <div class="card-code"><code>${ex.code}</code></div>
          <div class="result-label">Resultado (${method}):</div>
          <div class="result-area">${resultView}</div>
        `;
        grid.appendChild(article);
      });

      section.appendChild(grid);
      container.appendChild(section);
    }
  } catch (err) {
    container.innerHTML = `<p class="error">Erro ao carregar exemplos: ${err.message}</p>`;
  }
}

// Formulário de simulação
const simulationForm = document.getElementById("f");
if (simulationForm) {
  simulationForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = simulationForm.querySelector("button");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processando...";

    const payload = {
      expression: document.getElementById("expr").value,
    };

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}

document.addEventListener("DOMContentLoaded", loadExamples);
