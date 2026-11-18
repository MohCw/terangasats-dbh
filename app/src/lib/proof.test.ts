import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { verifyPreimage } from "./proof";

describe("proof", () => {
  const pre = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(Buffer.from(pre, "hex")).digest("hex");
  it("valide le bon preimage", async () => expect(await verifyPreimage(pre, hash)).toBe(true));
  it("rejette le reste", async () => {
    expect(await verifyPreimage(pre, "0".repeat(64))).toBe(false);
    expect(await verifyPreimage("nothex", hash)).toBe(false);
  });
});
