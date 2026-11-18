import { finalizeEvent, verifyEvent, SimplePool, type Event as NostrEvent } from "nostr-tools";
import { verifyPreimage } from "./proof";

export type { NostrEvent };
export const CONFIRMATION_KIND = 30078;
export const RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"];
export type Confirmation = { orderId: string; paymentHash: string; preimage: string; sats: number };

const dTag = (orderId: string) => `terangasats:${orderId}`;

export function buildConfirmation(c: Confirmation, sk: Uint8Array): NostrEvent {
  return finalizeEvent(
    {
      kind: CONFIRMATION_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", dTag(c.orderId)]],
      content: JSON.stringify(c),
    },
    sk,
  );
}

export async function isValidConfirmation(
  ev: NostrEvent,
  order: { orderId: string; vendorPubkey: string; paymentHash: string },
): Promise<boolean> {
  try {
    if (ev.kind !== CONFIRMATION_KIND) return false;
    if (ev.pubkey !== order.vendorPubkey) return false;
    // copie nue : nostr-tools mémorise le résultat de vérification sur l'objet, on force un recalcul
    const bare: NostrEvent = { id: ev.id, pubkey: ev.pubkey, created_at: ev.created_at, kind: ev.kind, tags: ev.tags, content: ev.content, sig: ev.sig };
    if (!verifyEvent(bare)) return false;
    if (!ev.tags.some((t) => t[0] === "d" && t[1] === dTag(order.orderId))) return false;
    const c = JSON.parse(ev.content) as Confirmation;
    if (c.orderId !== order.orderId || c.paymentHash !== order.paymentHash) return false;
    return await verifyPreimage(c.preimage, order.paymentHash);
  } catch {
    return false;
  }
}

export interface ConfirmationTransport {
  publish(ev: NostrEvent): Promise<void>;
  subscribe(
    f: { vendorPubkey: string; orderId: string },
    onEvent: (ev: NostrEvent) => void,
    onStatus?: (s: "connecte" | "deconnecte") => void,
  ): () => void;
}

export function createNostrTransport(relays: string[] = RELAYS): ConfirmationTransport {
  const pool = new SimplePool();
  return {
    async publish(ev) {
      const results = await Promise.allSettled(pool.publish(relays, ev));
      if (!results.some((r) => r.status === "fulfilled")) throw new Error("Publication impossible");
    },
    subscribe(f, onEvent, onStatus) {
      let closedRelays = 0;
      let alive = true;
      const report = () => {
        if (!alive) return;
        onStatus?.(closedRelays >= relays.length || !navigator.onLine ? "deconnecte" : "connecte");
      };
      // pas de `since` : les relais renvoient aussi une confirmation déjà publiée (RF3)
      const sub = pool.subscribeMany(
        relays,
        { kinds: [CONFIRMATION_KIND], authors: [f.vendorPubkey], "#d": [dTag(f.orderId)] } as any,
        {
          onevent: onEvent,
          onclose: () => { closedRelays++; report(); },
        },
      );
      const on = () => report();
      window.addEventListener("online", on);
      window.addEventListener("offline", on);
      report();
      return () => {
        alive = false;
        window.removeEventListener("online", on);
        window.removeEventListener("offline", on);
        sub.close();
      };
    },
  };
}

const STORE_KEY = "ts-demo-events";

function readStore(): Record<string, NostrEvent> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}

export function createLocalTransport(channel = "ts-demo"): ConfirmationTransport {
  const key = (ev: { pubkey: string; tags: string[][] }) =>
    `${ev.pubkey}|${ev.tags.find((t) => t[0] === "d")?.[1] ?? ""}`;
  return {
    async publish(ev) {
      const store = readStore();
      store[key(ev)] = ev;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* ignoré */ }
      const bc = new BroadcastChannel(channel);
      bc.postMessage(ev);
      bc.close();
    },
    subscribe(f, onEvent, onStatus) {
      const k = `${f.vendorPubkey}|${dTag(f.orderId)}`;
      const bc = new BroadcastChannel(channel);
      bc.onmessage = (m) => { if (key(m.data) === k) onEvent(m.data); };
      const past = readStore()[k];
      if (past) setTimeout(() => onEvent(past), 0); // rejoue la confirmation déjà publiée
      onStatus?.("connecte");
      return () => bc.close();
    },
  };
}
