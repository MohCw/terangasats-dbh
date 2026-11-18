import { useEffect, useRef, useState } from "preact/hooks";
import QRCode from "qrcode";
import { generateSecretKey } from "nostr-tools";
import { buildConfirmation, isValidConfirmation, type ConfirmationTransport, type NostrEvent } from "../lib/confirmation";
import { decodeDeliveryLink, invoiceInfo, isExpired, type DeliveryOrder } from "../lib/delivery-link";
import { formatFcfa } from "../lib/fcfa";
import { t, type Lang } from "../i18n";
import { requestDemoPayment } from "../wallet/demo";
import { receiptLink } from "./Receipt";
import { Brand } from "../components/Brand";

export type DeliveryDeps = { transport: ConfirmationTransport; now?: () => number };

type Parsed = { kind: "invalid" } | { kind: "expired" } | { kind: "ok"; order: DeliveryOrder; paymentHash: string };

function parse(d: string, demo: boolean, now: number): Parsed {
  try {
    const order = decodeDeliveryLink(d, { demo });
    const info = invoiceInfo(order.bolt11);
    if (isExpired(info, now)) return { kind: "expired" };
    return { kind: "ok", order, paymentHash: info.paymentHash };
  } catch {
    return { kind: "invalid" };
  }
}

export function Delivery({ d, deps, demo = false, lang = "fr" }: { d: string; deps: DeliveryDeps; demo?: boolean; lang?: Lang }) {
  const nowFn = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const parsed = parse(d, demo, nowFn());
  const [paidEv, setPaidEv] = useState<NostrEvent | null>(null);
  const [lost, setLost] = useState(false);
  const [refused, setRefused] = useState(false);
  const [qr, setQr] = useState("");
  const [delayMs, setDelayMs] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  const ok = parsed.kind === "ok" ? parsed : null;

  const handleEvent = async (ev: NostrEvent) => {
    if (!ok) return;
    const valid = await isValidConfirmation(ev, { orderId: ok.order.orderId, vendorPubkey: ok.order.vendorPubkey, paymentHash: ok.paymentHash });
    if (valid) {
      setPaidEv(ev);
      setRefused(false);
      if (startRef.current !== null) setDelayMs(Date.now() - startRef.current);
    } else if (demo) {
      setRefused(true); // hors démonstration, un événement invalide est simplement ignoré
    }
  };

  useEffect(() => {
    if (!ok) return;
    QRCode.toDataURL(ok.order.bolt11.startsWith("demo:") ? ok.order.bolt11 : ok.order.bolt11.toUpperCase(), { margin: 1, width: 260 })
      .then(setQr).catch(() => {});
    return deps.transport.subscribe(
      { vendorPubkey: ok.order.vendorPubkey, orderId: ok.order.orderId },
      handleEvent,
      (s) => setLost(s === "deconnecte"),
    );
  }, [d]);

  if (!ok) {
    return (
      <main className="screen">
        <Brand />
        <p className="notice notice--error" role="alert">{t(parsed.kind === "expired" ? "expired" : "invalid_link", lang)}</p>
      </main>
    );
  }
  const { order } = ok;

  if (paidEv) {
    return (
      <main className="screen screen--paid">
        <div className="paid">
          <svg className="paid__check" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" stroke-width="3" />
            <path d="M34 62l17 17 35-37" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <h1 className="paid__title">{t("paid", lang)}</h1>
          <p className="paid__detail">{order.label} · <span className="nowrap">{formatFcfa(order.fcfa)}</span> · {order.sats} sats</p>
          {demo && delayMs !== null && <p className="chip">{t("demo_delay", lang)} : {delayMs} ms</p>}
          <a
            className="btn"
            href={`https://wa.me/?text=${encodeURIComponent(receiptLink(paidEv, order, location.origin))}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("send_receipt", lang)}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <Brand />
      <div className="card">
        <h1 className="eyebrow">{t("delivery_title", lang)} · {order.orderId}</h1>
        <p className="amount"><span className="nowrap">{formatFcfa(order.fcfa)}</span></p>
        <p className="meta">{order.label} · {order.sats} sats</p>
        <div className="qr">
          {qr && <img src={qr} alt="QR Lightning" width={260} height={260} />}
        </div>
        <p className="status"><span className="dot" aria-hidden="true" />{t("pending", lang)}</p>
        {lost && <p className="notice notice--info" role="status">{t("connection_lost", lang)}</p>}
        {refused && <p className="notice notice--error" role="alert">{t("refused", lang)}</p>}
      </div>
      {demo && (
        <div className="demo">
          <button className="btn btn--ghost" onClick={() => { startRef.current = Date.now(); requestDemoPayment(ok.paymentHash); }}>{t("demo_pay", lang)}</button>
          <button
            className="btn btn--ghost"
            onClick={() => handleEvent(buildConfirmation(
              { orderId: order.orderId, paymentHash: ok.paymentHash, preimage: "00".repeat(32), sats: order.sats }, generateSecretKey()))}
          >{t("demo_fake", lang)}</button>
        </div>
      )}
    </main>
  );
}