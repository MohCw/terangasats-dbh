import { maskPII } from "../core/mask";
import { reasonText } from "../core/reasons";
import { checkRules } from "../core/rules";
import type { CheckResult, Lang, Verdict } from "../core/types";
import { t, UI, VERDICT } from "./strings";

const MAX_TEXT = 2000;
const AUDIO: Record<Verdict, string> = {
  arnaque: new URL("./audio/arnaque.mp3", import.meta.url).href,
  a_verifier: new URL("./audio/a_verifier.mp3", import.meta.url).href,
  aucun_signe: new URL("./audio/aucun_signe.mp3", import.meta.url).href,
};

const STYLE_ID = "ts-verifier-style";
const CSS = `
.ts-v{--ink:#14231c;--muted:#5f6b64;--line:rgba(20,35,28,.1);--surface:#fff;--field:#fbf9f4;--brand:#0b6b4d;--brand-dark:#08503a;--ease:cubic-bezier(.2,0,0,1);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);line-height:1.5}
.ts-v *{box-sizing:border-box}
.ts-v h2{font-size:clamp(26px,4.5vw,36px);line-height:1.2;letter-spacing:-.01em;font-weight:600;margin:0 0 8px;max-width:22ch}
.ts-v .ts-lead{color:var(--muted);margin:0 0 24px;max-width:52ch}
.ts-v .ts-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(20px,4vw,40px);align-items:start}
@media (max-width:760px){.ts-v .ts-grid{grid-template-columns:1fr}.ts-v .ts-side{display:none}}
.ts-v form{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;display:grid;gap:8px;box-shadow:0 1px 2px rgba(20,35,28,.06)}
.ts-v label{font-weight:500;font-size:14px;margin-top:8px}
.ts-v label:first-child{margin-top:0}
.ts-v textarea,.ts-v input{font:inherit;color:inherit;background:var(--field);border:1px solid var(--line);border-radius:10px;padding:12px;width:100%;transition:border-color 150ms var(--ease)}
.ts-v textarea{min-height:140px;resize:vertical}
.ts-v textarea:focus-visible,.ts-v input:focus-visible{outline:3px solid rgba(11,107,77,.25);border-color:var(--brand)}
.ts-v button:focus-visible{outline:3px solid #f2a516;outline-offset:2px}
.ts-v button{font:inherit;font-weight:500;border:0;border-radius:10px;padding:12px 20px;cursor:pointer;transition:background-color 150ms var(--ease)}
.ts-v form button[type=submit]{background:var(--brand);color:#fff;margin-top:12px;justify-self:start}
.ts-v form button[type=submit]:hover{background:var(--brand-dark)}
.ts-v form button[type=submit]:active{transform:scale(.99)}
.ts-v form button[type=submit]:disabled{opacity:.6;cursor:progress}
.ts-v .ts-note{margin:16px 0 0;color:var(--muted)}
.ts-v .ts-result{margin-top:20px;border-radius:16px;padding:20px;border:1px solid var(--line);background:var(--tint);animation:ts-in .2s var(--ease)}
.ts-v .ts-result h3{display:inline-block;margin:0 0 12px;padding:2px 8px;border:2px solid currentColor;border-radius:6px;font-size:20px;font-weight:600;line-height:1.3;color:var(--bar);transform:rotate(-2deg)}
.ts-v .ts-result p{margin:0}
.ts-v .ts-result ul{margin:8px 0 0;padding-left:20px}
.ts-v .ts-result li{margin:4px 0}
.ts-v .ts-result button{margin-top:16px;background:var(--surface);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}
.ts-v .ts-result button:hover{background:var(--field)}
.ts-v .ts-result[data-verdict=arnaque]{--bar:#b3261e;--tint:#fdf0ee}
.ts-v .ts-result[data-verdict=a_verifier]{--bar:#7a5200;--tint:#fdf6e6}
.ts-v .ts-result[data-verdict=aucun_signe]{--bar:#3d4a43;--tint:#fff}
@keyframes ts-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ts-v .ts-result{animation:none}}
.ts-v .ts-phone{background:var(--surface);border:1px solid var(--line);border-radius:28px;padding:12px;max-width:340px;margin-inline:auto}
.ts-v .ts-screen{background:var(--field);border-radius:16px;padding:16px 12px;min-height:200px;display:flex;flex-direction:column;gap:8px}
.ts-v .ts-from{text-align:center;font-size:13px;font-weight:500;color:var(--muted)}
.ts-v .ts-bubble{background:#e8f2ed;border-radius:16px 16px 16px 4px;padding:12px;font-size:15px;white-space:pre-wrap;word-break:break-word;max-width:94%}
.ts-v .ts-bubble[data-empty=true]{color:var(--muted);background:transparent;border:1px dashed var(--line)}
.ts-v .ts-bubble mark{background:rgba(179,38,30,.16);color:inherit;border-radius:4px;padding:0 2px}
`;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = h("style", { id: STYLE_ID });
  style.textContent = CSS;
  document.head.append(style);
}

