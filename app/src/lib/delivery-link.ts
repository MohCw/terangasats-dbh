import { decode } from "light-bolt11-decoder";
import { MAX_FCFA } from "./fcfa";

export type DeliveryOrder = {
  v: 1; orderId: string; fcfa: number; sats: number;
  label: string; bolt11: string; vendorPubkey: string;
};
export class InvalidLinkError extends Error {}

const KEYS = ["v", "orderId", "fcfa", "sats", "label", "bolt11", "vendorPubkey"].sort().join(",");

export function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeDeliveryLink(order: DeliveryOrder, origin: string): string {
  return `${origin}/#/livraison?d=${toB64Url(JSON.stringify(order))}`;
}

export function invoiceInfo(bolt11: string): { paymentHash: string; sats: number; expiresAt: number } {
  if (bolt11.startsWith("demo:")) {
    const [, paymentHash, sats, expiresAt] = bolt11.split(":");
    return { paymentHash, sats: Number(sats), expiresAt: Number(expiresAt) };
  }
  const d = decode(bolt11);
  const sec = (name: string) => d.sections.find((s: any) => s.name === name) as any;
  const paymentHash = sec("payment_hash")?.value as string;
  const amount = sec("amount")?.value as string | undefined;
  const timestamp = sec("timestamp")?.value as number;
  const expiry = (sec("expiry")?.value as number | undefined) ?? 3600;
  if (!paymentHash || !amount || !timestamp) throw new Error("Facture incomplète");
  return { paymentHash, sats: Math.round(Number(amount) / 1000), expiresAt: timestamp + expiry };
}

export function isExpired(info: { expiresAt: number }, nowSecs: number): boolean {
  return nowSecs > info.expiresAt;
}

export function decodeDeliveryLink(d: string, opts?: { demo?: boolean }): DeliveryOrder {
  try {
    const o = JSON.parse(fromB64Url(d));
    if (!o || typeof o !== "object" || Array.isArray(o)) throw 0;
    if (Object.keys(o).sort().join(",") !== KEYS) throw 0;
    if (o.v !== 1) throw 0;
    if (typeof o.orderId !== "string" || !/^[A-Za-z0-9-]{1,40}$/.test(o.orderId)) throw 0;
    if (!Number.isInteger(o.fcfa) || o.fcfa < 1 || o.fcfa > MAX_FCFA) throw 0;
    if (typeof o.label !== "string" || o.label.length > 80) throw 0;
    if (typeof o.vendorPubkey !== "string" || !/^[0-9a-f]{64}$/.test(o.vendorPubkey)) throw 0;
    if (typeof o.bolt11 !== "string") throw 0;
    const isDemo = o.bolt11.startsWith("demo:");
    if (isDemo ? !opts?.demo : !/^ln(bc|tb|bcrt)[0-9a-z]+$/i.test(o.bolt11)) throw 0;
    if (!Number.isInteger(o.sats) || invoiceInfo(o.bolt11).sats !== o.sats) throw 0;
    return o as DeliveryOrder;
  } catch {
    throw new InvalidLinkError("Lien invalide");
  }
}
