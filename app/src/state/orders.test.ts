import { describe, it, expect, beforeEach } from "vitest";
import { saveOrder, listOrders, markPaid, createOrderId, type Order } from "./orders";

const pre = "ab".repeat(32);
const order: Order = {
  v: 1, orderId: "A42", fcfa: 16500, sats: 27949, label: "Mocassins", bolt11: "lnbc1x",
  vendorPubkey: "a".repeat(64), paymentHash: "h".repeat(64), createdAt: 1,
};

describe("orders", () => {
  beforeEach(() => localStorage.clear());
  it("enregistre et liste", () => {
    saveOrder(order);
    expect(listOrders()).toHaveLength(1);
  });
  it("marque payé", () => {
    saveOrder(order);
    expect(markPaid("inconnu", "00")).toBeNull();
    expect(markPaid(order.paymentHash, pre)?.paid?.preimage).toBe(pre);
  });
  it("identifiant de 6 caractères", () => expect(createOrderId()).toMatch(/^[A-Z0-9]{6}$/));
});
