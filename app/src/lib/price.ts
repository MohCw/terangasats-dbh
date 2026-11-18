export async function fetchBtcEur(fetchFn: typeof fetch = fetch): Promise<number> {
  const r = await fetchFn("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
  if (!r.ok) throw new Error("Prix indisponible");
  const j = await r.json();
  const p = j?.bitcoin?.eur;
  if (typeof p !== "number" || !(p > 0)) throw new Error("Prix invalide");
  return p;
}
