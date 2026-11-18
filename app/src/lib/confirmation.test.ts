import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { buildConfirmation, isValidConfirmation, createLocalTransport } from "./confirmation";

const sk = generateSecretKey();
const pk = getPublicKey(sk);
const pre = randomBytes(32).toString("hex");
const hash = createHash("sha256").update(Buffer.from(pre, "hex")).digest("hex");
const order = { orderId: "A42", vendorPubkey: pk, paymentHash: hash };
const ev = buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: pre, sats: 27949 }, sk);

describe("confirmation", () => {
  it("accepte une confirmation correcte", async () => expect(await isValidConfirmation(ev, order)).toBe(true));
  it("rejette un autre vendeur", async () =>
    expect(await isValidConfirmation(ev, { ...order, vendorPubkey: getPublicKey(generateSecretKey()) })).toBe(false));
  it("rejette une signature cassée", async () =>
    expect(await isValidConfirmation({ ...ev, content: ev.content.replace("27949", "1") }, order)).toBe(false));
  it("rejette un mauvais preimage", async () =>
    expect(await isValidConfirmation(
      buildConfirmation({ orderId: "A42", paymentHash: hash, preimage: "00".repeat(32), sats: 1 }, sk), order)).toBe(false));
  it("rejette une autre commande", async () =>
    expect(await isValidConfirmation(
      buildConfirmation({ orderId: "B7", paymentHash: hash, preimage: pre, sats: 1 }, sk), order)).toBe(false));
  it("rejoue la confirmation à un abonné tardif (RF3)", async () => {
    const t = createLocalTransport("test-" + Math.random());
    await t.publish(ev);
    const got = await new Promise((r) => t.subscribe({ vendorPubkey: pk, orderId: "A42" }, r));
    expect(got).toEqual(JSON.parse(JSON.stringify(ev)));
  });
});
