import { dirname, fromFileUrl, join } from "@std/path";
import { CurrencyNBRError } from "../src/errors.ts";
import { mapAllOutputs } from "./logic/mapper.ts";
import { isRateLimited } from "./logic/rate_limit.ts";
import { executeExpression } from "./logic/execution.ts";
import { getCategorizedExamples } from "./data/examples.ts";
import { serveFile } from "./handlers/static.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));
const ROOT = __dirname;

export default Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") return serveFile(join(__dirname, "index.html"));
  if (url.pathname === "/editor.html") {
    return serveFile(join(__dirname, "editor.html"));
  }
  if (url.pathname === "/style.css") {
    return serveFile(join(__dirname, "style.css"));
  }
  if (url.pathname === "/script.js") {
    return serveFile(join(__dirname, "script.js"));
  }
  if (url.pathname === "/editor_controller.bundle.js") {
    return serveFile(join(__dirname, "editor_controller.bundle.js"));
  }
  if (url.pathname === "/editor_controller.js") {
    return serveFile(join(__dirname, "editor_controller.js"));
  }

  if (url.pathname === "/api/examples") {
    return new Response(JSON.stringify(getCategorizedExamples()), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  if (url.pathname === "/api/calculate") {
    try {
      // Rate Limit por "IP" (ou identificador de conexão)
      const clientIp = req.headers.get("x-forwarded-for") || "local";
      if (isRateLimited(clientIp)) {
        return new Response(
          JSON.stringify({
            error: "Muitas requisições. Tente novamente em 30 segundos.",
          }),
          {
            status: 429,
            headers: { "content-type": "application/json" },
          },
        );
      }

      const { expression } = await req.json();
      const output = executeExpression(expression, req);
      return new Response(
        JSON.stringify(mapAllOutputs(output)),
        {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        },
      );
    } catch (err) {
      if (err instanceof CurrencyNBRError) {
        return new Response(JSON.stringify(err.toJSON()), {
          status: err.status,
          headers: { "content-type": "application/problem+json" },
        });
      }
      return new Response(JSON.stringify({ error: (err as Error).message }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (url.pathname.startsWith("/fonts/")) {
    const fontPath = join(ROOT, "assets", url.pathname);
    return serveFile(fontPath);
  }

  if (url.pathname.includes("favicon")) {
    const fontPath = join(ROOT, "assets", url.pathname);
    return serveFile(fontPath);
  }

  if (url.pathname.startsWith("/assets/")) {
    return serveFile(join(ROOT, url.pathname));
  }

  // Redirecionamento redundante: Qualquer rota não mapeada volta para a Home
  return Response.redirect(url.origin + "/", 302);
});
