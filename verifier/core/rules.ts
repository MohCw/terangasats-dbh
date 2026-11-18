import { PHONE_RE } from "./mask";
import { reasonText } from "./reasons";
import type { CheckResult, Lang } from "./types";

// ponytail: sender IDs to confirm against real operator SMS; unused by the rules, kept as the reference list.
export const OFFICIAL_SENDERS = ["OrangeMoney", "Wave", "FreeMoney"];

const PAYMENT_WORDS = /re[çc]u|transf[eé]r|d[ée]p[oô]t/i;
const CANCEL_CODE = /code d.?annulation|(rembours|renvoy)\w*.*(erreur|tromp)|(erreur|tromp)\w*.*(rembours|renvoy)/i;
const PHONE_ONLY = new RegExp(`^\\s*(?:${PHONE_RE.source})\\s*$`);

export function checkRules(req: { text: string; sender?: string }, lang: Lang): CheckResult | null {
  const sender = req.sender?.trim() ?? "";
  if ((sender === "[NUMERO]" || PHONE_ONLY.test(sender)) && PAYMENT_WORDS.test(req.text)) {
    return { verdict: "arnaque", reasons: [reasonText("sender_is_number", lang)], source: "regles" };
  }
  if (CANCEL_CODE.test(req.text)) {
    return { verdict: "arnaque", reasons: [reasonText("cancel_code", lang)], source: "regles" };
  }
  return null;
}
