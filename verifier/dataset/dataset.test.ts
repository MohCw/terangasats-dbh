import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { maskPII } from "../core/mask";

const rows = readFileSync(new URL("./messages.jsonl", import.meta.url), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

describe("test set", () => {
  it("has at least 60 messages split as the plan requires", () => {
    expect(rows.length).toBeGreaterThanOrEqual(60);
    expect(rows.filter((r) => r.type === "faux_transfert").length).toBeGreaterThanOrEqual(15);
    expect(rows.filter((r) => r.type === "depot_erreur").length).toBeGreaterThanOrEqual(15);
    expect(rows.filter((r) => r.label === "legitime").length).toBeGreaterThanOrEqual(30);
  });

  it("stores no phone number, name or balance in clear", () => {
    for (const r of rows) expect(maskPII(r.text)).toBe(r.text);
  });

  it("labels every row consistently and with a known origin", () => {
    for (const r of rows) {
      expect(r.label === "legitime").toBe(r.type === "legitime");
      expect(["presse", "reconstitue", "reel_masque"]).toContain(r.origin);
      expect(typeof r.id).toBe("string");
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});
