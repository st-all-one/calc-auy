/**
 * CalcAUY Demo - Server
 * @module
 */

import { dirname, fromFileUrl, join } from "@std/path";
import { CalcAUYError } from "../src/errors.ts";
import { isRateLimited } from "./logic/rate_limit.ts";
import { executeExpression } from "./logic/execution.ts";
import { mapAllOutputs } from "./logic/mapper.ts";
import { getCategorizedExamples } from "./data/examples.ts";
import { serveFile } from "./handlers/static.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));
const ROOT = __dirname;

// Global BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

Deno.serve({ port: 8000 }, async (req) => {
    const url = new URL(req.url);

    // Static Files
    if (url.pathname === "/") return serveFile(join(ROOT, "index.html"));
    if (url.pathname === "/style.css") return serveFile(join(ROOT, "style.css"));
    if (url.pathname === "/script.js") return serveFile(join(ROOT, "script.js"));
    if (url.pathname === "/editor.html") return serveFile(join(ROOT, "editor.html"));
    if (url.pathname === "/editor_controller.js") return serveFile(join(ROOT, "editor_controller.js"));
    if (url.pathname === "/editor_controller.bundle.js") return serveFile(join(ROOT, "editor_controller.bundle.js"));

    // Assets
    if (url.pathname.startsWith("/assets/")) return serveFile(join(ROOT, url.pathname));
    if (url.pathname.startsWith("/fonts/")) return serveFile(join(ROOT, "assets", url.pathname));
    if (url.pathname === "/favicon.ico") return serveFile(join(ROOT, "assets", "favicon.ico"));

    // API: Examples
    if (url.pathname === "/api/examples") {
        try {
            return new Response(JSON.stringify(await getCategorizedExamples()), {
                headers: { "content-type": "application/json" },
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
        }
    }

    // API: Calculate
    if (url.pathname === "/api/calculate") {
        try {
            const clientIp = req.headers.get("x-forwarded-for") || "local";
            if (isRateLimited(clientIp)) {
                return new Response(JSON.stringify({ error: "Too many requests. Try again in 30s." }), { status: 429 });
            }

            const { expression } = await req.json();
            const output = executeExpression(expression, req);
            return new Response(JSON.stringify(await mapAllOutputs(output)), {
                headers: { "content-type": "application/json" },
            });
        } catch (err) {
            if (err instanceof CalcAUYError) {
                return new Response(JSON.stringify(err.toJSON()), {
                    status: err.status || 400,
                    headers: { "content-type": "application/problem+json" },
                });
            }
            return new Response(JSON.stringify({ error: (err as Error).message }), {
                status: 400,
                headers: { "content-type": "application/json" },
            });
        }
    }

    return new Response("Not Found", { status: 404 });
});
