import { useEffect, useState } from "preact/hooks";
import { nip19 } from "nostr-tools";
import { isValidConfirmation, type NostrEvent } from "../lib/confirmation";
import { decodeDeliveryLink, fromB64Url, invoiceInfo, toB64Url, type DeliveryOrder } from "../lib/delivery-link";
import { formatFcfa } from "../lib/fcfa";
import { t, type Lang } from "../i18n";
import { Brand } from "../components/Brand";


export function receiptLink(ev: NostrEvent, order: DeliveryOrder, origin: string): string {
  return `${origin}/#/recu?e=${toB64Url(JSON.stringify(ev))}&o=${toB64Url(JSON.stringify(order))}`;
}

type State = { ok: false } | { ok: true; order: DeliveryOrder; ev: NostrEvent; preimage: string } | null;

export function Receipt({ e, o, lang = "fr", demo = false }: { e: string; o: string; lang?: Lang; demo?: boolean }) {
  const [state, setState] = useState<State>(null);
  useEffect(() => {
    (async () => {
      try {
        const order = decodeDeliveryLink(o, { demo });
        const ev = JSON.parse(fromB64Url(e)) as NostrEvent;
        const paymentHash = invoiceInfo(order.bolt11).paymentHash;
        const valid = await isValidConfirmation(ev, { orderId: order.orderId, vendorPubkey: order.vendorPubkey, paymentHash });
        setState(valid ? { ok: true, order, ev, preimage: JSON.parse(ev.content).preimage } : { ok: false });
      } catch {
        setState({ ok: false });
      }
    })();
  }, [e, o, demo]);

  if (!state) return <main />;
  if (!state.ok) {
    return (
      <main className="screen">
        <Brand />
        <p className="notice notice--error notice--big" role="alert">{t("receipt_invalid", lang)}</p>
      </main>
    );
  }
  const { order, ev, preimage } = state;
  return (
    <main className="screen">
      <Brand />
      <div className="card receipt">
        <svg className="receipt__check" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" fill="#0b6b4d" />
          <path d="M18 33l9 9 19-20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h1 className="receipt__title"><span className="stamp">{t("paid", lang)}</span></h1>
        <p className="amount"><span className="nowrap">{formatFcfa(order.fcfa)}</span></p>
        <p className="meta">{order.label} · {order.sats} sats</p>
        <hr />
        <dl>
          <div>
            <dt>{t("receipt_proof", lang)}</dt>
            <dd><code>{preimage.slice(0, 8)}...{preimage.slice(-8)}</code></dd>
          </div>
          <div>
            <dt>{t("receipt_signed", lang)}</dt>
            <dd><code>{nip19.npubEncode(ev.pubkey)}</code></dd>
          </div>
        </dl>
        <p className="receipt__thanks">{t("receipt_thanks", lang)}</p>
      </div>
    </main>
  );
}