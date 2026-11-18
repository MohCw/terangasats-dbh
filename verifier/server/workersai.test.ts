import { describe, expect, it } from "vitest";
import { classifyWithWorkersAi, parseWorkersAiResponse } from "./workersai";
import { reasonText } from "../core/reasons";

const reply = (response: unknown, status = 200) => (async () => new Response(JSON.stringify({ result: { response }, success: true }), { status })) as typeof fetch;
const opts = { accountId: "acc", token: "tok" };
const failed = { verdict: "a_verifier", reasons: [reasonText("check_failed", "fr")], source: "erreur" };

describe("parseWorkersAiResponse", () => {
  it("reads the label even with extra words or casing", () => {
    expect(parseWorkersAiResponse({ result: { response: " Arnaque." } })).toBe("arnaque");
    expect(parseWorkersAiResponse({ result: { response: "aucun_signe" } })).toBe("aucun_signe");
  });
  it("throws when no label is found", () => {
    expect(() => parseWorkersAiResponse({ result: { response: "je ne sais pas" } })).toThrow();
  });
});

describe("classifyWithWorkersAi", () => {
  it("sends the masked text with the token and maps the label", async () => {
    let url = "", init: RequestInit = {};
    const spy = (async (u: string, i: RequestInit) => { url = u; init = i; return new Response(JSON.stringify({ result: { response: "arnaque" } })); }) as typeof fetch;
    expect(await classifyWithWorkersAi("Transfert reçu [NUMERO]", "fr", { ...opts, fetchFn: spy })).toMatchObject({ verdict: "arnaque", source: "ia" });
    expect(url).toContain("/accounts/acc/ai/run/@cf/");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(String(init.body)).toContain("Transfert reçu [NUMERO]");
  });

  it("never returns aucun_signe: the AI can only raise the alarm", async () => {
    expect((await classifyWithWorkersAi("…", "fr", { ...opts, fetchFn: reply("a_verifier") })).verdict).toBe("a_verifier");
    expect((await classifyWithWorkersAi("…", "fr", { ...opts, fetchFn: reply("aucun_signe") })).verdict).toBe("a_verifier");
  });

  it("returns a_verifier / check_failed on every kind of failure", async () => {
    expect(await classifyWithWorkersAi("…", "fr", { ...opts, fetchFn: (async () => { throw new Error("down"); }) as typeof fetch })).toEqual(failed);
    expect(await classifyWithWorkersAi("…", "fr", { ...opts, fetchFn: reply("arnaque", 401) })).toEqual(failed);
    expect(await classifyWithWorkersAi("…", "fr", { ...opts, fetchFn: reply("bonjour") })).toEqual(failed);
  });
});
