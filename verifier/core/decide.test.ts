import { describe, expect, it } from "vitest";
import { decide } from "./decide";
import { reasonText } from "./reasons";

describe("decide", () => {
  it("keeps arnaque", () => {
    expect(decide("arnaque", "fr")).toEqual({ verdict: "arnaque", reasons: [reasonText("ai_scam", "fr")], source: "ia" });
  });

  it("never lets the AI answer aucun_signe: it becomes a_verifier", () => {
    const unsure = { verdict: "a_verifier", reasons: [reasonText("ai_unsure", "fr")], source: "ia" };
    expect(decide("aucun_signe", "fr")).toEqual(unsure);
    expect(decide("a_verifier", "fr")).toEqual(unsure);
  });
});
