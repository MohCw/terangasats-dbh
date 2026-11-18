import http from "node:http";
import { MAX_BODY, rateLimiter, verify, type Classify } from "./verify";

export function createServer(deps: {
  classify: Classify;
  allowedOrigin: string;
  perMinute?: number;
  trustProxy?: boolean;
}): http.Server {
  const limited = rateLimiter(deps.perMinute);

  return http.createServer(async (req, res) => {
    const start = Date.now();
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": deps.allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      });
      res.end(body === undefined ? undefined : JSON.stringify(body));
      console.log(`${req.method} ${(req.url ?? "").split("?")[0]} ${status} ${Date.now() - start}ms`);
    };

    if (req.method === "GET" && req.url === "/health") return send(200, { ok: true });
    if (req.method === "OPTIONS" && req.url === "/api/verify") return send(204);
    if (req.method !== "POST" || req.url !== "/api/verify") return send(404, { error: "introuvable" });

    const forwarded = deps.trustProxy ? String(req.headers["x-forwarded-for"] ?? "").split(",").pop()!.trim() : "";
    if (limited(forwarded || req.socket.remoteAddress || "?")) return send(429, { error: "trop_de_demandes" });

    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > MAX_BODY) return send(413, { error: "trop_long" });
      }
    } catch {
      return; // client dropped the connection mid-body: nothing to answer
    }

    const r = await verify(raw, deps.classify);
    send(r.status, r.body);
  });
}
