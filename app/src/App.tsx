import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { createLocalTransport, createNostrTransport, type ConfirmationTransport } from "./lib/confirmation";
import { fetchBtcEur } from "./lib/price";
import { getVendorSk } from "./state/keys";
import { createDemoWallet } from "./wallet/demo";
import type { Wallet } from "./wallet/types";
import { Vendor } from "./screens/Vendor";
import { Delivery } from "./screens/Delivery";
import { Receipt } from "./screens/Receipt";
import { VerifierHost } from "./screens/VerifierHost";
import { Brand } from "./components/Brand";
import { t, type Lang } from "./i18n";

// Slogan de la page d'accueil. ponytail: wolof généré automatiquement, à faire relire par un locuteur natif.
const HOME_TAGLINE: Record<Lang, string> = {
  fr: "Encaissez en FCFA, livrez sans risque",
  wo: "Jot sa xaalis ci FCFA, yóbbu ci kaaraange",
};
const HOME_SUB: Record<Lang, string> = {
  fr: "Le livreur voit « Payé » seulement après la preuve de paiement",
  wo: "Ki yóbbu marsandiis bi dina gis « Fey nañu » su firnde fey bi feeñee rekk",
};

function readDemo(): boolean {
  try {
    const demo = new URLSearchParams(location.search).get("demo");
    if (demo === "1") localStorage.setItem("ts-demo", "1");
    if (demo === "0") localStorage.removeItem("ts-demo"); // the flag sticks otherwise: ?demo=0 leaves demo mode
    return localStorage.getItem("ts-demo") === "1";
  } catch { return false; }
}
function readLang(): Lang {
  try { return localStorage.getItem("ts-lang") === "wo" ? "wo" : "fr"; } catch { return "fr"; }
}
function parseHash(): { route: string; params: URLSearchParams } {
  const h = location.hash.replace(/^#/, "");
  const [path, query = ""] = h.split("?");
  return { route: path || "/", params: new URLSearchParams(query) };
}

let demoWallet: Wallet | null = null;
let demoTransport: ConfirmationTransport | null = null;
let nostrTransport: ConfirmationTransport | null = null;

function VendorGate({ demo, lang }: { demo: boolean; lang: Lang }) {
  const [wallet, setWallet] = useState<Wallet | null>(demo ? (demoWallet ??= createDemoWallet()) : null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // window.prompt() n'existe pas partout (navigateur intégré de VS Code, Electron) : le code se saisit dans la page.
  const [askCode, setAskCode] = useState(false);
  const [code, setCode] = useState("");
  const giveCode = useRef<((c: string) => void) | null>(null);
  const transport = demo ? (demoTransport ??= createLocalTransport()) : (nostrTransport ??= createNostrTransport());
  const deps = useMemo(
    () => (wallet ? { wallet, transport, fetchBtcEur: () => fetchBtcEur(), vendorSk: getVendorSk(), origin: location.origin } : null),
    [wallet],
  );
  if (deps) return <Vendor deps={deps} lang={lang} />;
  const connect = async () => {
    setBusy(true); setErr("");
    try {
      const { connectBreezWallet } = await import("./wallet/breez");
      setWallet(await connectBreezWallet({
        apiKey: import.meta.env.VITE_BREEZ_API_KEY ?? "",
        fallbackCode: () => new Promise<string>((resolve) => { giveCode.current = resolve; setAskCode(true); }),
      }));
    } catch (e) {
      setErr((e as Error).message || "Connexion impossible");
    } finally { setBusy(false); setAskCode(false); }
  };
  const submitCode = (e: Event) => {
    e.preventDefault();
    giveCode.current?.(code);
    giveCode.current = null;
    setCode("");
  };
  return (
    <main className="screen">
      <Brand />
      <div className="card stack">
        {askCode ? (
          <form className="stack" onSubmit={submitCode}>
            <label className="field">
              <span>{t("code_label", lang)}</span>
              <input className="input" type="password" inputMode="numeric" autoComplete="off" pattern="\d{6}" maxLength={6} required autoFocus
                value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value)} />
            </label>
            <button className="btn" type="submit">{t("code_submit", lang)}</button>
          </form>
        ) : (
          <button className="btn" onClick={connect} disabled={busy}>{t("connect_wallet", lang)}</button>
        )}
        {err && <p className="notice notice--error" role="alert">{err}</p>}
      </div>
    </main>
  );
}

export function App() {
  const [, force] = useState(0);
  const [lang, setLang] = useState<Lang>(readLang);
  const demo = readDemo();
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const changeLang = (l: Lang) => { setLang(l); try { localStorage.setItem("ts-lang", l); } catch { /* ignoré */ } };

  const { route, params } = parseHash();
  if (route === "/vendeur") return <VendorGate demo={demo} lang={lang} />;
  if (route === "/livraison") {
    const transport = demo ? (demoTransport ??= createLocalTransport()) : (nostrTransport ??= createNostrTransport());
    return <Delivery d={params.get("d") ?? ""} deps={{ transport }} demo={demo} lang={lang} />;
  }
  if (route === "/recu") return <Receipt e={params.get("e") ?? ""} o={params.get("o") ?? ""} lang={lang} demo={demo} />;
  if (route === "/verifier") return <VerifierHost lang={lang} />;

  const tagline = HOME_TAGLINE[lang] || HOME_TAGLINE.fr;
  const sub = HOME_SUB[lang] || HOME_SUB.fr;

  return (
    <main className="screen">
      <Brand />
      <h1 className="tagline">{tagline}</h1>
      <p className="sub">{sub}</p>
      <div className="stack">
        <a className="choice" href="#/vendeur">
          <span className="choice__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 12h-13zM9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
          </span>
          {t("home_vendor", lang)}
        </a>
        <a className="choice choice--sms" href="#/verifier">
          <span className="choice__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H8l-4 4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
          </span>
          {t("home_sms", lang)}
        </a>
      </div>
      <div className="lang">
        <button onClick={() => changeLang("fr")} disabled={lang === "fr"}>{t("lang_fr", lang)}</button>
        <button onClick={() => changeLang("wo")} disabled={lang === "wo"}>{t("lang_wo", lang)}</button>
      </div>
      {demo && <small className="demo-flag">{t("demo_mode", lang)}</small>}
    </main>
  );
}