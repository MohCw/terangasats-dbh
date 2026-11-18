import { decide } from "../core/decide";
import { reasonText } from "../core/reasons";
import type { CheckResult, Lang, Verdict } from "../core/types";

// Best of the free models on the test set (eval/RESULTS.md); about 7 neurons per call, ~1,300 free checks a day.
export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM = `You classify a mobile money payment SMS from Senegal (Orange Money, Wave, Free Money) that a customer shows to a delivery rider.
[NUMERO], [NOM], [SOLDE] are redacted personal data, not suspicious.
Answer with exactly one word:
arnaque = asks to send money back, pay fees, dial a code, or pushes to hand over the goods
a_verifier = unusual wording, missing transaction reference, or anything you are unsure about
aucun_signe = plain operator receipt with amount, transaction reference and new balance, asking for nothing
When in doubt, answer a_verifier.`;

export function parseWorkersAiResponse(json: unknown): Verdict {
  const r = (json as any)?.result;
  const out = r?.response ?? r?.choices?.[0]?.message?.content;
  const m = (typeof out === "string" ? out : JSON.stringify(out ?? "")).toLowerCase().match(/arnaque|a_verifier|aucun_signe/);
  if (!m) throw new Error("unexpected Workers AI response");
  return m[0] as Verdict;
}

export async function classifyWithWorkersAi(
  maskedText: string,
  lang: Lang,
  opts: { accountId: string; token: string; model?: string; fetchFn?: typeof fetch; timeoutMs?: number },
): Promise<CheckResult> {
  try {
    const res = await (opts.fetchFn ?? fetch)(
      `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/ai/run/${opts.model ?? DEFAULT_MODEL}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.token}` },
        body: JSON.stringify({ messages: [{ role: "system", content: SYSTEM }, { role: "user", content: maskedText }], temperature: 0, max_tokens: 8 }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
      },
    );
    if (!res.ok) throw new Error(`Workers AI ${res.status}`);
    const v = parseWorkersAiResponse(await res.json());
    return decide(v, lang);
  } catch {
    return { verdict: "a_verifier", reasons: [reasonText("check_failed", lang)], source: "erreur" };
  }
}
