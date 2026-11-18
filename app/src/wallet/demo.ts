import type { Payment, Wallet } from "./types";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

async function sha256Hex(preimageHex: string): Promise<string> {
  const bytes = Uint8Array.from(preimageHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

export function createDemoWallet(channel = "ts-demo-pay"): Wallet {
  const invoices = new Map<string, { preimage: string; sats: number }>();
  const listeners = new Set<(p: Payment) => void>();
  let balance = 0;
  const bc = new BroadcastChannel(channel);
  bc.onmessage = (m) => {
    if (m.data?.type !== "pay") return;
    const inv = invoices.get(m.data.paymentHash);
    if (!inv) return;
    balance += inv.sats;
    listeners.forEach((cb) => cb({ paymentHash: m.data.paymentHash, preimage: inv.preimage, sats: inv.sats }));
  };
  return {
    async createInvoice(sats, _description, expirySecs) {
      const preimage = hex(crypto.getRandomValues(new Uint8Array(32)));
      const paymentHash = await sha256Hex(preimage);
      invoices.set(paymentHash, { preimage, sats });
      const expiresAt = Math.floor(Date.now() / 1000) + expirySecs;
      return { bolt11: `demo:${paymentHash}:${sats}:${expiresAt}`, paymentHash };
    },
    onPaymentReceived(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async getBalanceSats() { return balance; },
    async pay() { throw new Error("Paiement sortant indisponible en démonstration"); },
  };
}

// appelé depuis l'onglet du livreur
export function requestDemoPayment(paymentHash: string, channel = "ts-demo-pay"): void {
  const bc = new BroadcastChannel(channel);
  bc.postMessage({ type: "pay", paymentHash });
  bc.close();
}
