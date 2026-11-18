import { describe, expect, it } from "vitest";
import { checkRules } from "./rules";
import { reasonText } from "./reasons";

describe("checkRules", () => {
  it("flags a payment SMS sent from an ordinary phone number", () => {
    expect(checkRules({ text: "Vous avez reçu 25 000F. Ref 8823", sender: "771234567" }, "fr")?.verdict).toBe("arnaque");
    expect(checkRules({ text: "Transfert reçu", sender: "[NUMERO]" }, "fr")?.verdict).toBe("arnaque");
    expect(checkRules({ text: "Transfert reçu", sender: "221771234567" }, "fr")?.verdict).toBe("arnaque");
  });

  it("gives the sender reason and marks the result as coming from the rules", () => {
    const r = checkRules({ text: "Transfert reçu", sender: "771234567" }, "fr");
    expect(r?.reasons[0]).toBe(reasonText("sender_is_number", "fr"));
    expect(r?.source).toBe("regles");
  });

  it("flags the cancel-code / sent-by-mistake scam whatever the sender", () => {
    expect(checkRules({ text: "Je me suis trompé, composez le code d'annulation #144*2*5521# svp" }, "fr")?.verdict).toBe("arnaque");
    expect(checkRules({ text: "Envoyé par erreur, merci de me rembourser 30000F" }, "fr")?.verdict).toBe("arnaque");
  });

  it("does not decide on a legit operator SMS that quotes a number in its body", () => {
    expect(checkRules({ text: "Vous avez reçu 5 000F de [NOM] ([NUMERO]). Nouveau solde: [SOLDE]", sender: "OrangeMoney" }, "fr")).toBeNull();
  });

  it("does not decide on Wolof or non-payment text", () => {
    expect(checkRules({ text: "Maa ngi la yónnee xaalis bi" }, "wo")).toBeNull();
    expect(checkRules({ text: "Salut ça va ?", sender: "771234567" }, "fr")).toBeNull();
  });

  it("is stable across repeated calls (no shared regex state)", () => {
    const req = { text: "Transfert reçu", sender: "771234567" };
    expect([1, 2, 3].map(() => checkRules(req, "fr")?.verdict)).toEqual(["arnaque", "arnaque", "arnaque"]);
  });
});

describe("reasonText", () => {
  it("falls back to French when the Wolof text is missing", () => {
    expect(reasonText("cancel_code", "wo")).toBe(reasonText("cancel_code", "fr"));
  });
});
