/* Create by Stallone L. S. (@st-all-one) - 2026 - License: MPL-2.0
 *
 * Copyright (c) 2026, Stallone L. S. (@st-all-one)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { CalculationNode, MetadataValue } from "../ast/types.ts";
import type { InstanceConfig } from "../core/types.ts";
import type { CalcAUYLocaleA11y } from "./types.ts";

type MermaidSequenceEvent = {
    type: "note" | "transition" | "action";
    context: string;
    message: string;
    fromContext?: string;
    metadata?: string; // Metadados de negócio separados para ações
};

/**
 * Motor de renderização para Diagramas de Sequência Mermaid.
 * Transforma a AST recursiva em uma narrativa cronológica de transições de estado com suporte a i18n.
 */
export function renderMermaidSequence(
    ast: CalculationNode,
    config: Required<InstanceConfig>,
    finalSignature: string,
    loc: CalcAUYLocaleA11y,
): string {
    const events: MermaidSequenceEvent[] = [];
    const participantDepths = new Map<string, number>();

    // O contexto atual (raiz) inicia com profundidade 0
    const currentContext = config.contextLabel;
    participantDepths.set(currentContext, 0);

    /**
     * Helper para atualizar a profundidade máxima de um participante.
     */
    function updateDepth(ctx: string, depth: number): void {
        const current = participantDepths.get(ctx) || 0;
        if (depth > current) {
            participantDepths.set(ctx, depth);
        }
    }

    // Buffer para agrupar ingestões consecutivas
    let literalBuffer: { input: string; timestamp: string; userMeta: string[] }[] = [];

    /**
     * Helper para formatar o timestamp (Padrão ISO simplificado).
     * Ex: 26-04-25 10:30 (iso)
     */
    function formatTime(iso?: MetadataValue): string {
        if (typeof iso !== "string") { return ""; }

        const d = new Date(iso);

        if (isNaN(d.getTime())) { return ""; }

        try {
            const yy = String(d.getUTCFullYear()).slice(-2);
            const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
            const dd = String(d.getUTCDate()).padStart(2, "0");
            const hh = String(d.getUTCHours()).padStart(2, "0");
            const mm = String(d.getUTCMinutes()).padStart(2, "0");
            return `${yy}-${MM}-${dd} ${hh}:${mm} (UTC)`;
        } catch {
            return "";
        }
    }

    /**
     * Helper para extrair metadados do usuário (excluindo sistema).
     */
    function getUserMetadata(meta: Record<string, MetadataValue>, isPII: boolean, isRoot: boolean): string[] {
        const lines: string[] = [];
        const skipKeys = ["timestamp", "pii", "previousContextLabel", "previousSignature", "previousRoundStrategy"];

        for (const [key, value] of Object.entries(meta)) {
            if (skipKeys.includes(key) || (key === "timestamp" && isRoot)) { continue; }

            let displayVal: string;
            if (isPII) {
                displayVal = "[PII]";
            } else if (typeof value === "object" && value !== null) {
                if (Array.isArray(value)) {
                    displayVal = loc.mermaid.listTemplate.replace("{n}", String(value.length));
                } else {
                    displayVal = loc.mermaid.objectLabel;
                }
            } else {
                const s = String(value);
                displayVal = s.length > 25 ? s.slice(0, 22) + "..." : s;
            }
            lines.push(`[${key}: ${displayVal}]`);
        }
        return lines;
    }

    /**
     * Helper para descarregar o buffer de literais em uma única nota agrupada.
     */
    function flushLiterals(ctx: string): void {
        if (literalBuffer.length === 0) { return; }

        if (literalBuffer.length === 1) {
            const lit = literalBuffer[0];
            const timePrefix = lit.timestamp ? `${lit.timestamp}<br/>` : "";
            events.push({
                type: "note",
                context: ctx,
                message: `${timePrefix}${loc.mermaid.ingestion}: ${lit.input}${
                    lit.userMeta.length ? "<br/>" + lit.userMeta.join("<br/>") : ""
                }`,
            });
        } else {
            const firstTime = literalBuffer[0].timestamp;
            const timePrefix = firstTime ? `${firstTime}<br/>` : "";
            const lines = literalBuffer.map((l) => {
                const val = l.input.length > 25 ? l.input.slice(0, 22) + "..." : l.input;
                return `• ${val}${l.userMeta.length ? " " + l.userMeta.join(" ") : ""}`;
            });
            events.push({
                type: "note",
                context: ctx,
                message: `${timePrefix}${loc.mermaid.ingestionOperands}:<br/>${lines.join("<br/>")}`,
            });
        }
        literalBuffer = [];
    }

    /**
     * Varredura recursiva para extrair a linhagem de eventos e profundidades.
     */
    function walk(node: CalculationNode, ctx: string, depth: number, isRoot = false): void {
        updateDepth(ctx, depth);
        const meta = node.metadata || {};
        const isPII = typeof meta.pii === "boolean" ? meta.pii : config.sensitive !== false;
        const timestamp = (meta.timestamp && !isRoot) ? formatTime(meta.timestamp) : "";
        const userMeta = getUserMetadata(meta, isPII, isRoot);

        if (node.kind === "control") {
            flushLiterals(ctx);
            const prevCtx = node.metadata.previousContextLabel || "Unknown";
            const prevSig = node.metadata.previousSignature || "No Signature";

            walk(node.child, prevCtx, depth + 1);
            flushLiterals(prevCtx);
            events.push({
                type: "transition",
                fromContext: prevCtx,
                context: ctx,
                message: `${loc.mermaid.handover} (Sig: ${prevSig.slice(0, 8)}...)`,
            });

            const timePrefix = timestamp ? `${timestamp}<br/>` : "";
            events.push({
                type: "note",
                context: ctx,
                message: `${timePrefix}${loc.mermaid.event}: ${node.type}${
                    userMeta.length ? "<br/>" + userMeta.join("<br/>") : ""
                }`,
            });
            return;
        }

        if (node.kind === "operation") {
            for (const op of node.operands) {
                walk(op, ctx, depth);
            }
            flushLiterals(ctx);
            // Operações são 'actions' (Self-calls)
            events.push({
                type: "action",
                context: ctx,
                message: `${timestamp ? timestamp + "<br/>" : ""}${loc.mermaid.operation}: ${node.type}`,
                metadata: userMeta.join("<br/>"),
            });
            return;
        }

        if (node.kind === "group") {
            walk(node.child, ctx, depth);
            return;
        }

        if (node.kind === "literal") {
            const input = isPII ? "[REDACTED]" : node.originalInput;
            literalBuffer.push({ input, timestamp, userMeta });
        }
    }

    // deno-lint-ignore no-boolean-literal-for-arguments
    walk(ast, currentContext, 0, true);
    flushLiterals(currentContext);

    const rootTime = ast.metadata?.timestamp ? formatTime(ast.metadata.timestamp).trim() : "";
    events.push({
        type: "note",
        context: currentContext,
        message: `${rootTime}<br/>${loc.mermaid.closing}<br/>${loc.mermaid.signature}: (Sig: ${
            finalSignature.slice(0, 8)
        }...)`,
    });

    let dsl = "sequenceDiagram\n    autonumber\n";
    const sortedParticipants = Array.from(participantDepths.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

    for (const p of sortedParticipants) {
        dsl += `    participant ${getAlias(p)} as ${loc.mermaid.context}: ${p}\n`;
    }
    dsl += "\n";

    const activeParticipants = new Set<string>();
    for (const ev of events) {
        const alias = getAlias(ev.context);

        if (!activeParticipants.has(alias)) {
            dsl += `    activate ${alias}\n`;
            activeParticipants.add(alias);
        }

        if (ev.type === "transition") {
            // deno-lint-ignore no-non-null-assertion
            const fromAlias = getAlias(ev.fromContext!);
            if (!activeParticipants.has(fromAlias)) {
                dsl += `    activate ${fromAlias}\n`;
                activeParticipants.add(fromAlias);
            }
            dsl += `    ${fromAlias}->>+${alias}: ${ev.message}\n`;
            dsl += `    deactivate ${fromAlias}\n`;
            activeParticipants.delete(fromAlias);
        } else if (ev.type === "action") {
            dsl += `    ${alias}->>${alias}: ${ev.message}${ev.metadata ? "<br/>" + ev.metadata : ""}\n`;
        } else {
            dsl += `    Note over ${alias}: ${ev.message}\n`;
        }
    }

    for (const alias of activeParticipants) {
        dsl += `    deactivate ${alias}\n`;
    }

    return dsl;
}

function getAlias(name: string): string {
    return "Ctx_" + name.replace(/[^a-zA-Z0-9]/g, "_");
}