// Links are highlighted as DOM nodes (never innerHTML) so the pasted text stays inert.
function bubbleContent(text: string): (Node | string)[] {
  return text.split(/(https?:\/\/\S+|www\.\S+|bit\.ly\S*)/gi).map((part, i) => (i % 2 ? h("mark", {}, part) : part));
}

export function mountVerifier(el: HTMLElement, opts: { apiBase: string; lang: Lang; fetchFn?: typeof fetch }): () => void {
  const { lang } = opts;
  const fetchFn = opts.fetchFn ?? fetch;
  const failed = (key: "check_failed" | "too_many"): CheckResult => ({ verdict: "a_verifier", reasons: [reasonText(key, lang)], source: "erreur" });

  injectStyle();
  el.classList.add("ts-v");

  const sms = h("textarea", { id: "ts-sms", maxLength: MAX_TEXT, rows: 5, placeholder: t(UI.smsPlaceholder, lang) });
  const sender = h("input", { id: "ts-sender", maxLength: 40 });
  const submit = h("button", { type: "submit" }, t(UI.submit, lang));
  const result = h("div");
  result.setAttribute("aria-live", "polite");
  const form = h("form", {},
    h("label", { htmlFor: "ts-sms" }, t(UI.smsLabel, lang)), sms,
    h("label", { htmlFor: "ts-sender" }, t(UI.senderLabel, lang)), sender,
    submit);

  const pFrom = h("div", { className: "ts-from" });
  const pBubble = h("div", { className: "ts-bubble" });
  const syncPreview = () => {
    pFrom.textContent = sender.value.trim() || t(UI.previewUnknown, lang);
    const empty = !sms.value.trim();
    pBubble.setAttribute("data-empty", String(empty));
    pBubble.replaceChildren(...(empty ? [t(UI.previewEmpty, lang)] : bubbleContent(sms.value)));
  };
  syncPreview();
  sms.addEventListener("input", syncPreview);
  sender.addEventListener("input", syncPreview);

  const say = (msg: string) => {
    result.className = "ts-note";
    result.removeAttribute("data-verdict");
    result.replaceChildren(h("p", {}, msg));
  };

  const show = (r: CheckResult) => {
    const v = VERDICT[r.verdict];
    // Server text is rendered as text, never as HTML; "authentique" is never shown whatever the source says.
    const reasons = r.reasons.filter((x) => !/authentique/i.test(x)).map((x) => h("li", {}, x));
    const audio = h("audio", { src: AUDIO[r.verdict], preload: "none" });
    result.className = "ts-result";
    result.setAttribute("data-verdict", r.verdict);
    result.replaceChildren(
      h("h3", {}, t(v.title, lang)),
      h("p", {}, t(v.advice, lang)),
      h("ul", {}, ...reasons),
      audio,
      h("button", { type: "button", onclick: () => void audio.play().catch(() => {}) }, t(UI.listen, lang)));
  };

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    if (!sms.value.trim()) return say(t(UI.empty, lang));
    const text = maskPII(sms.value.slice(0, MAX_TEXT));
    const from = sender.value.trim() ? maskPII(sender.value.trim()) : undefined;
    const local = checkRules({ text, sender: from }, lang);
    if (local) return show(local);

    say(t(UI.checking, lang));
    submit.disabled = true;
    try {
      const res = await fetchFn(`${opts.apiBase}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sender: from, lang }),
      });
      if (res.status === 429) return show(failed("too_many"));
      const body = res.ok ? await res.json() : null;
      show(body && body.verdict in VERDICT ? body : failed("check_failed"));
    } catch {
      show(failed("check_failed"));
    } finally {
      submit.disabled = false;
    }
  };

  form.addEventListener("submit", onSubmit);
  el.replaceChildren(
    h("h2", {}, t(UI.title, lang)),
    h("p", { className: "ts-lead" }, t(UI.lead, lang)),
    h("div", { className: "ts-grid" },
      h("div", {}, form, result),
      h("aside", { className: "ts-side" }, h("div", { className: "ts-phone" }, h("div", { className: "ts-screen" }, pFrom, pBubble)))));
  return () => {
    form.removeEventListener("submit", onSubmit);
    sms.removeEventListener("input", syncPreview);
    sender.removeEventListener("input", syncPreview);
    el.classList.remove("ts-v");
    el.replaceChildren();
  };
}