import type { Verdict } from "../core/types";

export function computeMetrics(rows: { label: "arnaque" | "legitime"; verdict: Verdict }[]) {
  const scams = rows.filter((r) => r.label === "arnaque");
  const legit = rows.filter((r) => r.label === "legitime");
  const rate = (n: number, d: number) => (d ? n / d : 0);
  return {
    detectionRate: rate(scams.filter((r) => r.verdict !== "aucun_signe").length, scams.length),
    falseAlertRate: rate(legit.filter((r) => r.verdict === "arnaque").length, legit.length),
  };
}
