import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/preact";
import { createHash, randomBytes } from "node:crypto";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { Delivery } from "./Delivery";
import { buildConfirmation, type ConfirmationTransport, type NostrEvent } from "../lib/confirmation";
import { toB64Url, type DeliveryOrder } from "../lib/delivery-link";

const sk = generateSecretKey();
const pre = randomBytes(32).toString("hex");
const hash = createHash("sha256").update(Buffer.from(pre, "hex")).digest("hex");
const future = Math.floor(Date.now() / 1000) + 3600;
const order: DeliveryOrder = {
  v: 1, orderId: "A42", fcfa: 16500, sats: 27949, label: "Mocassins, 42",
  bolt11: `demo:${hash}:27949:${future}`, vendorPubkey: getPublicKey(sk),
};
const link = (o: unknown) => toB64Url(JSON.stringify(o));

function fakeTransport() {
  let onEvent: (ev: NostrEvent) => void = () => {};
  let onStatus: (s: "connecte" | "deconnecte") => void = () => {};
  const transport: ConfirmationTransport = {
    async publish() {},
    subscribe(_f, e, s) { onEvent = e; onStatus = s ?? (() => {}); return () => {}; },
  };
  return { transport, emit: (ev: NostrEvent) => onEvent(ev), status: (s: "connecte" | "deconnecte") => onStatus(s) };
}

describe("Delivery", () => {
  beforeEach(() => document.body.replaceChildren());

  it("lien abîmé (RF1)", () => {
    render(<Delivery d="abimé" deps={fakeTransport()} demo />);
    expect(screen.getByText("Lien invalide. Demandez un nouveau lien au vendeur.")).toBeTruthy();
  });

  it("facture expirée, sans QR (RF2)", () => {
    const f = fakeTransport();
    render(<Delivery d={link(order)} deps={{ transport: f.transport, now: () => future + 86400 }} demo />);
    expect(screen.getByText("Facture expirée. Demandez un nouveau lien au vendeur.")).toBeTruthy();
    expect(screen.queryByAltText("QR Lightning")).toBeNull();
  });

  it("affiche Payé après une confirmation valide", async () => {
    const f = fakeTransport();
    render(<Delivery d={link(order)} deps={f} demo />);
    await act(async () => f.emit(buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: pre, sats: 27949 }, sk)));
    expect(await screen.findByText("Payé")).toBeTruthy();
  });

  it("n'affiche pas Payé pour une mauvaise clé ou un mauvais preimage", async () => {
    const f = fakeTransport();
    render(<Delivery d={link(order)} deps={f} demo />);
    await act(async () => f.emit(buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: pre, sats: 1 }, generateSecretKey())));
    await act(async () => f.emit(buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: "00".repeat(32), sats: 1 }, sk)));
    await waitFor(() => expect(screen.getByText("Confirmation refusée")).toBeTruthy());
    expect(screen.queryByText("Payé")).toBeNull();
  });

  it("connexion perdue, jamais Payé par défaut (RF4)", async () => {
    const f = fakeTransport();
    render(<Delivery d={link(order)} deps={f} demo />);
    await act(async () => f.status("deconnecte"));
    expect(screen.getByText("Connexion perdue, nouvelle tentative…")).toBeTruthy();
    expect(screen.queryByText("Payé")).toBeNull();
  });
});
