import type { Lang, Verdict } from "../core/types";

type Text = Record<Lang, string>;

// ponytail: Wolof is a machine draft, not yet checked by a native speaker; have it reviewed before any real use.
// An empty string falls back to French.
export const UI: Record<string, Text> = {
  title: { fr: "Vérifiez le SMS avant de remettre la marchandise", wo: "Seetal SMS bi balaa ngay jox marsandiis bi" },
  lead: { fr: "Collez le SMS de paiement reçu. Nous cherchons les signes d’une fausse confirmation.", wo: "Duggalal SMS pey bi nga jot. Danuy seet ndax am na lu wone ne fen la." },
  smsLabel: { fr: "SMS reçu", wo: "SMS bi nga jot" },
  smsPlaceholder: { fr: "Collez le texte complet du SMS", wo: "Duggalal SMS bi yépp" },
  senderLabel: { fr: "Expéditeur affiché (facultatif)", wo: "Ki ko yónne (bu la neexee)" },
  submit: { fr: "Vérifier", wo: "Seetal" },
  empty: { fr: "Collez le SMS reçu", wo: "Duggalal SMS bi nga jot" },
  listen: { fr: "Écouter en wolof", wo: "Déglu ko ci wolof" },
  checking: { fr: "Vérification…", wo: "Ñu ngi koy seet…" },
  previewEmpty: { fr: "Le SMS collé apparaîtra ici", wo: "SMS bi nga duggal dina feeñ fii" },
  previewUnknown: { fr: "Expéditeur non renseigné", wo: "Xamuñu ki ko yónne" },
};

export const VERDICT: Record<Verdict, { title: Text; advice: Text }> = {
  arnaque: {
    title: { fr: "Signes d’arnaque", wo: "Mel na ni naxe la" },
    advice: { fr: "Ne remettez pas la marchandise. Les indices trouvés sont listés.", wo: "Bul jox marsandiis bi. Li nu gis, nu bind ko ci suuf." },
  },
  a_verifier: {
    title: { fr: "À vérifier", wo: "War nañu ko seet" },
    advice: { fr: "Quelque chose ne correspond pas. Appelez le vendeur avant de remettre quoi que ce soit.", wo: "Am na lu dëppóowul. Wooteel jaaykat bi balaa ngay jox dara." },
  },
  aucun_signe: {
    title: { fr: "Aucun signe détecté", wo: "Gisuñu dara" },
    advice: { fr: "Faites quand même confirmer par le vendeur. Seul son solde fait foi.", wo: "Waaye laajal jaaykat bi mu dëggal ko. Xaalis bi ci kontam rekk mooy wone dëgg gi." },
  },
};

export const t = (text: Text, lang: Lang) => text[lang] || text.fr;