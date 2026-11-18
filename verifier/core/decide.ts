import { reasonText } from "./reasons";
import type { CheckResult, Lang, Verdict } from "./types";

// The AI can raise the alarm, never lower it: a fake transfer SMS is a copy of a real receipt, so no model
// can tell them apart from the text (8 of 30 fakes passed as aucun_signe in eval). Only the vendor's balance can.
export function decide(v: Verdict, lang: Lang): CheckResult {
  if (v === "arnaque") return { verdict: "arnaque", reasons: [reasonText("ai_scam", lang)], source: "ia" };
  return { verdict: "a_verifier", reasons: [reasonText("ai_unsure", lang)], source: "ia" };
}
