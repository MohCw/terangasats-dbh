export async function verifyPreimage(preimageHex: string, paymentHashHex: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(preimageHex) || !/^[0-9a-f]{64}$/i.test(paymentHashHex)) return false;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(preimageHex.slice(i * 2, i * 2 + 2), 16);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === paymentHashHex.toLowerCase();
}
