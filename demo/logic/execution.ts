// Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
/*
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { CalcAUYLogic, CalcAUYOutput } from "@calc-auy";

/**
 * Executa uma expressão de cálculo recebida via string, garantindo a auditoria
 * e aplicando travas de segurança rigorosas para o ambiente de demonstração.
 *
 * @param expression A string contendo o código TypeScript a ser executado.
 * @param req O objeto de requisição original para validação de headers.
 * @returns Instância de CalcAUYOutput com o resultado do cálculo.
 */
export function executeExpression(
    expression: string,
    req: Request,
): CalcAUYOutput {
    // 1. Validação de Origem e Headers
    // Bloqueia chamadas diretas via ferramentas como Postman/Curl para evitar abuso da API.
    const requestedWith = req.headers.get("x-requested-with");

    if (requestedWith !== "CalcAUD-Demo") {
        throw new Error("Acesso negado: Chamada direta não permitida.");
    }

    // 2. Segurança: Limite de Tamanho do Payload
    if (expression.length > 2000) {
        throw new Error("Expressão muito longa (Máximo 2000 caracteres).");
    }

    // 3. Validação de Segurança da Sintaxe Core
    if (!expression.startsWith('CalcAUYLogic.from("')) {
        throw new Error("A expressão deve iniciar com 'CalcAUYLogic.from(\"'");
    }
    if (!expression.includes(".commit(")) {
        throw new Error("A expressão deve conter '.commit(...)'");
    }

    // 4. Sandbox de Segurança: Detecção de Código Malicioso
    // Impedimos o acesso a primitivas do Deno, rede, IO e loops infinitos.
    const forbidden = [
        "while",
        "for",
        "process",
        "Deno",
        "eval",
        "global",
        "window",
        "document",
        "fetch",
        "import",
    ];
    if (forbidden.some((word) => expression.includes(word))) {
        throw new Error("Sintaxe não permitida detectada.");
    }

    // 5. Governança de Recursos: Limite de Operações
    const methodRegex = /\.(add|sub|mult|div|pow|mod|divInt|group)\b/g;
    const matches = expression.match(methodRegex);
    const count = matches ? matches.length : 0;

    if (count > 16) {
        throw new Error(
            `Limite de operações excedido. Máximo: 16. Encontrado: ${count}.`,
        );
    }

    // 6. Execução Controlada
    // Injetamos a classe CalcAUYLogic no escopo da função para permitir o encadeamento dinâmico.
    const fn = new Function("CalcAUYLogic", `return ${expression};`);
    const result = fn(CalcAUYLogic);

    if (!(result instanceof CalcAUYOutput) && !(result instanceof CalcAUYLogic)) {
        throw new Error(
            "A expressão deve retornar um CalcAUYLogic ou CalcAUYOutput",
        );
    }

    return result instanceof CalcAUYLogic ? result.commit() : result;
}
