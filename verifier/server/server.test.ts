import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connect, type AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createServer } from "./server";
import type { CheckResult } from "../core/types";

let server: Server;
let base: string;
let classify: ReturnType<typeof vi.fn>;

const ambigu = { text: "Paiement reçu, merci", sender: "OrangeMoney", lang: "fr" };
const post = (body: unknown) =>
  fetch(`${base}/api/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(async () => {
  classify = vi.fn(async (): Promise<CheckResult> => ({ verdict: "aucun_signe", reasons: [], source: "ia" }));
  server = createServer({ classify, allowedOrigin: "http://localhost:8080", perMinute: 10 });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

describe("verifier HTTP server", () => {
  it("answers the health check", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects empty, oversized and malformed bodies with 400", async () => {
    expect((await post({ text: "", lang: "fr" })).status).toBe(400);
    expect((await post({ text: "x".repeat(2001), lang: "fr" })).status).toBe(400);
    const bad = await fetch(`${base}/api/verify`, { method: "POST", body: "{not json" });
    expect(bad.status).toBe(400);
  });

  it("answers from the rules without calling the model when they decide", async () => {
    const res = await post({ text: "Transfert reçu", sender: "771234567", lang: "fr" });
    expect(await res.json()).toMatchObject({ verdict: "arnaque", source: "regles" });
    expect(classify).not.toHaveBeenCalled();
  });

  it("sends only masked text to the model", async () => {
    await post({ text: "Paiement reçu du 77 123 45 67, merci", sender: "OrangeMoney", lang: "fr" });
    expect(classify.mock.calls[0][0]).toContain("[NUMERO]");
    expect(classify.mock.calls[0][0]).not.toContain("77 123");
  });

  it("returns a_verifier when the model throws", async () => {
    classify.mockRejectedValueOnce(new Error("boom"));
    expect(await (await post(ambigu)).json()).toMatchObject({ verdict: "a_verifier" });
  });

  it("rate-limits an address after 10 requests per minute", async () => {
    for (let i = 0; i < 10; i++) expect((await post(ambigu)).status).toBe(200);
    const res = await post(ambigu);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "trop_de_demandes" });
  });

  it("never logs the message content", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await post({ text: "SECRET-123 reçu", sender: "OrangeMoney", lang: "fr" });
    expect(spies.flatMap((s) => s.mock.calls).flat().join(" ")).not.toContain("SECRET-123");
    spies.forEach((s) => s.mockRestore());
  });

  it("survives a client that drops the connection mid-body", async () => {
    const port = (server.address() as AddressInfo).port;
    await new Promise<void>((resolve) => {
      const sock = connect(port, "127.0.0.1", () => {
        sock.write('POST /api/verify HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{"text":');
        setTimeout(() => { sock.destroy(); resolve(); }, 50);
      });
    });
    await new Promise((r) => setTimeout(r, 50));
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });

  it("never logs the query string of a request", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await fetch(`${base}/api/verify?text=SECRET-456`);
    expect(spy.mock.calls.flat().join(" ")).not.toContain("SECRET-456");
    spy.mockRestore();
  });

  it("behind a proxy, rate-limits on the address the proxy appended, not the one the client sent", async () => {
    await new Promise<void>((r) => server.close(() => r()));
    server = createServer({ classify, allowedOrigin: "http://localhost:8080", perMinute: 10, trustProxy: true });
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const send = (i: number) => fetch(`${base}/api/verify`, { method: "POST", body: JSON.stringify(ambigu),
      headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${i}, 1.2.3.4` } });
    for (let i = 0; i < 10; i++) expect((await send(i)).status).toBe(200);
    expect((await send(99)).status).toBe(429);
  });

  it("allows only the configured origin and answers the CORS preflight", async () => {
    expect((await post(ambigu)).headers.get("access-control-allow-origin")).toBe("http://localhost:8080");
    const pre = await fetch(`${base}/api/verify`, { method: "OPTIONS" });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-headers")).toContain("Content-Type");
  });
});
