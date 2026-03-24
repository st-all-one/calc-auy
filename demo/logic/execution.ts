import { CurrencyNBR, CurrencyNBROutput } from "@currency-nbr-a11y";

export function executeExpression(
  expression: string,
  req: Request,
): CurrencyNBROutput {
  // 1. Validação de Origem e Headers (Bloqueia chamadas diretas fora da demo)
  const requestedWith = req.headers.get("x-requested-with");

  // Em ambiente local, origin pode ser nulo em alguns casos, mas referer e custom header devem estar lá
  if (requestedWith !== "CurrencyNBR-Demo") {
    throw new Error("Acesso negado: Chamada direta não permitida.");
  }

  // 2. Limite de Tamanho do Payload (Prevenção de DoS por string gigante)
  if (expression.length > 2000) {
    throw new Error("Expressão muito longa (Máximo 2000 caracteres).");
  }

  // 3. Validação de Segurança da Sintaxe
  if (!expression.startsWith('CurrencyNBR.from("')) {
    throw new Error("A expressão deve iniciar com 'CurrencyNBR.from(\"'");
  }
  if (!expression.includes(".commit(")) {
    throw new Error("A expressão deve conter '.commit(...)'");
  }

  // 4. Detecção de Código Malicioso (Impede loops e acesso a objetos globais)
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

  // 5. Limite de Operações (Expandido para 16)
  const methodRegex = /\.(add|sub|mult|div|pow|mod|divInt|group)\b/g;
  const matches = expression.match(methodRegex);
  const count = matches ? matches.length : 0;

  if (count > 16) {
    throw new Error(
      `Limite de operações excedido. Máximo: 16. Encontrado: ${count}.`,
    );
  }

  const fn = new Function("CurrencyNBR", `return ${expression};`);
  const result = fn(CurrencyNBR);
  if (
    !(result instanceof CurrencyNBROutput) && !(result instanceof CurrencyNBR)
  ) {
    throw new Error(
      "A expressão deve retornar um CurrencyNBR ou CurrencyNBROutput",
    );
  }
  return result instanceof CurrencyNBR ? result.commit() : result;
}
