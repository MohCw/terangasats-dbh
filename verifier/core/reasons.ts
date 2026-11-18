import type { Lang } from "./types";

export type ReasonKey = "sender_is_number" | "cancel_code" | "ai_scam" | "ai_unsure" | "check_failed" | "too_many";

const TEXT: Record<ReasonKey, Record<Lang, string>> = {
  sender_is_number: {
    fr: "Le message vient d’un numéro ordinaire, pas d’Orange Money, de Wave ou de Free Money.",
    wo: "",
  },
  cancel_code: {
    fr: "On vous demande de rembourser ou de composer un code : c’est un code de retrait sur votre compte.",
    wo: "",
  },
  ai_scam: {
    fr: "Le message ressemble aux arnaques connues : demande de renvoi, de frais ou de code, ou pression pour livrer.",
    wo: "",
  },
  ai_unsure: {
    fr: "Le message ne ressemble pas à un reçu habituel d’opérateur.",
    wo: "",
  },
  check_failed: { fr: "Vérification impossible, appelez le vendeur.", wo: "" },
  too_many: { fr: "Trop de demandes, réessayez dans une minute.", wo: "" },
};

// Wolof strings are filled in by a native speaker; an empty one falls back to French.
export function reasonText(key: ReasonKey, lang: Lang): string {
  return TEXT[key][lang] || TEXT[key].fr;
}
