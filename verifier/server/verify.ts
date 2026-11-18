import { maskPII } from "../core/mask";
import { reasonText } from "../core/reasons";
import { checkRules } from "../core/rules";
import type { CheckResult, Lang } from "../core/types";

export const MAX_BODY = 16 * 1024;
const MAX_TEXT = 2000;

export type Classify = (masked: string, lang: Lang) => Promise<CheckResult>;

// Shared by the Node server (Docker, local) and the Netlify function: validate, mask again, rules, then AI.
export async function verify(raw: string, classify: Classify): Promise<{ status: number; body: unknown }> {
  if (raw.length > MAX_BODY) return { status: 413, body: { error: "trop_long" } };
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: "texte_invalide" } };
  }
  const { text, sender } = body ?? {};
  const lang: Lang = body?.lang === "wo" ? "wo" : "fr";
  if (typeof text !== "string" || text.trim().length === 0 || text.length > MAX_TEXT
      || (sender !== undefined && (typeof sender !== "string" || sender.length > 40))) {
    return { status: 400, body: { error: "texte_invalide" } };
  }
  try {
    const masked = maskPII(text);
    const rules = checkRules({ text: masked, sender: sender === undefined ? undefined : maskPII(sender) }, lang);
    return { status: 200, body: rules ?? (await classify(masked, lang)) };
  } catch {
    return { status: 200, body: { verdict: "a_verifier", reasons: [reasonText("check_failed", lang)], source: "erreur" } };
  }
}

// ponytail: in-memory, per process (per function instance on Netlify); use the platform rate limiter if abuse shows up.
export function rateLimiter(perMinute = 10): (ip: string) => boolean {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (ip) => {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || now - h.windowStart >= 60_000) {
      hits.set(ip, { count: 1, windowStart: now });
      return false;
    }
    return ++h.count > perMinute;
  };
}
