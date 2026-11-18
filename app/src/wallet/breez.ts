import type { Payment, Wallet } from "./types";

const PREIMAGES_KEY = "ts-preimages";
const FALLBACK_KEY = "ts-fallback-seed";
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function loadPreimages(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PREIMAGES_KEY) ?? "{}"); } catch { return {}; }
}
function savePreimage(hash: string, pre: string) {
  const m = loadPreimages(); m[hash] = pre;
  localStorage.setItem(PREIMAGES_KEY, JSON.stringify(m));
}

async function sha256Hex(preimageHex: string): Promise<string> {
  const bytes = Uint8Array.from(preimageHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

// ── Solution de repli si la passkey est indisponible (décision A0) ──
// Entropie de 16 octets chiffrée en AES-GCM avec une clé dérivée (PBKDF2) d'un code à 6 chiffres.
// Limite : 10^6 combinaisons, donc une personne qui vole le téléphone peut tenter toutes les valeurs hors ligne.
async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 300_000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}
export async function fallbackSeed(code: string): Promise<number[]> {
  if (!/^\d{6}$/.test(code)) throw new Error("Code à 6 chiffres requis");
  const stored = localStorage.getItem(FALLBACK_KEY);
  if (!stored) {
    const entropy = crypto.getRandomValues(new Uint8Array(16));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(code, salt), entropy));
    localStorage.setItem(FALLBACK_KEY, JSON.stringify({ s: hex(salt), i: hex(iv), c: hex(ct) }));
    return Array.from(entropy);
  }
  const { s, i, c } = JSON.parse(stored);
  const h = (x: string) => Uint8Array.from(x.match(/../g)!.map((v) => parseInt(v, 16)));
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: h(i) as BufferSource }, await deriveKey(code, h(s)), h(c) as BufferSource);
    return Array.from(new Uint8Array(pt));
  } catch {
    throw new Error("Code incorrect");
  }
}

export async function connectBreezWallet(opts: { apiKey: string; fallbackCode?: () => Promise<string> }): Promise<Wallet> {
  // import dynamique : le SDK (morceau « breez ») n'est jamais chargé côté livreur
  const sdk: any = await import("@breeztech/breez-sdk-spark/web");
  await sdk.default();
  const { PasskeyProvider } = await import("@breeztech/breez-sdk-spark/passkey-prf-provider");

  let seed: any;
  // Our own domain as Relying Party: the Breez shared RP (keys.breez.technology) only accepts apps registered with Breez.
  // ponytail: the passkey (so the wallet) is tied to this hostname; a new domain means a new wallet, sweep funds first.
  const provider = new PasskeyProvider({ rpId: location.hostname, rpName: "TerangaSats" }, { hints: ["client-device"] });
  const client = new sdk.PasskeyClient(provider, opts.apiKey);
  const avail = await client.checkAvailability();
  if (avail.type !== "available") console.warn("Passkey :", avail); // prfUnsupported | notAssociated | skipped
  // "skipped" only means the SDK could not check the domain: the passkey may still work, so try it.
  if (avail.type === "available" || avail.type === "skipped") {
    try {
      seed = (await client.supportsImmediateMediation())
        ? (await client.connectWithPasskey({})).wallet.seed
        // Without immediate mediation (Safari, Firefox) the SDK cannot auto-detect: sign in, register the first time.
        // ponytail: cancelling the sign-in also lands in register (a new wallet); add explicit buttons if that confuses users.
        : await client.signIn({}).then((r: any) => r.wallet.seed, async () => (await client.register({})).wallet.seed);
    } catch (e) {
      console.warn("Passkey refusée ou impossible, code de secours :", e);
    }
  }
  if (!seed) {
    if (!opts.fallbackCode) throw new Error("Passkey indisponible");
    const entropy = await fallbackSeed(await opts.fallbackCode());
    seed = Object.assign(entropy, { type: "entropy" });
  }
  const config = sdk.defaultConfig("mainnet");
  config.apiKey = opts.apiKey;
  const instance = await sdk.connect({ config, seed, storageDir: "terangasats" });

  return {
    async createInvoice(sats, description, expirySecs) {
      const preimage = hex(crypto.getRandomValues(new Uint8Array(32)));
      const paymentHash = await sha256Hex(preimage);
      savePreimage(paymentHash, preimage);
      const res = await instance.receivePayment({
        // the SDK rejects paymentHash + preimage together; it derives the hash from the preimage (checked: same value)
        paymentMethod: { type: "bolt11Invoice", description, amountSats: sats, expirySecs, preimage },
      });
      return { bolt11: res.paymentRequest, paymentHash };
    },
    onPaymentReceived(cb) {
      let id: string | undefined;
      let stopped = false;
      instance.addEventListener({
        onEvent: (e: any) => {
          if (e.type !== "paymentSucceeded" || e.payment?.paymentType !== "receive") return;
          const d = e.payment.details;
          const hash: string | undefined = d?.htlcDetails?.paymentHash;
          const preimage = hash ? loadPreimages()[hash] : undefined;
          if (hash && preimage) cb({ paymentHash: hash, preimage, sats: Number(e.payment.amount) } as Payment);
        },
      }).then((i: string) => { id = i; if (stopped) instance.removeEventListener?.(i); });
      return () => { stopped = true; if (id) instance.removeEventListener?.(id); };
    },
    async getBalanceSats() {
      return (await instance.getInfo({ ensureSynced: true })).balanceSats;
    },
    async pay(bolt11) {
      const prepareResponse = await instance.prepareSendPayment({ paymentRequest: { type: "input", input: bolt11 } });
      await instance.sendPayment({ prepareResponse });
    },
  };
}
