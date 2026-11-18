import { describe, it, expect } from "vitest";
import { COFFEE, COFFEE_HASH } from "./fixtures";
import {
  encodeDeliveryLink, decodeDeliveryLink, invoiceInfo, isExpired, InvalidLinkError, toB64Url, type DeliveryOrder,
} from "./delivery-link";

const b64 = (o: unknown) => toB64Url(JSON.stringify(o));
const order: DeliveryOrder = {
  v: 1, orderId: "A42", fcfa: 16500, sats: 250000,
  label: "Mocassins, 42", bolt11: COFFEE, vendorPubkey: "a".repeat(64),
};

describe("delivery link", () => {
  const url = encodeDeliveryLink(order, "https://ts.example");
  const d = new URL(url.replace("#/livraison", "livraison")).searchParams.get("d")!;

  it("aller-retour", () => expect(decodeDeliveryLink(d)).toEqual(order));
  it("lien tronqué → invalide (RF1)", () => {
    expect(() => decodeDeliveryLink(d.slice(0, -5))).toThrow(InvalidLinkError);
    expect(() => decodeDeliveryLink("abimé")).toThrow(InvalidLinkError);
  });
  it("champ en plus, sats incohérents, clé invalide", () => {
    expect(() => decodeDeliveryLink(b64({ ...order, nsec: "x" }))).toThrow(InvalidLinkError);
    expect(() => decodeDeliveryLink(b64({ ...order, sats: 1 }))).toThrow(InvalidLinkError);
    expect(() => decodeDeliveryLink(b64({ ...order, vendorPubkey: "zz" }))).toThrow(InvalidLinkError);
  });
  it("format demo refusé hors mode démo", () => {
    const demo = { ...order, bolt11: `demo:${"b".repeat(64)}:250000:9999999999` };
    expect(() => decodeDeliveryLink(b64(demo))).toThrow(InvalidLinkError);
    expect(decodeDeliveryLink(b64(demo), { demo: true })).toEqual(demo);
  });
  it("infos de facture et expiration (RF2)", () => {
    expect(invoiceInfo(COFFEE)).toEqual({ paymentHash: COFFEE_HASH, sats: 250000, expiresAt: 1496314658 + 60 });
    expect(isExpired(invoiceInfo(COFFEE), 1496314658 + 61)).toBe(true);
    expect(isExpired(invoiceInfo(COFFEE), 1496314658 + 10)).toBe(false);
  });
});
