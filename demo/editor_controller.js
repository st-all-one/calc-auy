import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { autocompletion, snippet } from "@codemirror/autocomplete";

// Configuração do Editor
const _readOnlyCompartment = new Compartment();

// Texto inicial fixo
const _FIXED_START = 'CurrencyNBR.from("';
const _FIXED_END = '").commit(2)';
const _INITIAL_CONTENT = `50000.00")\n// Adicione suas operações abaixo:\n.mult("1.05")\n.add("100.00")`;

// A estrutura visual será:
// CurrencyNBR.from(" [CONTEUDO EDITAVEL] ").commit(2)
// Mas para facilitar a edição e o chaining, vamos permitir que o usuário edite o "meio".
// Vamos bloquear a primeira linha PARCIALMENTE? O CodeMirror permite bloquear faixas (ranges).

// Vamos simplificar:
// Linha 1: CurrencyNBR.from(" (Bloqueado)
// Usuário digita: 50000.00
// Linha 1 (fim): ") (Bloqueado? Talvez não, o usuário pode querer fechar de outra forma, mas o prompt diz 'CurrencyNBR.from(' inalterável)
// Vamos bloquear APENAS o `CurrencyNBR.from("` inicial e o `.commit(2)` final.

let editorView;

export function initEditor(containerId) {
  const parent = document.getElementById(containerId);
  if (!parent) return;

  // Estado inicial
  const startDoc = `${_FIXED_START}50000.00")
  .add("1000.00")
  .group()
  .mult("0.10")
${// Espaço reservado
    ""}
// Fim da cadeia
.commit(2)`;

  const extensions = [
    basicSetup,
    javascript(),
    keymap.of(defaultKeymap),
    autocompletion({
      override: [customCompletions]
    }),
    EditorView.theme({
      "&": { height: "300px", fontSize: "14px", border: "1px solid #ddd" },
      ".cm-scroller": { overflow: "auto" },
      ".cm-gutters": { backgroundColor: "#f5f5f5", borderRight: "1px solid #ddd" }
    }),
    // Extensão para faixas somente leitura
    readOnlyRangesExtension(startDoc)
  ];

  editorView = new EditorView({
    doc: startDoc,
    extensions: extensions,
    parent: parent
  });
}

// Definição das faixas somente leitura
function readOnlyRangesExtension(docText) {
  return EditorState.readOnly.of((state) => {
    // Bloqueia o início: CurrencyNBR.from("
    // Bloqueia o final: .commit(2)
    return [];
  });
}

// Filtro de alterações para impedir edição das partes fixas
const readOnlyFilter = EditorState.changeFilter.of((tr) => {
  // Se não há mudanças no documento (ex: apenas seleção), permite
  if (tr.changes.empty) return true;

  const doc = tr.startState.doc;
  const docString = doc.toString();

  const startFixed = 'CurrencyNBR.from("';
  const startLen = startFixed.length;

  const endFixed = '.commit(';
  const endIdx = docString.lastIndexOf(endFixed);

  if (endIdx === -1) return false;

  let allowed = true;
  tr.changes.iterChanges((fromA, toA) => {
    // Se a mudança toca no prefixo [0, startLen]
    if (fromA < startLen) allowed = false;

    // Se a mudança toca no sufixo [endIdx, doc.length]
    if (toA > endIdx) allowed = false;
  });

  return allowed;
});

