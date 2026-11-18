import { useEffect, useState } from "preact/hooks";
import type { ConfirmationTransport } from "../lib/confirmation";
import { buildConfirmation } from "../lib/confirmation";
import { encodeDeliveryLink } from "../lib/delivery-link";
import { fcfaToSats, formatFcfa, parseFcfa } from "../lib/fcfa";
import { createOrderId, listOrders, markPaid, saveOrder, type Order } from "../state/orders";
import { t, type Lang } from "../i18n";
import type { Wallet } from "../wallet/types";
import { getPublicKey } from "nostr-tools";
import { Brand } from "../components/Brand";

export type VendorDeps = {
  wallet: Wallet;
  transport: ConfirmationTransport;
  fetchBtcEur: () => Promise<number>;
  vendorSk: Uint8Array;
  origin: string;
};

const INVOICE_SECS = 86400;

export function Vendor({ deps, lang = "fr" }: { deps: VendorDeps; lang?: Lang }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>(() => listOrders());
  const [balance, setBalance] = useState<number | null>(null);
  const [invoice, setInvoice] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refreshBalance = () => deps.wallet.getBalanceSats().then(setBalance).catch(() => {});

  useEffect(() => {
    refreshBalance();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const publishWithRetry = (order: Order, preimage: string) => {
      const start = Date.now();
      const attempt = async () => {
        try {
          await deps.transport.publish(
            buildConfirmation({ orderId: order.orderId, paymentHash: order.paymentHash, preimage, sats: order.sats }, deps.vendorSk),
          );
        } catch {
          if (Date.now() - start < 5 * 60_000) timers.add(setTimeout(attempt, 5000));
        }
      };
      attempt();
    };
    const off = deps.wallet.onPaymentReceived((p) => {
      const o = markPaid(p.paymentHash, p.preimage);
      if (!o) return;
      setOrders(listOrders());
      refreshBalance();
      publishWithRetry(o, p.preimage);
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, [deps]);

  async function create() {
    setError(""); setLink("");
    let fcfa: number;
    try { fcfa = parseFcfa(amount); } catch { setError(t("amount_invalid", lang)); return; }
    const name = label.trim().slice(0, 80);
    if (!name) { setError(t("vendor_label_required", lang)); return; }
    setBusy(true);
    try {
      let btcEur: number;
      try { btcEur = await deps.fetchBtcEur(); } catch { setError(t("vendor_price_down", lang)); return; }
      const sats = fcfaToSats(fcfa, btcEur);
      if (sats < 1) { setError(t("amount_invalid", lang)); return; }
      const orderId = createOrderId();
      const inv = await deps.wallet.createInvoice(sats, `Commande ${orderId} – ${name}`, INVOICE_SECS);
      const order: Order = {
        v: 1, orderId, fcfa, sats, label: name, bolt11: inv.bolt11,
        vendorPubkey: getPublicKey(deps.vendorSk), paymentHash: inv.paymentHash, createdAt: Date.now(),
      };
      saveOrder(order);
      setOrders(listOrders());
      const { paymentHash: _h, createdAt: _c, paid: _p, ...delivery } = order;
      setLink(encodeDeliveryLink(delivery, deps.origin));
    } catch (e) {
      console.error("Création de la commande impossible", e);
      setError(t("vendor_error", lang));
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setWithdrawMsg(null);
    const bolt11 = invoice.trim().replace(/^lightning:/i, "");
    if (!bolt11) return;
    setBusy(true);
    try {
      await deps.wallet.pay(bolt11);
      setInvoice("");
      setWithdrawMsg({ ok: true, text: t("withdraw_done", lang) });
      refreshBalance();
    } catch (e) {
      console.error("Retrait impossible", e);
      setWithdrawMsg({ ok: false, text: t("withdraw_error", lang) });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* sélection manuelle possible */ }
  }

  return (
    <main className="screen">
      <Brand />
      <h1 className="title">{t("vendor_title", lang)}</h1>
      {balance !== null && <p className="balance">{t("vendor_balance", lang)} : {balance} sats</p>}
      <div className="card card--left stack" style={{ marginTop: 16 }}>
        <label className="field">
          <span>{t("vendor_item", lang)}</span>
          <input className="input" value={label} onInput={(e) => setLabel((e.target as HTMLInputElement).value)} />
        </label>
        <label className="field">
          <span>{t("vendor_amount", lang)}</span>
          <input className="input" value={amount} inputMode="numeric" onInput={(e) => setAmount((e.target as HTMLInputElement).value)} />
        </label>
        <button className="btn" onClick={create} disabled={busy}>{t("vendor_create", lang)}</button>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
      </div>
      {link && (
        <section className="card card--left stack" style={{ marginTop: 16 }}>
          <textarea
            className="textarea"
            readOnly
            aria-label={t("vendor_link", lang)}
            value={link}
            rows={4}
            onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <div className="btn-row">
            <button className="btn btn--ghost" onClick={copy}>{copied ? t("vendor_copied", lang) : t("vendor_copy", lang)}</button>
            <a className="btn btn--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">{t("vendor_whatsapp", lang)}</a>
          </div>
          <button className="btn btn--ghost" onClick={() => { location.hash = link.slice(link.indexOf("#")); }}>{t("vendor_here", lang)}</button>
        </section>
      )}
      {!!balance && (
        <section className="card card--left stack" style={{ marginTop: 16 }}>
          <label className="field">
            <span>{t("withdraw_invoice", lang)}</span>
            <textarea className="textarea" rows={3} value={invoice} onInput={(e) => setInvoice((e.target as HTMLTextAreaElement).value)} />
          </label>
          <button className="btn btn--ghost" onClick={withdraw} disabled={busy || !invoice.trim()}>{t("withdraw_send", lang)}</button>
          {withdrawMsg && <p className={withdrawMsg.ok ? "notice" : "notice notice--error"} role={withdrawMsg.ok ? "status" : "alert"}>{withdrawMsg.text}</p>}
        </section>
      )}
      <h2 className="section-title">{t("vendor_orders", lang)}</h2>
      <ul className="orders">
        {orders.map((o) => (
          <li className="order" key={o.orderId}>
            <span className="order__id">{o.orderId}</span>
            <span className="order__label">{o.label}</span>
            <span className="order__amount nowrap">{formatFcfa(o.fcfa)}</span>
            <span className={o.paid ? "pill pill--paid stamp" : "pill"}>{o.paid ? t("paid", lang) : t("pending", lang)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}