export const XOF_PER_EUR = 655.957;
// ponytail: plafond = réglage, à ajuster selon le risque accepté
export const MAX_FCFA = 5_000_000;

export function parseFcfa(input: string): number {
  const s = input.replace(/\s|\u00a0|\u202f/g, "").replace(/FCFA$/i, "").replace(/F$/i, "").replace(/\./g, "");
  if (!/^\d+$/.test(s)) throw new RangeError("Montant invalide");
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > MAX_FCFA) throw new RangeError("Montant invalide");
  return n;
}

export function fcfaToSats(fcfa: number, btcEur: number): number {
  return Math.round((fcfa / XOF_PER_EUR / btcEur) * 1e8);
}

export function formatFcfa(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F";
}
