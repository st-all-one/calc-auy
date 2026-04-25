// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { basicSetup, EditorView } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { autocompletion, snippet } from "@codemirror/autocomplete";

let editorView;
const themeCompartment = new Compartment();

// Tema Visual Completo (Restaurado)
const createEditorTheme = () =>
    EditorView.theme({
        "&": {
            height: "100%",
            fontSize: "16px",
            border: "none",
            background: "#fcfcfc",
        },
        ".cm-content, .cm-scroller": {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            padding: "12px",
            color: "#1a1a1a !important",
        },
        ".cm-gutters": {
            backgroundColor: "#f1f5f9",
            borderRight: "1px solid var(--primary)",
            color: "#64748b",
        },
        ".cm-activeLine": { backgroundColor: "rgba(0, 51, 102, 0.04)" },
        ".cm-activeLineGutter": {
            backgroundColor: "rgba(0, 51, 102, 0.08)",
            color: "var(--primary)",
        },
        "&.cm-focused": { outline: "none" },
    });

// Filtro de Edição (Proteção de Prefixo/Sufixo)
const readOnlyFilter = EditorState.changeFilter.of((tr) => {
    if (tr.changes.empty) { return true; }

    const doc = tr.startState.doc;
    const docString = doc.toString();

    const startFixed = 'CalcAUYLogic.from("';
    const startLen = startFixed.length;

    const endFixed = ".commit(";
    const endIdx = docString.lastIndexOf(endFixed);

    if (endIdx === -1) { return false; }

    let allowed = true;
    tr.changes.iterChanges((fromA, toA) => {
        // Se a mudança toca no prefixo [0, startLen]
        if (fromA < startLen) { allowed = false; }

        // Se a mudança toca no sufixo [endIdx, doc.length]
        if (toA > endIdx) { allowed = false; }
    });

    return allowed;
});

// Autocomplete e Hints (Restaurado)
function customCompletions(context) {
    // 1. Sugestão para o início (CalcAUYLogic.from)
    const word = context.matchBefore(/\w*/);
    if (word && (word.from != word.to || context.explicit)) {
        if ("CalcAUYLogic".startsWith(word.text)) {
            return {
                from: word.from,
                options: [
                    {
                        label: "CalcAUYLogic.from",
                        type: "function",
                        apply: snippet('CalcAUYLogic.from("${valor}")'),
                        detail: "(valor)",
                        info: "Inicia um novo cálculo com o valor fornecido",
                    },
                ],
            };
        }
    }

    // 2. Sugestão para métodos encadeados (ao digitar ".")
    const dotWord = context.matchBefore(/\.\w*/);
    if (dotWord && (dotWord.from != dotWord.to || context.explicit)) {
        return {
            from: dotWord.from,
            options: [
                {
                    label: ".add",
                    type: "method",
                    apply: snippet('.add("${valor}")'),
                    info: "Adiciona um valor",
                },
                {
                    label: ".sub",
                    type: "method",
                    apply: snippet('.sub("${valor}")'),
                    info: "Subtrai um valor",
                },
                {
                    label: ".mult",
                    type: "method",
                    apply: snippet('.mult("${valor}")'),
                    info: "Multiplica pelo valor",
                },
                {
                    label: ".div",
                    type: "method",
                    apply: snippet('.div("${valor}")'),
                    info: "Divide pelo valor",
                },
                {
                    label: ".pow",
                    type: "method",
                    apply: snippet('.pow("${valor}")'),
                    info: "Potência ou Raiz",
                },
                {
                    label: ".group",
                    type: "method",
                    apply: snippet(".group()"),
                    info: "Agrupa operações (parênteses)",
                },
                {
                    label: ".mod",
                    type: "method",
                    apply: snippet('.mod("${valor}")'),
                    info: "Resto da divisão",
                },
                {
                    label: ".divInt",
                    type: "method",
                    apply: snippet('.divInt("${valor}")'),
                    info: "Divisão inteira",
                },
            ],
        };
    }

    return null;
}

// Funções globais para o iframe
window.setupEditor = function (containerId) {
    const parent = document.getElementById(containerId);
    if (!parent) { return; }

    parent.innerHTML = ""; // Limpa container

    // Código Inicial Restaurado
    const startCode = `CalcAUYLogic.from("1234567.89")
        .setMetadata("transaction_id", "ABC-123")
        .pow("353/1141")
        .add(
            CalcAUYLogic.from(0.00123).div(
                CalcAUYLogic.from(7)
                            .div(11)
            ).group()
            .pow(9)
        )
        .setMetadata("step", "final_audit")
        .mult(
            CalcAUYLogic.from(3)
            .div(
                CalcAUYLogic.from(7)
                           .div(13)
            )
            .pow("999/135")
        )
        .group().div(CalcAUYLogic.from(0.0123).div(
                CalcAUYLogic.from(0.007).pow("81/46")
            ).group()).pow("49/189")
      .commit()`;

    editorView = new EditorView({
        doc: startCode,
        extensions: [
            basicSetup,
            javascript(),
            keymap.of(defaultKeymap),
            autocompletion({ override: [customCompletions] }),
            readOnlyFilter,
            themeCompartment.of(createEditorTheme()),
        ],
        parent,
    });

    window.addEventListener("message", (event) => {
        if (event.data.type === "THEME_CHANGE") {
            editorView.dispatch({ effects: themeCompartment.reconfigure(createEditorTheme()) });
        }
    });
};

window.getUserCode = function () {
    if (!editorView) { return null; }
    const code = editorView.state.doc.toString();

    // Validações restauradas
    if (!code.startsWith('CalcAUYLogic.from("')) {
        throw new Error("O código deve começar com 'CalcAUYLogic.from(\"'");
    }
    if (!code.includes(".commit(")) {
        throw new Error("O código deve terminar com '.commit(...)'");
    }

    const methodRegex = /\.(add|sub|mult|div|pow|mod|divInt|group)\b/g;
    const matches = code.match(methodRegex);
    const count = matches ? matches.length : 0;

    if (count > 16) {
        throw new Error(`Limite de operações excedido. Máximo: 16. Encontrado: ${count}.`);
    }

    return code;
};
