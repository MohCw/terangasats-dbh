import { describe, it, expect } from "vitest";
import { fetchBtcEur } from "./price";

describe("price", () => {
  it("lit le prix", async () => {
    const ok = async () => new Response(JSON.stringify({ bitcoin: { eur: 90000 } }));
    expect(await fetchBtcEur(ok as unknown as typeof fetch)).toBe(90000);
  });
  it("rejette une réponse cassée", async () => {
    const broken = async () => new Response("{}", { status: 200 });
    await expect(fetchBtcEur(broken as unknown as typeof fetch)).rejects.toThrow();
    const down = async () => new Response("", { status: 503 });
    await expect(fetchBtcEur(down as unknown as typeof fetch)).rejects.toThrow();
  });
});
