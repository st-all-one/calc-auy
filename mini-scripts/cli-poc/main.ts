import { CalcAUY } from "../../mod.ts";
import { parseArgs } from "jsr:@std/cli@1.0.6/parse-args";
import * as colors from "jsr:@std/fmt@1.0.3/colors";

/**
 * CalcAUY CLI POC - Suporte a Parser e Hydrate
 */

const args = parseArgs(Deno.args, {
    string: ["value", "op", "with", "metadata", "expr", "json"],
    boolean: ["help", "audit"],
    alias: { v: "value", o: "op", w: "with", m: "metadata", h: "help", a: "audit", e: "expr", j: "json" },
});

if (args.help) {
    console.log(`
${colors.bgBlue(colors.white(" CalcAUY CLI POC "))} 

${colors.bold("Uso:")}
  ./calc-auy-cli [opções]

${colors.bold("Modos de Operação:")}
  1. Fluente:  -v 100 -o add -w 50
  2. Parser:   -e "100 + (50 * 2) / 7"
  3. Hydrate:  -j '{"ast": {...}, "roundStrategy": "..."}'

${colors.bold("Opções Gerais:")}
  -m, --metadata <str> Adiciona um metadado context:str
  -a, --audit          Exibe o rastro de auditoria (JSON)
  -h, --help           Mostra este guia
    `);
    Deno.exit(0);
}

console.log(colors.blue("┌──────────────────────────────────────────────────┐"));
console.log(colors.blue("│") + colors.bold(" CalcAUY: Engine CLI (Parser + Hydrate)          ") + colors.blue("│"));
console.log(colors.blue("└──────────────────────────────────────────────────┘"));

try {
    let builder;
    let mode = "";

    if (args.json) {
        mode = "Hydration (Reconstrução)";
        builder = CalcAUY.hydrate(args.json);
    } else if (args.expr) {
        mode = `Parser (Expressão: ${args.expr})`;
        builder = CalcAUY.parseExpression(args.expr);
    } else {
        mode = "Fluente (API Builder)";
        const initial = args.value || "100";
        const operation = args.op || "add";
        const operand = args.with || "50";
        
        builder = CalcAUY.from(initial);
        switch (operation) {
            case "add": builder = builder.add(operand); break;
            case "sub": builder = builder.sub(operand); break;
            case "mult": builder = builder.mult(operand); break;
            case "div": builder = builder.div(operand); break;
            default: throw new Error(`Operação desconhecida: ${operation}`);
        }
    }

    const res = builder.setMetadata("cli_mode", mode).commit();

    console.log(`\n${colors.green("✔")} ${colors.bold("Processado com sucesso!")}\n`);
    console.log(`${colors.cyan("→")} ${colors.bold("Modo:")}         ${mode}`);
    console.log(`${colors.cyan("→")} ${colors.bold("Resultado:")}    ${colors.yellow(res.toStringNumber())}`);
    console.log(`${colors.cyan("→")} ${colors.bold("Monetário:")}    ${colors.magenta(res.toMonetary({ locale: "pt-BR" }))}`);
    console.log(`${colors.cyan("→")} ${colors.bold("Unicode:")}      ${res.toUnicode()}`);

    if (args.audit) {
        console.log(`\n${colors.blue("--- Rastro de Auditoria ---")}`);
        console.log(colors.dim(res.toAuditTrace()));
    }

} catch (e) {
    const error = e as Error;
    console.error(`\n${colors.red("✘")} ${colors.bold("Erro:")} ${error.message}`);
    Deno.exit(1);
}
