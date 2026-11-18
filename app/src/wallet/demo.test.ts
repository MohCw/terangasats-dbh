import { describe, it, expect } from "vitest";
import { createDemoWallet, requestDemoPayment } from "./demo";
import { verifyPreimage } from "../lib/proof";
import type { Payment } from "./types";

describe("wallet de démonstration", () => {
  it("crée une facture et reçoit un paiement simulé", async () => {
    const ch = "demo-" + Math.random();
    const w = createDemoWallet(ch);
    const inv = await w.createInvoice(27949, "Commande A42", 86400);
    expect(inv.bolt11.startsWith("demo:" + inv.paymentHash + ":27949:")).toBe(true);
    const paid = new Promise<Payment>((r) => w.onPaymentReceived(r));
    requestDemoPayment(inv.paymentHash, ch);
    const p = await paid;
    expect(p.sats).toBe(27949);
    expect(await verifyPreimage(p.preimage, inv.paymentHash)).toBe(true);
    expect(await w.getBalanceSats()).toBe(27949);
  });
});