// Completions personalizados
function customCompletions(context) {
  // 1. Sugestão para o início (CurrencyNBR.from)
  const word = context.matchBefore(/\w*/);
  if (word && (word.from != word.to || context.explicit)) {
    if ("CurrencyNBR".startsWith(word.text)) {
      return {
        from: word.from,
        options: [
          {
            label: "CurrencyNBR.from",
            type: "function",
            apply: snippet('CurrencyNBR.from("${valor}")'),
            detail: '(valor)',
            info: 'Inicia um novo cálculo com o valor fornecido'
          }
        ]
      };
    }
  }

  // 2. Sugestão para métodos encadeados (ao digitar ".")
  const dotWord = context.matchBefore(/\.\w*/);
  if (dotWord && (dotWord.from != dotWord.to || context.explicit)) {
    return {
      from: dotWord.from,
      options: [
        { label: ".add", type: "method", apply: snippet('.add("${valor}")'), info: "Adiciona um valor" },
        { label: ".sub", type: "method", apply: snippet('.sub("${valor}")'), info: "Subtrai um valor" },
        { label: ".mult", type: "method", apply: snippet('.mult("${valor}")'), info: "Multiplica pelo valor" },
        { label: ".div", type: "method", apply: snippet('.div("${valor}")'), info: "Divide pelo valor" },
        { label: ".pow", type: "method", apply: snippet('.pow("${valor}")'), info: "Potência ou Raiz" },
        { label: ".group", type: "method", apply: snippet('.group()'), info: "Agrupa operações (parênteses)" },
        { label: ".mod", type: "method", apply: snippet('.mod("${valor}")'), info: "Resto da divisão" },
        { label: ".divInt", type: "method", apply: snippet('.divInt("${valor}")'), info: "Divisão inteira" }
      ]
    };
  }

  return null;
}


// Recriar setupEditor com suporte a mudança de tema reativa
export function setupEditor(containerId) {
  const parent = document.getElementById(containerId);
  if (!parent) return;

  parent.innerHTML = ""; // Limpa container

  const themeCompartment = new Compartment();

  const startCode = `
    CurrencyNBR.from("1234567.89")
        .pow("353/1141")
        .add(
            CurrencyNBR.from(0.00123).div(
                CurrencyNBR.from(7)
                            .div(11)
            ).group()
            .pow(9)
        )
        .mult(
            CurrencyNBR.from(3)
            .div(
                CurrencyNBR.from(7)
                           .div(13)
            )
            .pow("999/135")
        )
        .group().div(CurrencyNBR.from(0.0123).div(
                CurrencyNBR.from(0.007).pow("81/46")
            ).group()).pow("49/189")
      .commit(2)`;

  const getTheme = () => EditorView.theme({
    "&": { height: "100%", fontSize: "16px", border: "none", background: "#fcfcfc" },
    ".cm-content, .cm-scroller": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: "12px", color: "#1a1a1a !important" },
    ".cm-gutters": { backgroundColor: "#f1f5f9", borderRight: "1px solid var(--primary)", color: "#64748b" },
    ".cm-activeLine": { backgroundColor: "rgba(0, 51, 102, 0.04)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(0, 51, 102, 0.08)", color: "var(--primary)" },
    "&.cm-focused": { outline: "none" }
  });

  editorView = new EditorView({
    doc: startCode,
    extensions: [
      basicSetup,
      javascript(),
      keymap.of(defaultKeymap),
      autocompletion({ override: [customCompletions] }),
      readOnlyFilter,
      themeCompartment.of(getTheme())
    ],
    parent: parent
  });

  // Listener para mudança de tema via postMessage (Ignora dark mode para manter legibilidade do editor)
  window.addEventListener("message", (event) => {
    if (event.data.type === "THEME_CHANGE") {
      editorView.dispatch({
        effects: themeCompartment.reconfigure(getTheme())
      });
    }
  });
}

export function getUserCode() {
  if (!editorView) return null;
  const code = editorView.state.doc.toString();

  // 1. Validar Estrutura Básica
  if (!code.startsWith('CurrencyNBR.from("')) {
    throw new Error("O código deve começar com 'CurrencyNBR.from(\"'");
  }
  if (!code.includes('.commit(')) {
    throw new Error("O código deve terminar com '.commit(...)'");
  }

  // 2. Validar Limite de Operações (Max 16 métodos principais)
  const methodRegex = /\.(add|sub|mult|div|pow|mod|divInt|group)\b/g;
  const matches = code.match(methodRegex);
  const count = matches ? matches.length : 0;

  if (count > 16) {
    throw new Error(`Limite de operações excedido. Máximo: 16. Encontrado: ${count}.`);
  }

  return code;
}
