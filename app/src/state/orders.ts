import type { DeliveryOrder } from "../lib/delivery-link";

export type Order = DeliveryOrder & { paymentHash: string; createdAt: number; paid?: { preimage: string; at: number } };
const KEY = "ts-orders";

export function createOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const r = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(r, (b) => chars[b % chars.length]).join("");
}
export function listOrders(): Order[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(list: Order[]) { localStorage.setItem(KEY, JSON.stringify(list)); }
export function saveOrder(o: Order): void {
  const list = listOrders().filter((x) => x.orderId !== o.orderId);
  list.unshift(o);
  write(list);
}
export function markPaid(paymentHash: string, preimage: string): Order | null {
  const list = listOrders();
  const o = list.find((x) => x.paymentHash === paymentHash);
  if (!o) return null;
  o.paid = { preimage, at: Date.now() };
  write(list);
  return o;
}
