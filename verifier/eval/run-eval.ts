// Measures the verifier on dataset/messages.jsonl, with the rules alone and with rules + AI.
// Run: CF_ACCOUNT_ID=… CF_API_TOKEN=… [CF_MODEL=…] npm run eval
// → writes eval/RESULTS.md
import { readFileSync, writeFileSync } from "node:fs";
import { maskPII } from "../core/mask";
import { checkRules } from "../core/rules";
import type { CheckResult, Verdict } from "../core/types";
import { classifyWithWorkersAi, DEFAULT_MODEL } from "../server/workersai";
import { computeMetrics } from "./metrics";

type Row = { id: string; text: string; sender: string; label: "arnaque" | "legitime"; type: string; origin: string };

const { CF_ACCOUNT_ID: accountId = "", CF_API_TOKEN: token = "", CF_MODEL: model = DEFAULT_MODEL } = process.env;
const ai = { name: `Workers AI ${model}`, classify: (m: string, l: "fr") => classifyWithWorkersAi(m, l, { accountId, token, model, timeoutMs: 30_000 }) };
const rows: Row[] = readFileSync(new URL("../dataset/messages.jsonl", import.meta.url), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

const lines: { row: Row; rulesOnly: Verdict; full: CheckResult }[] = [];
for (const row of rows) {
  const text = maskPII(row.text);
  const rules = checkRules({ text, sender: row.sender ? maskPII(row.sender) : undefined }, "fr");
  const full = rules ?? (await ai.classify(text, "fr"));
  lines.push({ row, rulesOnly: rules?.verdict ?? "a_verifier", full });
  process.stdout.write(".");
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const scored = (pick: (l: (typeof lines)[number]) => Verdict) =>
  computeMetrics(lines.map((l) => ({ label: l.row.label, verdict: pick(l) })));
const strict = (pick: (l: (typeof lines)[number]) => Verdict) =>
  lines.filter((l) => l.row.label === "arnaque" && pick(l) === "arnaque").length;
const scams = lines.filter((l) => l.row.label === "arnaque").length;
const legitOk = (pick: (l: (typeof lines)[number]) => Verdict) =>
  lines.filter((l) => l.row.label === "legitime" && pick(l) === "aucun_signe").length;
const legit = lines.length - scams;

const a = scored((l) => l.rulesOnly);
const b = scored((l) => l.full.verdict);
const errors = lines.filter((l) => l.full.source === "erreur").length;

const md = `# Mesure du vérificateur

Jeu : ${lines.length} messages (${scams} arnaques, ${legit} légitimes), dont ${lines.filter((l) => l.row.origin === "reel_masque").length} SMS réels masqués, les autres **reconstitués** (voir \`dataset/build.py\`). IA : ${ai.name}. Erreurs d'appel : ${errors}.

| | Arnaques détectées (≠ aucun signe) | Arnaques classées « arnaque » | Fausses alertes (légitime → arnaque) | Légitimes « aucun signe » |
|---|---|---|---|---|
| Règles seules | ${pct(a.detectionRate)} | ${strict((l) => l.rulesOnly)}/${scams} | ${pct(a.falseAlertRate)} | ${legitOk((l) => l.rulesOnly)}/${legit} |
| Règles + IA | ${pct(b.detectionRate)} | ${strict((l) => l.full.verdict)}/${scams} | ${pct(b.falseAlertRate)} | ${legitOk((l) => l.full.verdict)}/${legit} |

Avec les règles seules, tout message non tranché vaut « à vérifier » : la détection est donc à 100 % par construction, et la colonne utile est « Arnaques classées arnaque ». L'IA ne peut que lever l'alerte (jamais « aucun signe », voir \`core/decide.ts\`) : la détection reste donc à 100 %, et l'apport de l'IA se lit dans « Arnaques classées arnaque ».

| id | type | expéditeur | règles seules | règles + IA | source |
|---|---|---|---|---|---|
${lines.map((l) => `| ${l.row.id} | ${l.row.type} | ${l.row.sender || "—"} | ${l.rulesOnly} | ${l.full.verdict} | ${l.full.source} |`).join("\n")}
`;
writeFileSync(new URL("./RESULTS.md", import.meta.url), md);
console.log(`\nrules only: ${JSON.stringify(a)} | rules+ai: ${JSON.stringify(b)} | errors ${errors}`);
