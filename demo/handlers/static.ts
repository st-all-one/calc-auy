/**
 * CalcAUY Demo - Static File Handler
 * @module
 */

export async function serveFile(path: string): Promise<Response> {
    const ext = path.split(".").pop();
    const mimes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        js: "application/javascript",
        css: "text/css",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
        ico: "image/x-icon",
    };
    try {
        const data = await Deno.readFile(path);
        return new Response(data, {
            headers: {
                "content-type": mimes[ext ?? ""] || "application/octet-stream",
                "cache-control": "no-store, must-revalidate",
                "access-control-allow-origin": "*",
            },
        });
    } catch {
        return new Response("Not Found", { status: 404 });
    }
}
