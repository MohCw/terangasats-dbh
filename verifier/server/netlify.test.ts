import { describe, expect, it } from "vitest";
import handler from "../../netlify/functions/verify";

const post = (body: unknown, ip = "1.2.3.4") =>
  handler(new Request("https://site/api/verify", { method: "POST", body: JSON.stringify(body) }), { ip });

describe("Netlify function", () => {
  it("answers from the rules without calling the AI", async () => {
    const r = await post({ text: "Transfert reçu", sender: "771234567", lang: "fr" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ verdict: "arnaque", source: "regles" });
  });

  it("rejects empty text and limits bursts per IP", async () => {
    expect((await post({ text: "" }, "5.5.5.5")).status).toBe(400);
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await post({ text: "Transfert reçu", sender: "771234567" }, "9.9.9.9")).status);
    expect(statuses.at(-1)).toBe(429);
  });
});
