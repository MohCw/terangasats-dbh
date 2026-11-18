import { generateSecretKey } from "nostr-tools";

const KEY = "ts-vendor-sk";
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function getVendorSk(): Uint8Array {
  const stored = localStorage.getItem(KEY);
  if (stored && /^[0-9a-f]{64}$/.test(stored)) return Uint8Array.from(stored.match(/../g)!.map((h) => parseInt(h, 16)));
  const sk = generateSecretKey();
  // ponytail: clé en clair acceptable car une fausse confirmation exige aussi le preimage ; passer en stockage chiffré si la clé sert à autre chose
  localStorage.setItem(KEY, hex(sk));
  return sk;
}
