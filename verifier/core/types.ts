export type Verdict = "arnaque" | "a_verifier" | "aucun_signe";
export type Lang = "fr" | "wo";
export interface CheckResult { verdict: Verdict; reasons: string[]; source: "regles" | "ia" | "erreur" }
export interface VerifyRequest { text: string; sender?: string; lang: Lang }
