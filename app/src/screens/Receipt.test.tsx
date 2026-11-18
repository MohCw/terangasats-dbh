import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { createHash, randomBytes } from "node:crypto";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { Receipt, receiptLink } from "./Receipt";
import { buildConfirmation } from "../lib/confirmation";
import { toB64Url, type DeliveryOrder } from "../lib/delivery-link";

const sk = generateSecretKey();
const pre = randomBytes(32).toString("hex");
const hash = createHash("sha256").update(Buffer.from(pre, "hex")).digest("hex");
const order: DeliveryOrder = {
  v: 1, orderId: "A42", fcfa: 16500, sats: 27949, label: "Mocassins",
  bolt11: `demo:${hash}:27949:9999999999`, vendorPubkey: getPublicKey(sk),
};
const ev = buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: pre, sats: 27949 }, sk);
const b64 = (x: unknown) => toB64Url(JSON.stringify(x));

describe("Receipt", () => {
  it("affiche un reçu valide", async () => {
    render(<Receipt e={b64(ev)} o={b64(order)} demo />);
    expect(await screen.findByText(/16 500 F/)).toBeTruthy();
    expect(screen.getByText(/npub1/)).toBeTruthy();
    expect(screen.getByText("Jërëjëf !")).toBeTruthy();
  });
  it("rejette un reçu modifié", async () => {
    render(<Receipt e={b64({ ...ev, content: "x" })} o={b64(order)} demo />);
    expect(await screen.findByText("Reçu invalide")).toBeTruthy();
  });
  it("génère un lien de reçu", () => {
    expect(receiptLink(ev, order, "https://ts.example")).toContain("#/recu?e=");
  });
});
