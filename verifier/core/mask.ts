// Any 9-digit Senegalese number starting with 7 (mobile) or 3 (fixed), with optional 221 / +221 / 00221 prefix.
// Wider than the published plan on purpose: real receipts already show 71 numbers that public lists omit.
export const PHONE_RE = /(?<!\d)(?:(?:\+|00)?221[\s.-]?)?[37](?:[\s.-]?\d){8}(?!\d)/g;

// "solde", up to three words ("est de", "disponible"), then the amount.
const BALANCE_RE = /(solde(?:\s+\p{L}+){0,3}\s*:?\s*)\d(?:[\d.,]|\s(?=\d))*(?:\s?(?:FCFA|F\b))?/giu;
// ponytail: names are only caught after a preposition; a bare leading name ("Moussa Diop vous a envoyé") still leaks.
// Orange Money writes the name in capitals right after the number: "de 76… DIOP".
const NAME_AFTER_NUMBER_RE = /\[NUMERO\]\s+[A-ZÀ-Ý][A-ZÀ-Ý'-]+(?:\s+[A-ZÀ-Ý][A-ZÀ-Ý'-]*){0,2}(?![\p{Ll}])/gu;
const NAME_RE = /(?<=^|\s)([Dd]e|[Dd]u|[àÀ]|[Pp]ar|[Vv]ers|[Pp]our|[Cc]hez|[Ff]rom)\s+([A-ZÀ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]*){0,2})/gu;

// ponytail: operator names spotted so far; extend from real SMS samples.
const KEEP_WORDS = ["Orange", "Money", "Wave", "Free", "Sonatel", "Wari"];

export function maskPII(text: string): string {
  return text
    .replace(PHONE_RE, "[NUMERO]")
    .replace(BALANCE_RE, "$1[SOLDE]")
    .replace(NAME_AFTER_NUMBER_RE, (whole) =>
      whole.split(/\s+/).slice(1).some((w) => KEEP_WORDS.some((k) => k.toUpperCase() === w)) ? whole : "[NUMERO] [NOM]")
    .replace(NAME_RE, (whole, prep: string, name: string) =>
      name.split(/\s+/).some((w) => KEEP_WORDS.includes(w)) ? whole : `${prep} [NOM]`);
}
