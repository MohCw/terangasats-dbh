import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";

describe("computeMetrics", () => {
  it("counts a scam as detected unless it is aucun_signe, and a false alert only when a legit SMS is arnaque", () => {
    expect(computeMetrics([
      { label: "arnaque", verdict: "arnaque" },
      { label: "arnaque", verdict: "a_verifier" },
      { label: "arnaque", verdict: "aucun_signe" },
      { label: "legitime", verdict: "arnaque" },
      { label: "legitime", verdict: "aucun_signe" },
    ])).toEqual({ detectionRate: 2 / 3, falseAlertRate: 1 / 2 });
  });

  it("returns 0 rather than NaN for an empty class", () => {
    expect(computeMetrics([])).toEqual({ detectionRate: 0, falseAlertRate: 0 });
  });
});
