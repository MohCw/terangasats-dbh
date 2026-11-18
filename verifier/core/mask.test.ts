import { describe, expect, it } from "vitest";
import { maskPII } from "./mask";

describe("maskPII", () => {
  it("masks Senegalese phone numbers in every common format", () => {
    expect(maskPII("Vous avez reçu 10 000 F du 77 123 45 67")).toBe("Vous avez reçu 10 000 F du [NUMERO]");
    expect(maskPII("+221771234567")).toBe("[NUMERO]");
    expect(maskPII("00221 78 123 45 67")).toBe("[NUMERO]");
  });

  it("masks the amount that follows the word solde", () => {
    expect(maskPII("Nouveau solde: 45 000 FCFA")).toBe("Nouveau solde: [SOLDE]");
    expect(maskPII("Solde 1.250.000F")).toBe("Solde [SOLDE]");
  });

  it("masks person names after a preposition but keeps operator names", () => {
    expect(maskPII("Transfert de Moussa Diop reçu")).toBe("Transfert de [NOM] reçu");
    expect(maskPII("reçu de Orange Money")).toBe("reçu de Orange Money");
  });

  it("masks a number written with the 221 country code and no + or 00", () => {
    expect(maskPII("reçu 5000 FCFA du 221771234567")).toBe("reçu 5000 FCFA du [NUMERO]");
  });

  it("masks balances introduced by a few words after solde", () => {
    expect(maskPII("Votre solde est de 25 000 FCFA")).toBe("Votre solde est de [SOLDE]");
    expect(maskPII("Solde disponible: 30 000 FCFA")).toBe("Solde disponible: [SOLDE]");
  });

  it("masks names after vers, du, pour and chez, including upper-case names", () => {
    expect(maskPII("Transfert vers MOUSSA DIOP effectué")).toBe("Transfert vers [NOM] effectué");
    expect(maskPII("Paiement pour Awa Ndiaye")).toBe("Paiement pour [NOM]");
    expect(maskPII("Transfert vers Orange Money")).toBe("Transfert vers Orange Money");
  });

  it("masks a name after a capitalised preposition, with a one-letter middle initial (real Orange Money receipt)", () => {
    expect(maskPII("Vous avez recu 2.000F\nDe AWA K NDIAYE (771234567)\n11/11/2026"))
      .toBe("Vous avez recu 2.000F\nDe [NOM] ([NUMERO])\n11/11/2026");
  });

  it("masks real Orange Money receipts: name after the number, and 71/72/79 prefixes", () => {
    expect(maskPII("Vous avez recu un transfert de 30000.00FCFA de 761234567 DIOP. Ref:PP261114.0928.B35052 .Votre solde180230.00 FCFA.Merci.OFMS"))
      .toBe("Vous avez recu un transfert de 30000.00FCFA de [NUMERO] [NOM]. Ref:PP261114.0928.B35052 .Votre solde[SOLDE].Merci.OFMS");
    expect(maskPII("Votre transfert de 30000.00Fcfa vers 711234567 AWA DIOP a reussi."))
      .toBe("Votre transfert de 30000.00Fcfa vers [NUMERO] [NOM] a reussi.");
    expect(maskPII("du 721234567 et du 791234567")).toBe("du [NUMERO] et du [NUMERO]");
  });

  it("does not mistake an amount for a phone number", () => {
    expect(maskPII("Paiement de 770 000 F")).toBe("Paiement de 770 000 F");
  });
});
