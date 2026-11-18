import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { generateSecretKey } from "nostr-tools";
import { Vendor } from "./Vendor";
import { createDemoWallet, requestDemoPayment } from "../wallet/demo";
import { createLocalTransport } from "../lib/confirmation";
import { decodeDeliveryLink, invoiceInfo } from "../lib/delivery-link";

function setup() {
  localStorage.clear();
  const ch = "v-" + Math.random();
  const wallet = createDemoWallet(ch);
  const transport = createLocalTransport("t-" + ch);
  render(<Vendor deps={{ wallet, transport, fetchBtcEur: async () => 90000, vendorSk: generateSecretKey(), origin: "https://ts.example" }} />);
  return { ch, transport };
}
const fill = (label: string, amount: string) => {
  fireEvent.input(screen.getByLabelText("Article"), { target: { value: label } });
  fireEvent.input(screen.getByLabelText("Montant (FCFA)"), { target: { value: amount } });
  fireEvent.click(screen.getByText("Créer le lien"));
};

describe("Vendor", () => {
  beforeEach(() => document.body.replaceChildren());

  it("crée un lien de livraison", async () => {
    setup();
    fill("Mocassins, 42", "16 500");
    const box = (await screen.findByRole("textbox", { name: "Lien de livraison" })) as HTMLTextAreaElement;
    expect(box.value).toContain("#/livraison?d=");
  });

  it("rejette un montant invalide (RF5)", async () => {
    setup();
    fill("Mocassins", "0");
    expect(await screen.findByText("Montant invalide")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Lien de livraison" })).toBeNull();
  });

  it("publie une confirmation et passe à Payé", async () => {
    const { ch, transport } = setup();
    fill("Mocassins, 42", "16 500");
    const box = (await screen.findByRole("textbox", { name: "Lien de livraison" })) as HTMLTextAreaElement;
    const d = new URL(box.value.replace("#/livraison", "livraison")).searchParams.get("d")!;
    const order = decodeDeliveryLink(d, { demo: true });
    const got = new Promise((r) => transport.subscribe({ vendorPubkey: order.vendorPubkey, orderId: order.orderId }, r));
    requestDemoPayment(invoiceInfo(order.bolt11).paymentHash, ch);
    await got;
    await waitFor(() => expect(screen.getByText(/Payé/)).toBeTruthy());
  });

  it("retire les sats vers une facture collée", async () => {
    localStorage.clear();
    const paid: string[] = [];
    const wallet = { ...createDemoWallet("w-" + Math.random()), getBalanceSats: async () => 500, pay: async (b: string) => { paid.push(b); } };
    render(<Vendor deps={{ wallet, transport: createLocalTransport(), fetchBtcEur: async () => 90000, vendorSk: generateSecretKey(), origin: "https://ts.example" }} />);
    const box = await screen.findByLabelText(/Facture Lightning/);
    fireEvent.input(box, { target: { value: " lightning:lnbc1test " } });
    fireEvent.click(screen.getByText("Retirer"));
    expect(await screen.findByText("Retrait envoyé")).toBeTruthy();
    expect(paid).toEqual(["lnbc1test"]);
  });
});
